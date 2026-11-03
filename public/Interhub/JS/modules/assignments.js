// ============================================
// modules/assignments.js
// Phân công người đánh giá và Tổ Công tác sinh viên.
// ============================================

import { showMessage } from "../components/messages.js";
import { DemoStore, STATUS_LABEL } from "../db.js";
import { HR_DEPT, assignSelected, state } from "../state.js";
import { actorInfo, escapeHtml, isHR } from "../utils.js";

// Phòng Nhân sự: giao Tổ Công tác sinh viên theo Trường (mỗi Trường một người phụ trách)
export function renderCommitteeSchools() {
  const card = document.getElementById("committeeSchoolCard");
  if (!card) return;
  const period = DemoStore.activePeriod();
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

  if (!period) {
    box.innerHTML = `<tr class="empty-state"><td colspan="7">Chưa có kỳ đánh giá đang mở.</td></tr>`;
    return;
  }

  const all = DemoStore.listTickets(actor, period.id).filter(t => t.department === dept);
  const mentors = DemoStore.mentorsOf(dept);
  // Phòng Nhân sự chỉ tự đánh giá SVTT của chính Phòng Nhân sự
  const selfAllowed = !isHR() || dept === HR_DEPT;
  const selfLabel = isHR() ? "Phòng Nhân sự tự đánh giá" : "Trưởng bộ phận tự đánh giá";
  const pendingEval = all.filter(t => !t.evaluatorAssigned).length;
  const pendingCommittee = all.filter(t => !t.committeeUid).length;
  document.getElementById("assignSummary").textContent =
    `Bộ phận ${dept || "—"}: ${all.length} phiếu · ${mentors.length} người hướng dẫn · ${pendingEval} phiếu chưa giao người đánh giá` +
    (isHR() ? ` · ${pendingCommittee} phiếu chưa có Tổ CTSV` : "") + ".";

  // Ô gán hàng loạt: người hướng dẫn (mọi vai trò) và Tổ CTSV (Phòng Nhân sự)
  const bulkMentor = document.getElementById("assignBulkMentor");
  const bulkValue = bulkMentor.value;
  bulkMentor.innerHTML = [
    `<option value="">— Chọn người đánh giá —</option>`,
    selfAllowed ? `<option value="__self__">${selfLabel}</option>` : "",
    ...mentors.map(m => `<option value="${escapeHtml(m.uid)}">${escapeHtml(m.fullName)}</option>`)
  ].join("");
  if ([...bulkMentor.options].some(o => o.value === bulkValue)) bulkMentor.value = bulkValue;

  // Lọc theo ô tìm kiếm và trạng thái giao
  const q = (document.getElementById("assignSearch").value || "").trim().toLowerCase();
  const statusFilter = document.getElementById("assignStatusFilter").value;
  const list = all.filter(t => {
    if (statusFilter === "unassigned" && t.evaluatorAssigned) return false;
    if (statusFilter === "assigned" && !t.evaluatorAssigned) return false;
    if (q && !`${t.internName} ${t.internId}`.toLowerCase().includes(q)) return false;
    return true;
  });

  // Bỏ chọn những phiếu không còn trong bộ phận đang xem
  for (const id of [...assignSelected]) {
    if (!all.some(t => t.id === id)) assignSelected.delete(id);
  }
  const shown = list.slice(0, state.assignLimit || 5);
  updateAssignBulkBar(shown);

  if (!DemoStore.departmentKnown(dept)) {
    box.innerHTML = `<tr class="empty-state"><td colspan="7">Bộ phận của bạn (${escapeHtml(dept || "chưa có")}) chưa có trong danh mục. Liên hệ Admin.</td></tr>`;
    return;
  }
  if (!all.length) {
    box.innerHTML = `<tr class="empty-state"><td colspan="7">Chưa có phiếu nào thuộc bộ phận ${escapeHtml(dept)}.</td></tr>`;
    return;
  }
  if (!list.length) {
    box.innerHTML = `<tr class="empty-state"><td colspan="7">Không có phiếu nào khớp bộ lọc.</td></tr>`;
    return;
  }

  const notices = [];
  if (!mentors.length) {
    notices.push(`Bộ phận chưa có người hướng dẫn nào. Admin cần duyệt tài khoản người hướng dẫn, chọn đúng bộ phận ở tab "Tài khoản", rồi bấm "Làm mới".`);
  }
  const mentorNotice = notices.map(text => `<tr><td colspan="7" class="empty-state">${escapeHtml(text)}</td></tr>`).join("");

  box.innerHTML = mentorNotice + shown.map(t => {
    const p = DemoStore.permissionsFor(t, actor);
    const disabled = p.assign ? "" : "disabled";
    const options = [
      `<option value="" ${!t.evaluatorAssigned ? "selected" : ""}>— Chọn người đánh giá —</option>`,
      selfAllowed ? `<option value="__self__" ${t.evaluatorAssigned && !t.evaluatorUid ? "selected" : ""}>${selfLabel}</option>` : "",
      ...mentors.map(m => `<option value="${escapeHtml(m.uid)}" ${t.evaluatorUid === m.uid ? "selected" : ""}>${escapeHtml(m.fullName)}</option>`)
    ].join("");
    const committeeCell = escapeHtml(t.committeeName || "—");
    const checked = assignSelected.has(t.id) ? "checked" : "";
    return `
      <tr>
        <td data-label="Chọn"><input type="checkbox" data-select-ticket="${escapeHtml(t.id)}" ${checked} ${disabled}></td>
        <td data-label="Sinh viên">${escapeHtml(t.internName)}<br><small>${escapeHtml(t.internId)}</small></td>
        <td data-label="Trạng thái">${escapeHtml(STATUS_LABEL[t.status] || t.status)}</td>
        <td data-label="Người đánh giá hiện tại">${t.evaluatorAssigned ? escapeHtml(t.evaluatorName || "—") : "<em>Đang đợi giao</em>"}</td>
        <td data-label="Giao cho"><select data-assign-for="${escapeHtml(t.id)}" ${disabled}>${options}</select></td>
        <td data-label="Tổ CTSV">${committeeCell}</td>
        <td data-label="Thao tác"><button type="button" class="btn btn-secondary btn-sm" data-action="assign"
              data-ticket-id="${escapeHtml(t.id)}" ${disabled}>Lưu</button></td>
      </tr>`;
  }).join("");
  renderAssignMore(list.length, shown.length);
}

function renderAssignMore(total, shown) {
  const box = document.getElementById("assignMore");
  if (!box) return;
  const left = total - shown;
  box.innerHTML = left > 0
    ? `<button type="button" class="btn btn-secondary btn-sm" data-action="assign-more">Xem thêm ${Math.min(left, 5)} (còn ${left})</button>`
    : (total > 5 ? `<button type="button" class="btn btn-secondary btn-sm" data-action="assign-less">Thu gọn</button>` : "");
}

// Cập nhật thanh gán hàng loạt theo danh sách đang hiển thị
export function updateAssignBulkBar(visibleList) {
  const editable = visibleList.filter(t => DemoStore.permissionsFor(t, actorInfo()).assign);
  const selectedCount = [...assignSelected].length;
  document.getElementById("assignSelectedCount").textContent = `Đã chọn ${selectedCount} phiếu`;
  const selectAll = document.getElementById("assignSelectAll");
  selectAll.checked = editable.length > 0 && editable.every(t => assignSelected.has(t.id));
  selectAll.disabled = editable.length === 0;
  document.getElementById("assignBulkApply").disabled = selectedCount === 0;
}

export function handleAssignChange(event) {
  const target = event.target;

  if (target.id === "assignStatusFilter") {
    state.assignLimit = 5;
    renderAssignments();
    return;
  }

  if (target.id === "assignDeptFilter") {
    state.assignDept = target.value;
    state.assignLimit = 5;
    assignSelected.clear();
    renderAssignments();
    return;
  }

  if (target.id === "assignSelectAll") {
    const rows = document.querySelectorAll("[data-select-ticket]:not([disabled])");
    rows.forEach(row => {
      if (target.checked) assignSelected.add(row.dataset.selectTicket);
      else assignSelected.delete(row.dataset.selectTicket);
    });
    renderAssignments();
    return;
  }

  if (target.dataset.selectTicket) {
    if (target.checked) assignSelected.add(target.dataset.selectTicket);
    else assignSelected.delete(target.dataset.selectTicket);
    renderAssignments();
  }
}

export function handleAssignClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const actor = actorInfo();

  if (action === "assign-more") {
    state.assignLimit = (state.assignLimit || 5) + 5;
    renderAssignments();
    return;
  }

  if (action === "assign-less") {
    state.assignLimit = 5;
    renderAssignments();
    return;
  }

  if (action === "assign-clear") {
    assignSelected.clear();
    renderAssignments();
    return;
  }

  if (action === "assign-bulk") {
    const result = DemoStore.assignEvaluatorBulk([...assignSelected], actor, document.getElementById("assignBulkMentor").value);
    if (result.ok) {
      assignSelected.clear();
      const note = result.skipped ? ` (bỏ qua ${result.skipped} phiếu không đủ điều kiện)` : "";
      showMessage("success", `Đã gán ${result.updated} phiếu${note}. (dữ liệu mô phỏng)`);
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
    return;
  }

  if (action !== "assign") return;

  // Lưu một dòng: đổi người đánh giá và/hoặc Tổ CTSV (chỉ gửi phần đã thay đổi)
  const id = button.dataset.ticketId;
  const ticket = DemoStore.getTicket(id);
  if (!ticket) return;
  const evalSelect = document.querySelector(`[data-assign-for="${CSS.escape(id)}"]`);
  const saved = [];
  let failure = "";

  const evalValue = evalSelect?.value || "";
  const currentEval = ticket.evaluatorAssigned ? (ticket.evaluatorUid || "__self__") : "";
  if (!evalSelect?.disabled && evalValue && evalValue !== currentEval) {
    const r = DemoStore.assignEvaluator(id, actor, evalValue);
    if (r.ok) saved.push("người đánh giá"); else failure = r.error;
  }
  if (failure) showMessage("error", failure);
  else if (saved.length) showMessage("success", `Đã lưu phân công ${saved.join(" và ")} (dữ liệu mô phỏng)`);
  else showMessage("success", "Chưa có thay đổi để lưu.");
  renderAssignments();
}
