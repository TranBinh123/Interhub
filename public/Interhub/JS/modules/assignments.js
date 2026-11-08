// ============================================
// modules/assignments.js
// Phân công người đánh giá theo SVTT và Tổ Công tác sinh viên theo Trường.
// Người đánh giá giao ở cấp SVTT; các phiếu của SVTT nhận theo, nên không giao lại ở cấp phiếu.
// Danh sách SVTT hiện ngay cả khi kỳ chưa mở; phiếu chỉ hiện khi có kỳ đang mở.
// ============================================

import { showMessage } from "../components/messages.js";
import { DemoStore, STATUS_LABEL } from "../db.js";
import { HR_DEPT, state } from "../state.js";
import { actorInfo, escapeHtml, isHR, viewDate } from "../utils.js";

const PAGE = 6;
const SELF = "__self__";
const NONE = "__none__";

const internSelected = new Set();   // SVTT được chọn để giao người đánh giá
let internLimit = PAGE;
const committeeSelected = new Set(); // Trường được chọn để giao Tổ CTSV
let committeeLimit = PAGE;
let evaluatorFilter = "";            // "" tất cả | NONE chưa giao | SELF tự đánh giá | uid người hướng dẫn

function matchesEvaluator(item) {
  if (!evaluatorFilter) return true;
  if (evaluatorFilter === NONE) return !item.evaluatorAssigned;
  if (evaluatorFilter === SELF) return !!item.evaluatorAssigned && !item.evaluatorUid;
  return item.evaluatorUid === evaluatorFilter;
}

function searchValue() {
  return (document.getElementById("assignSearch")?.value || "").trim().toLowerCase();
}

function renderMore(box, total, shown, moreAction, lessAction) {
  if (!box) return;
  const left = total - shown;
  box.innerHTML = left > 0
    ? `<button type="button" class="btn btn-secondary btn-sm" data-action="${moreAction}">Xem thêm ${Math.min(left, PAGE)} (còn ${left})</button>`
    : (total > PAGE ? `<button type="button" class="btn btn-secondary btn-sm" data-action="${lessAction}">Thu gọn</button>` : "");
}

// Phòng Nhân sự: giao Tổ Công tác sinh viên theo Trường (chỉ khi kỳ đã mở đầy đủ)
export function renderCommitteeSchools() {
  const card = document.getElementById("committeeSchoolCard");
  if (!card) return;
  const period = DemoStore.fullyOpenPeriod();
  const show = isHR() && !!period;
  card.classList.toggle("hidden", !show);
  if (!show) return;

  const members = DemoStore.listMembers().filter(m => m.role === "committee");
  const rows = DemoStore.listCommitteeSchools(period.id);
  const schools = new Set(rows.map(g => g.school));
  for (const key of [...committeeSelected]) if (!schools.has(key)) committeeSelected.delete(key);

  const bulkMember = document.getElementById("committeeBulkMember");
  const prevMember = bulkMember.value;
  bulkMember.innerHTML = `<option value="">— Chọn Tổ CTSV phụ trách —</option>` +
    members.map(m => `<option value="${escapeHtml(m.uid)}">${escapeHtml(m.fullName)}</option>`).join("");
  if ([...bulkMember.options].some(o => o.value === prevMember)) bulkMember.value = prevMember;

  const shown = rows.slice(0, committeeLimit);
  document.getElementById("committeeSelectedCount").textContent = `Đã chọn ${committeeSelected.size} Trường`;
  const selectAll = document.getElementById("committeeSelectAll");
  selectAll.checked = shown.length > 0 && shown.every(g => committeeSelected.has(g.school));

  const notice = members.length ? "" :
    `<tr class="empty-state"><td colspan="6">Chưa có tài khoản Tổ Công tác sinh viên. Admin cần duyệt tài khoản với vai trò "Tổ Công tác sinh viên".</td></tr>`;
  document.getElementById("committeeSchoolTable").innerHTML = notice + (shown.length ? shown.map(g => `
    <tr>
      <td data-label="Chọn"><input type="checkbox" data-school-select="${escapeHtml(g.school)}"
        ${committeeSelected.has(g.school) ? "checked" : ""} aria-label="Chọn ${escapeHtml(g.school || "chưa có trường")}"></td>
      <td data-label="Trường">${escapeHtml(g.school || "Chưa có trường")}</td>
      <td class="r" data-label="SVTT">${g.total}</td>
      <td class="r" data-label="Chờ Tổ CTSV">${g.toCommittee}</td>
      <td class="r" data-label="Đã có điểm Tổ CTSV">${g.scored}</td>
      <td data-label="Tổ CTSV phụ trách">${escapeHtml(g.committeeName || "— Chưa phân công —")}</td>
    </tr>`).join("") : `<tr class="empty-state"><td colspan="6">Chưa có SVTT nào trong kỳ này.</td></tr>`);
  renderMore(document.getElementById("committeeMore"), rows.length, shown.length, "committee-more", "committee-less");
}

export function renderAssignments() {
  const box = document.getElementById("assignTable");
  if (!box) return;
  renderCommitteeSchools();

  const actor = actorInfo();
  const period = DemoStore.activePeriod();
  const deptFilter = document.getElementById("assignDeptFilter");
  deptFilter.hidden = !isHR();
  if (isHR()) {
    deptFilter.innerHTML = DemoStore.listDepartments().map(d =>
      `<option value="${escapeHtml(d.code)}" ${d.code === state.assignDept ? "selected" : ""}>${escapeHtml(d.code)} — ${escapeHtml(d.name)}</option>`).join("");
  }
  const dept = isHR() ? state.assignDept : actor.department;

  // Bộ lọc người đánh giá dùng chung cho danh sách SVTT và bảng phiếu
  const evalSelect = document.getElementById("assignEvaluatorFilter");
  const mentors = DemoStore.mentorsOf(dept);
  const selfAllowed = !isHR() || dept === HR_DEPT;
  evalSelect.innerHTML = [
    `<option value="">Tất cả người đánh giá</option>`,
    `<option value="${NONE}">Chưa giao</option>`,
    selfAllowed ? `<option value="${SELF}">Tự đánh giá</option>` : "",
    ...mentors.map(m => `<option value="${escapeHtml(m.uid)}">${escapeHtml(m.fullName)}</option>`)
  ].join("");
  if (![...evalSelect.options].some(o => o.value === evaluatorFilter)) evaluatorFilter = "";
  evalSelect.value = evaluatorFilter;

  renderRoster(dept);

  if (!period) {
    box.innerHTML = `<tr class="empty-state"><td colspan="4">Chưa có kỳ đánh giá đang mở. Phiếu sẽ hiện khi kỳ được mở.</td></tr>`;
    return;
  }

  const all = DemoStore.listTickets(actor, period.id).filter(t => t.department === dept);
  const pendingCommittee = all.filter(t => !t.committeeUid).length;
  document.getElementById("assignSummary").textContent =
    `Bộ phận ${dept || "—"}: ${all.length} phiếu · ${mentors.length} người hướng dẫn` +
    (isHR() ? ` · ${pendingCommittee} phiếu chưa có Tổ CTSV` : "") + ".";

  const q = searchValue();
  const list = all.filter(t => matchesEvaluator(t) && (!q || `${t.internName} ${t.internId}`.toLowerCase().includes(q)));
  const shown = list.slice(0, state.assignLimit || PAGE);

  if (!DemoStore.departmentKnown(dept)) {
    box.innerHTML = `<tr class="empty-state"><td colspan="4">Bộ phận của bạn (${escapeHtml(dept || "chưa có")}) chưa có trong danh mục. Liên hệ Admin.</td></tr>`;
    return;
  }
  if (!all.length) {
    box.innerHTML = `<tr class="empty-state"><td colspan="4">Chưa có phiếu nào thuộc bộ phận ${escapeHtml(dept)}.</td></tr>`;
    return;
  }
  if (!list.length) {
    box.innerHTML = `<tr class="empty-state"><td colspan="4">Không có phiếu nào khớp bộ lọc.</td></tr>`;
    return;
  }

  const mentorNotice = !mentors.length
    ? `<tr><td colspan="4" class="empty-state">Bộ phận chưa có người hướng dẫn nào. Admin cần duyệt tài khoản người hướng dẫn, chọn đúng bộ phận ở tab "Tài khoản", rồi bấm "Làm mới".</td></tr>`
    : "";

  box.innerHTML = mentorNotice + shown.map(t => `
      <tr>
        <td data-label="Sinh viên">${escapeHtml(t.internName)}<br><small>${escapeHtml(t.internId)}</small></td>
        <td data-label="Trạng thái">${escapeHtml(STATUS_LABEL[t.status] || t.status)}</td>
        <td data-label="Người đánh giá">${t.evaluatorAssigned
          ? escapeHtml(t.evaluatorName || "—")
          : "<em>Chưa giao: giao ở danh sách SVTT phía trên</em>"}</td>
        <td data-label="Tổ CTSV">${escapeHtml(t.committeeName || "—")}</td>
      </tr>`).join("");
  renderMore(document.getElementById("assignMore"), list.length, shown.length, "assign-more", "assign-less");
}

// Danh sách SVTT của bộ phận: luôn hiện, không phụ thuộc kỳ đang mở. Giao người đánh giá hàng loạt tại đây.
function renderRoster(dept) {
  const box = document.getElementById("assignUnassigned");
  if (!box) return;
  if (!dept || !DemoStore.departmentKnown(dept)) { box.innerHTML = ""; return; }

  const actor = actorInfo();
  const canAssign = isHR() || actor.role === "supervisor";
  const all = DemoStore.rosterFor(actor).filter(i => i.department === dept);
  const ids = new Set(all.map(i => i.internId));
  for (const id of [...internSelected]) if (!ids.has(id)) internSelected.delete(id);

  const q = searchValue();
  const list = all.filter(i => matchesEvaluator(i) && (!q || `${i.fullName} ${i.internId}`.toLowerCase().includes(q)));
  const shown = list.slice(0, internLimit);
  const unassigned = all.filter(i => !i.evaluatorAssigned).length;

  const mentors = DemoStore.mentorsOf(dept);
  const selfAllowed = !isHR() || dept === HR_DEPT;
  const selfLabel = isHR() ? "Phòng Nhân sự tự đánh giá" : "Trưởng bộ phận tự đánh giá";
  const bulkPrev = document.getElementById("internBulkMentor")?.value || "";
  const options = [
    `<option value="">— Chọn người đánh giá —</option>`,
    selfAllowed ? `<option value="${SELF}">${selfLabel}</option>` : "",
    ...mentors.map(m => `<option value="${escapeHtml(m.uid)}">${escapeHtml(m.fullName)}</option>`)
  ].join("");
  const allChecked = shown.length > 0 && shown.every(i => internSelected.has(i.internId));
  const dis = canAssign ? "" : "disabled";

  box.innerHTML = `
    <div class="assign-unassigned">
      <h3>SVTT thuộc bộ phận ${escapeHtml(dept)} (${all.length}) · chưa có người đánh giá: ${unassigned}</h3>
      <div class="assign-bulk">
        <label style="display:flex;align-items:center;gap:6px;">
          <input type="checkbox" id="internSelectAll" ${allChecked ? "checked" : ""} ${dis}> Chọn tất cả đang hiển thị
        </label>
        <span class="count-badge">Đã chọn ${internSelected.size} SVTT</span>
        <select id="internBulkMentor" ${dis}>${options}</select>
        <button type="button" class="btn btn-primary btn-sm" data-action="intern-assign" ${dis}>Giao cho SVTT đã chọn</button>
      </div>
      <div class="table-wrap">
        <table class="assign-table table-cards">
          <thead>
            <tr><th style="width:44px;"></th><th>Sinh viên</th><th>Trường</th><th>Thời gian thực tập</th><th>Người đánh giá</th></tr>
          </thead>
          <tbody>
            ${shown.length ? shown.map(i => `
              <tr>
                <td data-label="Chọn"><input type="checkbox" data-intern-select="${escapeHtml(i.internId)}"
                  ${internSelected.has(i.internId) ? "checked" : ""} ${dis}></td>
                <td data-label="Sinh viên">${escapeHtml(i.fullName)}<br><small>${escapeHtml(i.internId)}</small></td>
                <td data-label="Trường">${escapeHtml(i.school || "—")}</td>
                <td data-label="Thời gian thực tập">${escapeHtml(viewDate(i.startDate) || "—")} → ${escapeHtml(viewDate(i.endDate) || "—")}</td>
                <td data-label="Người đánh giá">${i.evaluatorAssigned ? escapeHtml(i.evaluatorName || "—") : "<em>Chưa giao</em>"}</td>
              </tr>`).join("")
              : `<tr class="empty-state"><td colspan="5">Không có SVTT khớp bộ lọc.</td></tr>`}
          </tbody>
        </table>
      </div>
      <div class="more-row" id="internMore"></div>
    </div>`;
  const select = document.getElementById("internBulkMentor");
  if ([...select.options].some(o => o.value === bulkPrev)) select.value = bulkPrev;
  renderMore(document.getElementById("internMore"), list.length, shown.length, "intern-more", "intern-less");
}

export function handleAssignChange(event) {
  const target = event.target;

  if (target.id === "assignEvaluatorFilter") {
    evaluatorFilter = target.value;
    state.assignLimit = PAGE;
    internLimit = PAGE;
    renderAssignments();
    return;
  }

  if (target.id === "assignDeptFilter") {
    state.assignDept = target.value;
    state.assignLimit = PAGE;
    internLimit = PAGE;
    internSelected.clear();
    renderAssignments();
    return;
  }

  if (target.id === "internSelectAll") {
    document.querySelectorAll("[data-intern-select]:not([disabled])").forEach(row => {
      if (target.checked) internSelected.add(row.dataset.internSelect);
      else internSelected.delete(row.dataset.internSelect);
    });
    renderAssignments();
    return;
  }

  if (target.hasAttribute("data-intern-select")) {
    if (target.checked) internSelected.add(target.dataset.internSelect);
    else internSelected.delete(target.dataset.internSelect);
    renderAssignments();
    return;
  }

  if (target.id === "committeeSelectAll") {
    document.querySelectorAll("[data-school-select]").forEach(row => {
      if (target.checked) committeeSelected.add(row.dataset.schoolSelect);
      else committeeSelected.delete(row.dataset.schoolSelect);
    });
    renderAssignments();
    return;
  }

  if (target.hasAttribute("data-school-select")) {
    if (target.checked) committeeSelected.add(target.dataset.schoolSelect);
    else committeeSelected.delete(target.dataset.schoolSelect);
    renderAssignments();
  }
}

export function handleAssignClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const actor = actorInfo();

  if (action === "assign-more") {
    state.assignLimit = (state.assignLimit || PAGE) + PAGE;
    renderAssignments();
    return;
  }

  if (action === "assign-less") {
    state.assignLimit = PAGE;
    renderAssignments();
    return;
  }

  if (action === "intern-more") {
    internLimit += PAGE;
    renderAssignments();
    return;
  }

  if (action === "intern-less") {
    internLimit = PAGE;
    renderAssignments();
    return;
  }

  if (action === "committee-more") {
    committeeLimit += PAGE;
    renderAssignments();
    return;
  }

  if (action === "committee-less") {
    committeeLimit = PAGE;
    renderAssignments();
    return;
  }

  if (action === "intern-assign") {
    const ids = [...internSelected];
    const mentorUid = document.getElementById("internBulkMentor")?.value || "";
    let result = DemoStore.assignInternEvaluators(ids, actor, mentorUid);
    // Phòng Nhân sự đổi phân công khi đã có phiếu đang chấm: bắt buộc lý do
    if (!result.ok && isHR() && /lý do/.test(result.error)) {
      const reason = window.prompt(`${result.error}\n\nNhập lý do đổi phân công:`);
      if (!reason?.trim()) return showMessage("error", "Chưa nhập lý do, chưa đổi phân công.");
      result = DemoStore.assignInternEvaluators(ids, actor, mentorUid, reason);
    }
    if (result.ok) {
      internSelected.clear();
      const notes = [];
      if (result.skipped) notes.push(`bỏ qua ${result.skipped} SVTT ngoài quyền`);
      if (result.locked) notes.push(`${result.locked} phiếu đã bắt đầu nên giữ nguyên`);
      showMessage("success", `Đã giao ${result.updated} SVTT, cập nhật ${result.tickets} phiếu` +
        (notes.length ? ` (${notes.join("; ")})` : "") + ". (dữ liệu mô phỏng)");
    } else {
      showMessage("error", result.error);
    }
    renderAssignments();
    return;
  }

  if (action === "committee-bulk") {
    const uid = document.getElementById("committeeBulkMember")?.value || "";
    if (!committeeSelected.size) return showMessage("error", "Chưa chọn Trường nào.");
    if (!uid) return showMessage("error", "Hãy chọn Tổ Công tác sinh viên phụ trách.");
    const result = DemoStore.assignCommitteeToSchools([...committeeSelected], actor, uid);
    if (result.ok) {
      committeeSelected.clear();
      showMessage("success", `Đã giao ${result.schools} Trường cho Tổ CTSV, cập nhật ${result.updated} phiếu chưa chốt (dữ liệu mô phỏng)`);
    } else {
      showMessage("error", result.error);
    }
    renderAssignments();
  }
}
