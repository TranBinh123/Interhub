// ============================================
// modules/reports.js
// Báo cáo: số liệu theo kỳ/bộ phận, kết quả đã chốt, xuất CSV.
// ============================================

import { DemoStore, STATUS, STATUS_LABEL } from "../db.js";
import { state } from "../state.js";
import { actorInfo, average, departmentOptions, downloadCsv, escapeHtml, formatScore, periodOptions, resolvePeriodId } from "../utils.js";

// ===== Mục "Báo cáo": số liệu theo kỳ, theo bộ phận và bảng kết quả (xuất CSV) =====
export function reportTickets() {
  const { periodId, dept } = state.reports;
  return DemoStore.listTickets(actorInfo(), periodId).filter(t => !dept || t.department === dept);
}

export function reportByDepartment(list) {
  const groups = new Map();
  list.forEach(t => {
    if (!groups.has(t.department)) groups.set(t.department, []);
    groups.get(t.department).push(t);
  });
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "vi"))
    .map(([department, items]) => {
      const sums = items.map(t => DemoStore.scoreSummary(t));
      return {
        department,
        total: items.length,
        finalized: items.filter(t => t.status === STATUS.FINALIZED).length,
        dept: average(sums.map(s => s.dept)),
        committee: average(sums.map(s => s.committee)),
        final: average(sums.map(s => s.final))
      };
    });
}

export function reportResults(list) {
  return list
    .filter(t => t.status === STATUS.FINALIZED)
    .map(t => ({ ticket: t, summary: DemoStore.scoreSummary(t) }))
    .sort((a, b) => (b.summary.final ?? -1) - (a.summary.final ?? -1));
}

export function reportDepartmentRows(list) {
  const rows = reportByDepartment(list);
  if (!rows.length) return `<tr class="empty-state"><td colspan="6">Chưa có dữ liệu</td></tr>`;
  return rows.map(r => `
    <tr>
      <td>${escapeHtml(r.department)}<br><small>${escapeHtml(DemoStore.departmentName(r.department))}</small></td>
      <td class="r">${r.total}</td><td class="r">${r.finalized}</td>
      <td class="r">${formatScore(r.dept)}</td><td class="r">${formatScore(r.committee)}</td><td class="r">${formatScore(r.final)}</td>
    </tr>`).join("");
}

export function reportResultRows(results) {
  if (!results.length) return `<tr class="empty-state"><td colspan="6">Chưa có phiếu nào được chốt</td></tr>`;
  return results.map(({ ticket: t, summary: s }) => `
    <tr>
      <td>${escapeHtml(t.internName)}<br><small>${escapeHtml(t.internId)}</small></td>
      <td>${escapeHtml(t.school || "—")}</td><td>${escapeHtml(t.department)}</td>
      <td class="r">${formatScore(s.dept)}</td><td class="r">${formatScore(s.committee)}</td><td class="r"><b>${formatScore(s.final)}</b></td>
    </tr>`).join("");
}

export function renderReportsView() {
  const root = document.getElementById("reportsRoot");
  if (!root) return;
  state.reports.periodId = resolvePeriodId(state.reports.periodId);
  if (!root.dataset.bound) {
    root.dataset.bound = "1";
    root.addEventListener("change", event => {
      if (event.target.matches("[data-rp-period]")) state.reports.periodId = event.target.value;
      else if (event.target.matches("[data-rp-dept]")) state.reports.dept = event.target.value;
      else return;
      renderReportsView();
    });
    root.addEventListener("click", event => {
      if (event.target.closest("[data-rp-export]")) exportReportCsv();
    });
  }

  const list = reportTickets();
  const finalized = list.filter(t => t.status === STATUS.FINALIZED).length;
  const pct = list.length ? Math.round((finalized / list.length) * 100) : 0;
  const results = reportResults(list);
  const avgFinal = average(results.map(r => r.summary.final));
  const byStatus = Object.keys(STATUS_LABEL).map(code => ({ code, count: list.filter(t => t.status === code).length }));

  root.innerHTML = `
    <h2 style="display:flex;justify-content:space-between;align-items:center;margin:0 0 16px;gap:12px;flex-wrap:wrap;">
      <span>Báo cáo đánh giá</span>
      <button type="button" class="btn btn-primary btn-sm" data-rp-export ${results.length ? "" : "disabled"}>Xuất CSV kết quả</button>
    </h2>
    <div class="assign-toolbar">
      <select data-rp-period aria-label="Kỳ đánh giá">${periodOptions(state.reports.periodId)}</select>
      <select data-rp-dept aria-label="Bộ phận">${departmentOptions(state.reports.dept)}</select>
    </div>
    <div class="stats-grid" style="margin:16px 0;">
      <div class="stat-card"><div class="stat-label">Tổng phiếu</div><div class="stat-value">${list.length}</div></div>
      <div class="stat-card"><div class="stat-label">Đã chốt</div><div class="stat-value">${finalized} <small>(${pct}%)</small></div></div>
      <div class="stat-card"><div class="stat-label">Điểm cuối trung bình</div><div class="stat-value">${formatScore(avgFinal)}</div></div>
    </div>
    <h3>Theo trạng thái</h3>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Trạng thái</th><th class="r">Số phiếu</th></tr></thead>
        <tbody>${byStatus.map(s => `<tr><td>${escapeHtml(STATUS_LABEL[s.code])}</td><td class="r">${s.count}</td></tr>`).join("")}</tbody>
      </table>
    </div>
    <h3>Theo bộ phận</h3>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Bộ phận</th><th class="r">Tổng phiếu</th><th class="r">Đã chốt</th><th class="r">Điểm bộ phận</th><th class="r">Điểm Tổ CTSV</th><th class="r">Điểm cuối</th></tr></thead>
        <tbody>${reportDepartmentRows(list)}</tbody>
      </table>
    </div>
    <h3>Kết quả phiếu đã chốt</h3>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Sinh viên</th><th>Trường</th><th>Bộ phận</th><th class="r">Điểm bộ phận</th><th class="r">Điểm Tổ CTSV</th><th class="r">Điểm cuối</th></tr></thead>
        <tbody>${reportResultRows(results)}</tbody>
      </table>
    </div>`;
}

export function exportReportCsv() {
  const results = reportResults(reportTickets());
  const header = ["Mã SV", "Họ tên", "Trường", "Bộ phận", "Điểm bộ phận", "Điểm Tổ CTSV", "Điểm cuối", "Trạng thái"];
  const rows = results.map(({ ticket: t, summary: s }) => [
    t.internId, t.internName, t.school || "", t.department,
    formatScore(s.dept), formatScore(s.committee), formatScore(s.final), STATUS_LABEL[t.status]
  ]);
  downloadCsv(`bao-cao-${state.reports.periodId || "ky"}.csv`, [header, ...rows]);
}
