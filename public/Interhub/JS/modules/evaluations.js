// ============================================
// modules/evaluations.js
// Danh sách phiếu đánh giá, bộ lọc, nhóm theo trạng thái, in hàng loạt.
// ============================================

import { DemoStore, STATUS, STATUS_LABEL, formatDateTime } from "../db.js";
import { switchView } from "../layout.js";
import { hrDeptOptions, renderHrDashboard } from "./dashboard.js";
import { HR_DEPT, HR_GROUPS, HR_ORDER, HR_PER_PAGE, hrPrintSel, hrState, state } from "../state.js";
import { actorInfo, byInternId, escapeHtml, isHR } from "../utils.js";

export function hrEnsurePeriod() {
  const periods = DemoStore.listPeriods();
  if (!periods.some(p => p.id === hrState.periodId)) {
    hrState.periodId = (DemoStore.activePeriod() || periods[0] || {}).id || "";
  }
  return periods.find(p => p.id === hrState.periodId) || null;
}

export function hrAllTickets() {
  const period = hrEnsurePeriod();
  return period ? DemoStore.listTickets(actorInfo(), period.id) : [];
}

// Hiển thị người đánh giá đã được giao; nếu chưa giao thì báo rõ để Phòng Nhân sự theo dõi và nhắc.
export function hrEvaluatorLabel(t) {
  if (t.evaluatorUid) return t.evaluatorName || "Chưa rõ tên";
  if (t.evaluatorAssigned) return t.evaluatorName || "Trưởng bộ phận";
  return "Đang đợi giao người đánh giá";
}

export function hrSchoolMap() {
  return new Map(DemoStore.listInterns().map(i => [i.internId, i.school || ""]));
}

export function hrFiltered() {
  const q = hrState.q.trim().toLowerCase();
  const schools = hrSchoolMap();
  return hrAllTickets()
    .filter(t => !hrState.dept || t.department === hrState.dept)
    .filter(t => !hrState.status || t.status === hrState.status)
    .filter(t => !hrState.evaluator || hrEvaluatorLabel(t) === hrState.evaluator)
    .filter(t => !q || `${t.internName} ${t.internId} ${schools.get(t.internId) || ""}`.toLowerCase().includes(q))
    .sort((a, b) => a.internId.localeCompare(b.internId, "vi", { numeric: true }));
}

// Bộ lọc được vẽ một lần mỗi khi đổi kỳ, để ô tìm kiếm không mất con trỏ khi gõ
export function renderHrTicketFilters() {
  const box = document.getElementById("hrTicketFilters");
  if (!box) return;

  const periods = DemoStore.listPeriods();
  hrEnsurePeriod();
  const evaluators = [...new Set(hrAllTickets().map(hrEvaluatorLabel))]
    .sort((a, b) => a.localeCompare(b, "vi"));

  box.innerHTML = `
    <div class="hr-filters">
      <div class="hr-field hr-grow">
        <label for="hrQ">Tìm theo tên, mã SV hoặc trường</label>
        <input id="hrQ" class="hr-input" type="search" value="${escapeHtml(hrState.q)}" placeholder="Ví dụ: SV001 hoặc Linh">
      </div>
      <div class="hr-field">
        <label for="hrPeriod">Kỳ</label>
        <select id="hrPeriod" class="hr-select">
          ${periods.map(p => `<option value="${escapeHtml(p.id)}" ${p.id === hrState.periodId ? "selected" : ""}>${escapeHtml(p.id)} (${p.status === "dang_mo" ? "Đang mở" : "Đã đóng"})</option>`).join("")}
        </select>
      </div>
      <div class="hr-field">
        <label for="hrStatus">Trạng thái</label>
        <select id="hrStatus" class="hr-select">
          <option value="">Tất cả trạng thái</option>
          ${HR_ORDER.map(k => `<option value="${k}" ${hrState.status === k ? "selected" : ""}>${escapeHtml(STATUS_LABEL[k])}</option>`).join("")}
        </select>
      </div>
      <div class="hr-field">
        <label for="hrDept">Bộ phận</label>
        <select id="hrDept" class="hr-select">${hrDeptOptions(hrState.dept)}</select>
      </div>
      <div class="hr-field">
        <label for="hrEval">Người đánh giá</label>
        <select id="hrEval" class="hr-select">
          <option value="">Tất cả</option>
          ${evaluators.map(n => `<option value="${escapeHtml(n)}" ${hrState.evaluator === n ? "selected" : ""}>${escapeHtml(n)}</option>`).join("")}
        </select>
      </div>
    </div>`;
}

export function hrGroupOf(t) {
  if (t.status === STATUS.FINALIZED) return "finalized";
  if (t.department === HR_DEPT) return "pns";
  if (t.status === STATUS.COMMITTEE) return "waiting_committee";
  return "waiting_dept";
}

export function renderHrTicketRows() {
  const box = document.getElementById("hrTicketRows");
  if (!box) return;

  const list = hrFiltered();
  if (!list.length) {
    box.innerHTML = `<div class="hr-empty-box"><strong>Không có phiếu phù hợp</strong>Thử bỏ bớt bộ lọc hoặc đổi kỳ.</div>`;
    return;
  }

  const schools = hrSchoolMap();
  const printable = list.filter(t => t.status === STATUS.FINALIZED);
  const bar = printable.length ? `
    <div class="hr-bulkbar">
      <span>${printable.length} phiếu đã chốt trong danh sách · đã chọn ${printable.filter(t => hrPrintSel.has(t.id)).length}</span>
      <button type="button" class="hr-btn-sm" data-hr-print-batch>In hàng loạt</button>
    </div>` : "";
  box.innerHTML = bar + HR_GROUPS.map(g => {
    const items = list.filter(t => hrGroupOf(t) === g.key);
    if (!items.length) return "";
    const limit = hrState.limits[g.key] || HR_PER_PAGE;
    const shown = items.slice(0, limit);
    const more = items.length - shown.length;
    return `
      <section class="hr-group hr-group--${g.key}">
        <div class="hr-group__head">
          <h3>${escapeHtml(g.title)} <span class="hr-count">${items.length}</span></h3>
          ${g.hint ? `<p class="hr-meta">${escapeHtml(g.hint)}</p>` : ""}
        </div>
        <div class="hr-table-wrap">
          <table class="hr-table">
            <thead>
              <tr>
                <th>Mã SV</th>
                <th>Họ tên</th>
                <th>Trường</th>
                <th>Bộ phận</th>
                <th>Người đánh giá</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${shown.map(t => `
                <tr>
                  <td class="hr-num">${escapeHtml(t.internId)}</td>
                  <td>${escapeHtml(t.internName)}</td>
                  <td>${escapeHtml(schools.get(t.internId) || "—")}</td>
                  <td>${escapeHtml(DemoStore.departmentName(t.department))}</td>
                  <td>${escapeHtml(hrEvaluatorLabel(t))}<br><small>Tổ CTSV: ${escapeHtml(t.committeeName || "chưa phân công")}</small></td>
                  <td><span class="hr-badge hr-badge--${t.status}">${escapeHtml(STATUS_LABEL[t.status] || t.status)}</span></td>
                  <td>
                    <a class="hr-btn-sm" href="./evaluation-form.html?id=${encodeURIComponent(t.id)}">Mở phiếu</a>
                    ${t.status === STATUS.FINALIZED ? `<label class="hr-print-check"><input type="checkbox" data-hr-print-select="${escapeHtml(t.id)}" ${hrPrintSel.has(t.id) ? "checked" : ""}> Chọn in</label><a class="hr-btn-sm" href="./print-ticket.html?id=${encodeURIComponent(t.id)}" target="_blank" rel="noopener">In phiếu</a>` : ""}
                  </td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
        ${more > 0 ? `
          <div class="hr-more">
            <button type="button" class="hr-btn-ghost" data-hr-more="${g.key}">Hiển thị thêm ${Math.min(more, HR_PER_PAGE)} phiếu (còn ${more})</button>
          </div>` : ""}
      </section>`;
  }).join("");
}

export function renderHrAll() {
  if (!isHR()) return;
  renderHrDashboard();
  renderHrTicketFilters();
  renderHrTicketRows();
}

export function handleHrClick(event) {
  if (!isHR()) return;

  const batch = event.target.closest("[data-hr-print-batch]");
  if (batch) {
    // In các phiếu đã chọn; nếu chưa chọn thì in toàn bộ phiếu đã chốt đang lọc
    const printable = hrFiltered().filter(t => t.status === STATUS.FINALIZED);
    const chosen = printable.filter(t => hrPrintSel.has(t.id));
    const ids = (chosen.length ? chosen : printable).map(t => t.id);
    if (!ids.length) return;
    window.open(`./print-ticket.html?ids=${ids.map(id => encodeURIComponent(id)).join(",")}`, "_blank", "noopener");
    return;
  }

  if (event.target.closest("[data-hr-go-committee]")) {
    switchView("assignments");
    return;
  }

  const card = event.target.closest("[data-hr-period]");
  if (card) {
    hrState.periodId = card.dataset.hrPeriod;
    hrState.limits = {};
    renderHrAll();
    return;
  }

  const deptRow = event.target.closest("[data-hr-open-dept]");
  if (deptRow) {
    hrState.dept = deptRow.dataset.hrOpenDept;
    hrState.status = "";
    hrState.limits = {};
    switchView("evaluations");
    return;
  }

  const statusBtn = event.target.closest("[data-hr-open-status]");
  if (statusBtn) {
    hrState.status = statusBtn.dataset.hrOpenStatus;
    hrState.limits = {};
    switchView("evaluations");
    return;
  }

  const moreBtn = event.target.closest("[data-hr-more]");
  if (moreBtn) {
    const key = moreBtn.dataset.hrMore;
    hrState.limits[key] = (hrState.limits[key] || HR_PER_PAGE) + HR_PER_PAGE;
    renderHrTicketRows();
  }
}

export function handleHrChange(event) {
  if (!isHR()) return;
  const t = event.target;

  if (t.matches("[data-hr-print-select]")) {
    if (t.checked) hrPrintSel.add(t.dataset.hrPrintSelect);
    else hrPrintSel.delete(t.dataset.hrPrintSelect);
    renderHrTicketRows();
    return;
  }

  if (t.matches("[data-hr-dept-filter]") || t.id === "hrDept") {
    hrState.dept = t.value;
    hrState.limits = {};
    renderHrAll();
  } else if (t.id === "hrPeriod") {
    hrState.periodId = t.value;
    hrState.limits = {};
    renderHrAll();
  } else if (t.id === "hrStatus") {
    hrState.status = t.value;
    hrState.limits = {};
    renderHrTicketRows();
  } else if (t.id === "hrEval") {
    hrState.evaluator = t.value;
    hrState.limits = {};
    renderHrTicketRows();
  }
}

export function handleHrInput(event) {
  if (!isHR()) return;
  if (event.target.id === "hrQ") {
    hrState.q = event.target.value;
    hrState.limits = {};
    renderHrTicketRows();
  }
}

export function ticketRow(ticket, dateField) {
  return `
    <tr>
      <td>${escapeHtml(ticket.id)}</td>
      <td>${escapeHtml(ticket.internName)}<br><small>${escapeHtml(ticket.internId)}</small></td>
      <td>${escapeHtml(ticket.department)}</td>
      <td>${escapeHtml(STATUS_LABEL[ticket.status] || ticket.status)}</td>
      <td>${formatDateTime(ticket[dateField])}</td>
      <td><a class="btn btn-secondary btn-sm" href="./evaluation-form.html?id=${encodeURIComponent(ticket.id)}">Mở phiếu</a></td>
    </tr>`;
}

export function fillTable(tableId, rows, emptyText) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  if (!tbody) return;
  tbody.innerHTML = rows.length
    ? rows.join("")
    : `<tr class="empty-state"><td colspan="6">${emptyText}</td></tr>`;
}

export function displayAllTickets() {
  if (state.userProfile?.role === "supervisor") {
    displayTicketsGroupedByEvaluator();
    return;
  }
  const rows = byInternId(state.tickets).map(t => ticketRow(t, "createdAt"));
  fillTable("ticketsTable", rows, "Chưa có phiếu nào");
}

// Trưởng bộ phận: nhóm phiếu theo người đánh giá; nhóm tự đánh giá đặt cuối
export function displayTicketsGroupedByEvaluator() {
  const groups = new Map();
  for (const t of byInternId(state.tickets)) {
    const key = t.evaluatorUid || (t.evaluatorAssigned ? "__self__" : "__waiting__");
    if (!groups.has(key)) {
      groups.set(key, {
        self: !t.evaluatorUid && !!t.evaluatorAssigned,
        waiting: !t.evaluatorAssigned,
        name: t.evaluatorUid ? (t.evaluatorName || "Chưa rõ tên")
          : t.evaluatorAssigned ? (t.evaluatorName || "Trưởng bộ phận")
          : "Đang đợi giao người đánh giá",
        items: []
      });
    }
    groups.get(key).items.push(t);
  }

  const rank = g => g.waiting ? 2 : g.self ? 1 : 0;
  const ordered = [...groups.values()].sort((a, b) =>
    rank(a) - rank(b) || a.name.localeCompare(b.name, "vi"));

  const rows = [];
  for (const g of ordered) {
    rows.push(`
      <tr class="group-row">
        <td colspan="6" style="background:#f5f7fa;font-weight:600;">
          ${g.self ? "" : "Người hướng dẫn: "}${escapeHtml(g.name)} · ${g.items.length} SVTT
        </td>
      </tr>`);
    rows.push(...g.items.map(t => ticketRow(t, "createdAt")));
  }
  fillTable("ticketsTable", rows, "Chưa có phiếu nào");
}
