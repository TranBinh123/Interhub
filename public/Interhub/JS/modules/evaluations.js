// ============================================
// modules/evaluations.js
// Danh sách phiếu đánh giá: bộ lọc, nhóm theo trạng thái (xem trước 3 SVTT, bấm xem thêm).
// Phòng Nhân sự dùng hrState; Người hướng dẫn / Trưởng bộ phận dùng evState.
// ============================================

import { DemoStore, STATUS, STATUS_LABEL, formatDateTime } from "../db.js";
import { switchView } from "../layout.js";
import { hrDeptOptions, renderHrDashboard } from "./dashboard.js";
import {
  GROUP_MORE_STEP, GROUP_PREVIEW, HR_COLOR, HR_DEPT, HR_GROUPS, HR_ORDER, hrPrintSel, hrState, evState, state
} from "../state.js";
import { actorInfo, escapeHtml, isHR } from "../utils.js";

// ===== Dùng chung =====
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

function periodNameOf(periodId) {
  const p = DemoStore.listPeriods().find(x => x.id === periodId);
  return p ? (p.name || p.id) : (periodId || "—");
}

// Nút xem thêm cho một nhóm
function moreButton(attr, key, total, shown, limit) {
  const more = total - shown;
  if (more <= 0) return "";
  const step = Math.min(more, GROUP_MORE_STEP);
  return `
    <div class="more-row">
      <button type="button" class="btn btn-secondary btn-sm" ${attr}="${key}">
        Xem thêm ${step} (còn ${more})
      </button>
    </div>`;
}

// ===== Phòng Nhân sự =====
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
    <div class="filter-bar">
      <div class="filter-field filter-grow">
        <label for="hrQ">Tìm theo tên, mã SV hoặc trường</label>
        <input id="hrQ" class="hr-input" type="search" value="${escapeHtml(hrState.q)}" placeholder="Ví dụ: SV001 hoặc Linh">
      </div>
      <div class="filter-field">
        <label for="hrPeriod">Kỳ</label>
        <select id="hrPeriod" class="hr-select">
          ${periods.map(p => `<option value="${escapeHtml(p.id)}" ${p.id === hrState.periodId ? "selected" : ""}>${escapeHtml(p.name || p.id)} (${p.status === "dang_mo" ? "Đang mở" : "Đã đóng"})</option>`).join("")}
        </select>
      </div>
      <div class="filter-field">
        <label for="hrStatus">Trạng thái</label>
        <select id="hrStatus" class="hr-select">
          <option value="">Tất cả trạng thái</option>
          ${HR_ORDER.map(k => `<option value="${k}" ${hrState.status === k ? "selected" : ""}>${escapeHtml(STATUS_LABEL[k])}</option>`).join("")}
        </select>
      </div>
      <div class="filter-field">
        <label for="hrDept">Bộ phận</label>
        <select id="hrDept" class="hr-select">${hrDeptOptions(hrState.dept)}</select>
      </div>
      <div class="filter-field">
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
    const limit = hrState.limits[g.key] || GROUP_PREVIEW;
    const shown = items.slice(0, limit);
    return `
      <section class="hr-group hr-group--${g.key}">
        <div class="hr-group__head">
          <h3>${escapeHtml(g.title)} <span class="hr-count">${items.length}</span></h3>
          ${g.hint ? `<p class="hr-meta">${escapeHtml(g.hint)}</p>` : ""}
        </div>
        <div class="hr-table-wrap">
          <table class="hr-table table-cards">
            <thead>
              <tr>
                <th>Mã SV</th>
                <th>Họ tên</th>
                <th>Trường</th>
                <th>Kỳ đánh giá</th>
                <th>Bộ phận</th>
                <th>Người đánh giá</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${shown.map(t => `
                <tr>
                  <td class="hr-num" data-label="Mã SV">${escapeHtml(t.internId)}</td>
                  <td data-label="Họ tên">${escapeHtml(t.internName)}</td>
                  <td data-label="Trường">${escapeHtml(schools.get(t.internId) || "—")}</td>
                  <td data-label="Kỳ đánh giá">${escapeHtml(periodNameOf(t.periodId))}</td>
                  <td data-label="Bộ phận">${escapeHtml(DemoStore.departmentName(t.department))}</td>
                  <td data-label="Người đánh giá">${escapeHtml(hrEvaluatorLabel(t))}<br><small>Tổ CTSV: ${escapeHtml(t.committeeName || "chưa phân công")}</small></td>
                  <td data-label="Trạng thái"><span class="hr-badge hr-badge--${t.status}">${escapeHtml(STATUS_LABEL[t.status] || t.status)}</span></td>
                  <td data-label="Thao tác">
                    <a class="hr-btn-sm" href="./evaluation-form.html?id=${encodeURIComponent(t.id)}">Mở phiếu</a>
                    ${t.status === STATUS.FINALIZED ? `<label class="hr-print-check"><input type="checkbox" data-hr-print-select="${escapeHtml(t.id)}" ${hrPrintSel.has(t.id) ? "checked" : ""}> Chọn in</label><a class="hr-btn-sm" href="./print-ticket.html?id=${encodeURIComponent(t.id)}" target="_blank" rel="noopener">In phiếu</a>` : ""}
                  </td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
        ${moreButton("data-hr-more", g.key, items.length, shown.length, limit)}
      </section>`;
  }).join("");
}

export function renderHrAll() {
  if (!isHR()) return;
  renderHrDashboard();
  renderHrTicketFilters();
  renderHrTicketRows();
}

// ===== Người hướng dẫn / Trưởng bộ phận =====
function evTickets() {
  return DemoStore.listTickets(actorInfo(), evState.periodId);
}

function evEvaluators(list) {
  return [...new Set(list.map(hrEvaluatorLabel))].sort((a, b) => a.localeCompare(b, "vi"));
}

// Lọc theo kỳ, tên/mã SV, người đánh giá (chưa lọc trạng thái, để thống kê đầy đủ)
function evBase() {
  const q = evState.q.trim().toLowerCase();
  return evTickets()
    .filter(t => !evState.evaluator || hrEvaluatorLabel(t) === evState.evaluator)
    .filter(t => !q || `${t.internName} ${t.internId}`.toLowerCase().includes(q));
}

export function renderEvFilters() {
  const box = document.getElementById("evFilters");
  if (!box) return;
  if (!evState.periodId) {
    evState.periodId = (DemoStore.activePeriod() || DemoStore.listPeriods()[0] || {}).id || "";
  }
  const periods = DemoStore.listPeriods();
  const isSup = state.userProfile?.role === "supervisor";
  const evaluators = evEvaluators(evTickets());

  box.innerHTML = `
    <div class="filter-bar">
      <div class="filter-field filter-grow">
        <label for="evQ">Tìm theo tên hoặc mã SV</label>
        <input id="evQ" class="search-input" type="search" value="${escapeHtml(evState.q)}" placeholder="Ví dụ: SV001 hoặc Linh">
      </div>
      <div class="filter-field">
        <label for="evPeriod">Kỳ đánh giá</label>
        <select id="evPeriod">
          ${periods.map(p => `<option value="${escapeHtml(p.id)}" ${p.id === evState.periodId ? "selected" : ""}>${escapeHtml(p.name || p.id)}</option>`).join("")}
        </select>
      </div>
      <div class="filter-field">
        <label for="evStatus">Trạng thái</label>
        <select id="evStatus">
          <option value="">Tất cả trạng thái</option>
          ${HR_ORDER.map(k => `<option value="${k}" ${evState.status === k ? "selected" : ""}>${escapeHtml(STATUS_LABEL[k])}</option>`).join("")}
        </select>
      </div>
      ${isSup ? `
      <div class="filter-field">
        <label for="evEval">Người đánh giá</label>
        <select id="evEval">
          <option value="">Tất cả</option>
          ${evaluators.map(n => `<option value="${escapeHtml(n)}" ${evState.evaluator === n ? "selected" : ""}>${escapeHtml(n)}</option>`).join("")}
        </select>
      </div>` : ""}
    </div>`;
}

export function renderEvGroups() {
  const box = document.getElementById("evGroups");
  if (!box) return;

  const base = evBase();
  const counts = Object.fromEntries(HR_ORDER.map(k => [k, base.filter(t => t.status === k).length]));
  const chips = `
    <div class="stat-chips">
      <span class="stat-chip"><b>${base.length}</b> phiếu</span>
      ${HR_ORDER.filter(k => counts[k]).map(k => `
        <span class="stat-chip"><i style="background:${HR_COLOR[k]}"></i>${escapeHtml(STATUS_LABEL[k])}: <b>${counts[k]}</b></span>`).join("")}
    </div>`;

  const list = evState.status ? base.filter(t => t.status === evState.status) : base;
  if (!base.length) {
    box.innerHTML = `${chips}<div class="hr-empty-box"><strong>Chưa có phiếu nào</strong>Thử đổi kỳ hoặc bỏ bớt bộ lọc.</div>`;
    return;
  }
  if (!list.length) {
    box.innerHTML = `${chips}<div class="hr-empty-box"><strong>Không có phiếu phù hợp</strong>Thử bỏ bớt bộ lọc.</div>`;
    return;
  }

  const groups = HR_ORDER.map(k => {
    const items = list.filter(t => t.status === k)
      .sort((a, b) => a.internId.localeCompare(b.internId, "vi", { numeric: true }));
    if (!items.length) return "";
    const limit = evState.limits[k] || GROUP_PREVIEW;
    const shown = items.slice(0, limit);
    return `
      <section class="ev-group">
        <div class="ev-group__head">
          <span class="dot" style="background:${HR_COLOR[k]}"></span>
          <h3>${escapeHtml(STATUS_LABEL[k])}</h3>
          <span class="count-badge">${items.length} SVTT</span>
        </div>
        <div class="table-wrap">
          <table class="table-cards">
            <thead>
              <tr>
                <th>Mã SV</th>
                <th>Sinh viên</th>
                <th>Trường</th>
                <th>Kỳ đánh giá</th>
                <th>Người đánh giá</th>
                <th>Ngày tạo</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              ${shown.map(t => `
                <tr>
                  <td data-label="Mã SV">${escapeHtml(t.internId)}</td>
                  <td data-label="Sinh viên">${escapeHtml(t.internName)}</td>
                  <td data-label="Trường">${escapeHtml(t.school || "—")}</td>
                  <td data-label="Kỳ đánh giá">${escapeHtml(periodNameOf(t.periodId))}</td>
                  <td data-label="Người đánh giá">${escapeHtml(hrEvaluatorLabel(t))}</td>
                  <td data-label="Ngày tạo">${formatDateTime(t.createdAt)}</td>
                  <td data-label="Hành động"><a class="btn btn-secondary btn-sm" href="./evaluation-form.html?id=${encodeURIComponent(t.id)}">Mở phiếu</a></td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
        ${moreButton("data-ev-more", k, items.length, shown.length, limit)}
      </section>`;
  }).join("");

  box.innerHTML = chips + groups;
}

// Gọi khi tải lại dữ liệu cho Người hướng dẫn / Trưởng bộ phận
export function displayAllTickets() {
  if (isHR()) return;
  renderEvFilters();
  renderEvGroups();
}

export function handleEvClick(event) {
  if (isHR()) return;
  const more = event.target.closest("[data-ev-more]");
  if (more) {
    const key = more.dataset.evMore;
    evState.limits[key] = (evState.limits[key] || GROUP_PREVIEW) + GROUP_MORE_STEP;
    renderEvGroups();
  }
}

export function handleEvChange(event) {
  if (isHR()) return;
  const t = event.target;
  if (t.id === "evPeriod") {
    evState.periodId = t.value;
    evState.limits = {};
    renderEvFilters();
    renderEvGroups();
  } else if (t.id === "evStatus") {
    evState.status = t.value;
    evState.limits = {};
    renderEvGroups();
  } else if (t.id === "evEval") {
    evState.evaluator = t.value;
    evState.limits = {};
    renderEvGroups();
  }
}

export function handleEvInput(event) {
  if (isHR()) return;
  if (event.target.id === "evQ") {
    evState.q = event.target.value;
    evState.limits = {};
    renderEvGroups();
  }
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
    hrState.limits[key] = (hrState.limits[key] || GROUP_PREVIEW) + GROUP_MORE_STEP;
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

export function fillTable(tableId, rows, emptyText) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  if (!tbody) return;
  tbody.innerHTML = rows.length
    ? rows.join("")
    : `<tr class="empty-state"><td colspan="6">${emptyText}</td></tr>`;
}
