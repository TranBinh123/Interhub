// ============================================
// modules/assignments.js
// Phân công người đánh giá theo SVTT và Tổ Công tác sinh viên theo Trường.
// Người đánh giá giao ở cấp SVTT; các phiếu của SVTT nhận theo, nên không giao lại ở cấp phiếu.
// ============================================

import { showMessage } from "../components/messages.js";
import { DemoStore, STATUS_LABEL } from "../db.js";
import { HR_DEPT, state } from "../state.js";
import { actorInfo, escapeHtml, isHR, viewDate } from "../utils.js";

// SVTT được chọn để giao người đánh giá
const internSelected = new Set();

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
  const notice = members.length ? "" :
    `<tr class="empty-state"><td colspan="6">Chưa có tài khoản Tổ Công tác sinh viên. Admin cần duyệt tài khoản với vai trò "Tổ Công tác sinh viên".</td></tr>`;
  document.getElementById("committeeSchoolTable").innerHTML = notice + (rows.length ? rows.map(g => `
    <tr>
      <td data-label="Trường">${escapeHtml(g.school || "Chưa có trường")}</td>
      <td class="r" data-label="SVTT">${g.total}</td>
      <td class="r" data-label="Chờ Tổ CTSV">${g.toCommittee}</td>
      <td class="r" data-label="Đã có điểm Tổ CTSV">${g.scored}</td>
      <td data-label="Tổ CTSV phụ trách">
        <select data-school-committee aria-label="Tổ CTSV phụ trách ${escapeHtml(g.school || "chưa có trường")}">
          <option value="">— Chưa phân công —</option>
          ${members.map(m => `<option value="${escapeHtml(m.uid)}" ${g.committeeUid === m.uid ? "selected" : ""}>${escapeHtml(m.fullName)}</option>`).join("")}
        </select>
      </td>
      <td data-label="Thao tác"><button type="button" class="btn btn-secondary btn-sm" data-action="save-school-committee"
            data-school="${escapeHtml(g.school)}">Lưu</button></td>
    </tr>`).join("") : `<tr class="empty-state"><td colspan="6">Chưa có SVTT nào trong kỳ này.</td></tr>`);
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
  renderUnassigned(dept);

  if (!period) {
    box.innerHTML = `<tr class="empty-state"><td colspan="4">Chưa có kỳ đánh giá đang mở.</td></tr>`;
    return;
  }

  const all = DemoStore.listTickets(actor, period.id).filter(t => t.department === dept);
  const mentors = DemoStore.mentorsOf(dept);
  const pendingCommittee = all.filter(t => !t.committeeUid).length;
  document.getElementById("assignSummary").textContent =
    `Bộ phận ${dept || "—"}: ${all.length} phiếu · ${mentors.length} người hướng dẫn` +
    (isHR() ? ` · ${pendingCommittee} phiếu chưa có Tổ CTSV` : "") + ".";

  // Lọc theo ô tìm kiếm
  const q = (document.getElementById("assignSearch").value || "").trim().toLowerCase();
  const list = all.filter(t => {
    if (q && !`${t.internName} ${t.internId}`.toLowerCase().includes(q)) return false;
    return true;
  });
  const shown = list.slice(0, state.assignLimit || 6);

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
  renderAssignMore(list.length, shown.length);
}

// Thẻ SVTT chưa có người đánh giá: người phụ trách giao ngay khi SVTT được upload
function renderUnassigned(dept) {
  const box = document.getElementById("assignUnassigned");
  if (!box) return;
  if (!dept || !DemoStore.departmentKnown(dept)) { box.innerHTML = ""; return; }

  const interns = DemoStore.unassignedInterns(dept);
  const ids = new Set(interns.map(i => i.internId));
  for (const id of [...internSelected]) if (!ids.has(id)) internSelected.delete(id);

  if (!interns.length) {
    box.innerHTML = `<p class="assign-summary">Tất cả SVTT của bộ phận ${escapeHtml(dept)} đã có người đánh giá.</p>`;
    return;
  }

  const mentors = DemoStore.mentorsOf(dept);
  const selfAllowed = !isHR() || dept === HR_DEPT;
  const selfLabel = isHR() ? "Phòng Nhân sự tự đánh giá" : "Trưởng bộ phận tự đánh giá";
  const canAssign = isHR() || actorInfo().role === "supervisor";
  const bulkValue = document.getElementById("internBulkMentor")?.value || "";
  const options = [
    `<option value="">— Chọn người đánh giá —</option>`,
    selfAllowed ? `<option value="__self__">${selfLabel}</option>` : "",
    ...mentors.map(m => `<option value="${escapeHtml(m.uid)}">${escapeHtml(m.fullName)}</option>`)
  ].join("");
  const allChecked = interns.every(i => internSelected.has(i.internId));

  box.innerHTML = `
    <div class="assign-unassigned">
      <h3>SVTT chưa có người đánh giá (${interns.length})</h3>
      <div class="assign-bulk">
        <label style="display:flex;align-items:center;gap:6px;">
          <input type="checkbox" id="internSelectAll" ${allChecked ? "checked" : ""} ${canAssign ? "" : "disabled"}> Chọn tất cả
        </label>
        <span class="count-badge">Đã chọn ${internSelected.size} SVTT</span>
        <select id="internBulkMentor" ${canAssign ? "" : "disabled"}>${options}</select>
        <button type="button" class="btn btn-primary btn-sm" data-action="intern-assign"
          ${canAssign ? "" : "disabled"}>Giao cho SVTT đã chọn</button>
      </div>
      <div class="table-wrap">
        <table class="assign-table table-cards">
          <thead>
            <tr><th style="width:44px;"></th><th>Sinh viên</th><th>Trường</th><th>Thời gian thực tập</th></tr>
          </thead>
          <tbody>
            ${interns.map(i => `
              <tr>
                <td data-label="Chọn"><input type="checkbox" data-intern-select="${escapeHtml(i.internId)}"
                  ${internSelected.has(i.internId) ? "checked" : ""} ${canAssign ? "" : "disabled"}></td>
                <td data-label="Sinh viên">${escapeHtml(i.fullName)}<br><small>${escapeHtml(i.internId)}</small></td>
                <td data-label="Trường">${escapeHtml(i.school || "—")}</td>
                <td data-label="Thời gian thực tập">${escapeHtml(viewDate(i.startDate) || "—")} → ${escapeHtml(viewDate(i.endDate) || "—")}</td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>`;
  const select = document.getElementById("internBulkMentor");
  if ([...select.options].some(o => o.value === bulkValue)) select.value = bulkValue;
}

function renderAssignMore(total, shown) {
  const box = document.getElementById("assignMore");
  if (!box) return;
  const left = total - shown;
  box.innerHTML = left > 0
    ? `<button type="button" class="btn btn-secondary btn-sm" data-action="assign-more">Xem thêm ${Math.min(left, 6)} (còn ${left})</button>`
    : (total > 6 ? `<button type="button" class="btn btn-secondary btn-sm" data-action="assign-less">Thu gọn</button>` : "");
}

export function handleAssignChange(event) {
  const target = event.target;

  if (target.id === "assignDeptFilter") {
    state.assignDept = target.value;
    state.assignLimit = 6;
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

  if (target.dataset.internSelect) {
    if (target.checked) internSelected.add(target.dataset.internSelect);
    else internSelected.delete(target.dataset.internSelect);
    renderAssignments();
  }
}

export function handleAssignClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const actor = actorInfo();

  if (action === "assign-more") {
    state.assignLimit = (state.assignLimit || 6) + 6;
    renderAssignments();
    return;
  }

  if (action === "assign-less") {
    state.assignLimit = 6;
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

  if (action === "save-school-committee") {
    const value = button.closest("tr").querySelector("[data-school-committee]").value;
    if (!value) return showMessage("error", "Hãy chọn Tổ Công tác sinh viên phụ trách Trường này.");
    const result = DemoStore.assignCommitteeToSchool(button.dataset.school, actor, value);
    if (result.ok) showMessage("success", `Đã giao ${result.updated} phiếu chưa chốt cho Tổ CTSV (dữ liệu mô phỏng)`);
    else showMessage("error", result.error);
    renderAssignments();
  }
}
