// ============================================
// modules/reports.js
// Báo cáo: số liệu theo kỳ/bộ phận, kết quả đã chốt, xuất CSV.
// ============================================

import { DemoStore, STATUS, STATUS_LABEL } from "../db.js";
import { HR_COLOR, state } from "../state.js";
import { showMessage } from "../components/messages.js";
import { actorInfo, average, departmentOptions, escapeHtml, formatDate, formatScore, isHR, periodOptions, resolvePeriodId } from "../utils.js";
import { exportAttendanceXlsx, periodBounds } from "./attendance-export.js";
import { exportEvaluationList } from "./evaluation-list-export.js";

// ===== Mục "Báo cáo": số liệu theo kỳ, theo bộ phận và bảng kết quả (xuất CSV) =====
// ===== Xuất danh sách: tick chọn, lọc theo trường, mặc định chọn tất cả =====
// att: báo cáo ngày công (BM 07), mọi phiếu trong kỳ. ev: danh sách đánh giá (BM 03), chỉ phiếu đã chốt.
const EXPORTS = {
  att: { title: "Báo cáo ngày công (BM 07)", schoolKey: "attSchool", finalizedOnly: false },
  ev: { title: "Danh sách đánh giá SVTT (BM 03)", schoolKey: "evSchool", finalizedOnly: true }
};
const exportOff = { att: new Set(), ev: new Set() }; // SVTT đang bỏ tick
const exportListIds = { att: [], ev: [] };

// Phạm vi: HR theo bộ phận đã chọn (hoặc tất cả); Trưởng bộ phận/Người hướng dẫn theo bộ phận của mình. Không có Tổ CTSV.
function exportCandidates(kind) {
  const cfg = EXPORTS[kind];
  const periodId = state.reports.periodId;
  const period = DemoStore.listPeriods().find(p => p.id === periodId) || null;
  if (!period) return { period: null, list: [], schools: [], interns: new Map(), school: "" };
  const bounds = periodBounds(period.month);
  const interns = new Map(DemoStore.listInterns().map(i => [i.internId, i]));
  const dept = isHR() ? state.reports.dept : (state.userProfile?.department || "");
  const inDept = t => (isHR() ? !dept || t.department === dept : !!dept && t.department === dept);

  // Bỏ SVTT đã về trước đầu kỳ (không còn đưa vào danh sách)
  const base = DemoStore.listAllTickets(periodId).filter(t => {
    const intern = interns.get(t.internId);
    return inDept(t)
      && !(intern?.endDate && intern.endDate < bounds.start)
      && (!cfg.finalizedOnly || t.status === STATUS.FINALIZED);
  });
  const schools = [...new Set(base.map(t => t.school || "").filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi"));
  const school = schools.includes(state.reports[cfg.schoolKey]) ? state.reports[cfg.schoolKey] : "";
  const list = base
    .filter(t => !school || (t.school || "") === school)
    .sort((a, b) => (a.school || "").localeCompare(b.school || "", "vi") || a.internName.localeCompare(b.internName, "vi"));
  return { period, list, schools, interns, school };
}

function exportSectionHtml(kind) {
  const cfg = EXPORTS[kind];
  const { period, list, schools, interns, school } = exportCandidates(kind);
  exportListIds[kind] = list.map(t => t.id);
  const off = exportOff[kind];
  const chosen = list.filter(t => !off.has(t.id)).length;
  const rowsHtml = list.length ? list.map(t => {
    const intern = interns.get(t.internId) || {};
    return `
      <tr>
        <td class="print-cell" data-label="Chọn"><input type="checkbox" class="print-check" data-${kind}-check="${escapeHtml(t.id)}" aria-label="Chọn ${escapeHtml(t.internName)}" ${off.has(t.id) ? "" : "checked"}></td>
        <td data-label="Sinh viên">${escapeHtml(t.internName)}<br><small>${escapeHtml(t.internId)}</small></td>
        <td data-label="Trường">${escapeHtml(t.school || "—")}</td>
        <td data-label="Bộ phận">${escapeHtml(t.department)}</td>
        <td data-label="Thời gian thực tập">${escapeHtml(formatDate(intern.startDate))} – ${escapeHtml(formatDate(intern.endDate))}</td>
        <td data-label="Trạng thái">${escapeHtml(STATUS_LABEL[t.status] || t.status)}</td>
      </tr>`;
  }).join("") : `<tr class="empty-state"><td colspan="6">Không có SVTT nào trong bộ lọc đang chọn</td></tr>`;

  return `
    <h3>${escapeHtml(cfg.title)}</h3>
    <div class="assign-toolbar">
      <select data-${kind}-school aria-label="Trường (${escapeHtml(cfg.title)})">
        <option value="">Tất cả trường</option>
        ${schools.map(sc => `<option value="${escapeHtml(sc)}" ${school === sc ? "selected" : ""}>${escapeHtml(sc)}</option>`).join("")}
      </select>
    </div>
    <div class="print-bar">
      <span class="print-bar__info"><strong>${list.length}</strong> SVTT · đã chọn <strong>${chosen}</strong></span>
      <div class="print-bar__actions">
        <button type="button" class="print-btn print-btn--ghost" data-${kind}-all ${list.length ? "" : "disabled"}>Chọn tất cả</button>
        <button type="button" class="print-btn print-btn--ghost" data-${kind}-clear ${list.length ? "" : "disabled"}>Bỏ chọn</button>
        <button type="button" class="print-btn print-btn--primary" data-${kind}-export ${period && chosen ? "" : "disabled"}>Xuất .xlsx</button>
      </div>
    </div>
    <div class="table-wrap">
      <table class="table-cards">
        <thead><tr><th class="print-cell">Chọn</th><th>Sinh viên</th><th>Trường</th><th>Bộ phận</th><th>Thời gian thực tập</th><th>Trạng thái</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>`;
}

function exportSectionsHtml() {
  return exportSectionHtml("att") + exportSectionHtml("ev");
}

async function exportList(kind) {
  const { period, list } = exportCandidates(kind);
  const chosen = list.filter(t => !exportOff[kind].has(t.id));
  if (!period || !chosen.length) return;
  try {
    if (kind === "att") {
      await exportAttendanceXlsx({
        periodMonth: period.month,
        rows: chosen.map(t => ({ name: t.internName, days: DemoStore.attendanceDays(t.id) })),
        filename: `BM07-cham-cong-${period.month}.xlsx`
      });
    } else {
      const deptLabel = [...new Set(chosen.map(t => t.department))]
        .map(code => `${code} - ${DemoStore.departmentName(code) || code}`).join("; ");
      await exportEvaluationList({
        periodMonth: period.month,
        tickets: chosen,
        deptLabel,
        filename: `BM03-danh-sach-danh-gia-${period.month}.xlsx`
      });
    }
    showMessage("success", `Đã xuất ${kind === "att" ? "báo cáo ngày công" : "danh sách đánh giá"} cho ${chosen.length} SVTT.`);
  } catch (error) {
    showMessage("error", "❌ " + (error.message || "Không xuất được file."));
  }
}
// HR: tất cả SVTT (lọc theo bộ phận nếu chọn). Trưởng bộ phận/Người hướng dẫn: chỉ bộ phận của mình.
// Tổ Công tác sinh viên giữ phạm vi theo phân công (canView).
export function reportTickets() {
  const { periodId, dept } = state.reports;
  if (state.userProfile?.role === "committee") {
    return DemoStore.listTickets(actorInfo(), periodId).filter(t => !dept || t.department === dept);
  }
  if (isHR()) {
    return DemoStore.listAllTickets(periodId).filter(t => !dept || t.department === dept);
  }
  const own = state.userProfile?.department || "";
  if (!own) return [];
  return DemoStore.listAllTickets(periodId).filter(t => t.department === own);
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
      <td data-label="Bộ phận">${escapeHtml(r.department)}<br><small>${escapeHtml(DemoStore.departmentName(r.department))}</small></td>
      <td class="r" data-label="Tổng phiếu">${r.total}</td><td class="r" data-label="Đã chốt">${r.finalized}</td>
      <td class="r" data-label="Điểm bộ phận">${formatScore(r.dept)}</td><td class="r" data-label="Điểm Tổ CTSV">${formatScore(r.committee)}</td><td class="r" data-label="Điểm cuối">${formatScore(r.final)}</td>
    </tr>`).join("");
}

export function reportResultRows(results) {
  if (!results.length) return `<tr class="empty-state"><td colspan="6">Chưa có phiếu nào được chốt</td></tr>`;
  return results.map(({ ticket: t, summary: s }) => `
    <tr>
      <td data-label="Sinh viên">${escapeHtml(t.internName)}<br><small>${escapeHtml(t.internId)}</small></td>
      <td data-label="Trường">${escapeHtml(t.school || "—")}</td><td data-label="Bộ phận">${escapeHtml(t.department)}</td>
      <td class="r" data-label="Điểm bộ phận">${formatScore(s.dept)}</td><td class="r" data-label="Điểm Tổ CTSV">${formatScore(s.committee)}</td><td class="r" data-label="Điểm cuối"><b>${formatScore(s.final)}</b></td>
    </tr>`).join("");
}

// ===== Biểu đồ tròn theo trạng thái =====
let rpTipData = {};

function statusColor(code) {
  return HR_COLOR[code] || "#94a3b8";
}

function donutSegments(items, total) {
  const r = 90;
  const C = 2 * Math.PI * r;
  let acc = 0;
  return items.map(it => {
    const len = total ? (it.count / total) * C : 0;
    const seg = `<circle data-rp-seg="${it.code}" cx="110" cy="110" r="${r}" stroke="${statusColor(it.code)}"
      stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-acc}"></circle>`;
    acc += len;
    return seg;
  }).join("");
}

export function reportStatusDonut(list) {
  const items = Object.keys(STATUS_LABEL)
    .map(code => ({ code, count: list.filter(t => t.status === code).length }))
    .filter(it => it.count > 0);
  const total = list.length;

  // Dữ liệu chi tiết cho ô hiển thị khi rê chuột
  rpTipData = Object.fromEntries(Object.keys(STATUS_LABEL).map(code => {
    const count = list.filter(t => t.status === code).length;
    const pct = total ? Math.round((count / total) * 100) : 0;
    return [code, `<strong>${escapeHtml(STATUS_LABEL[code])}</strong><br>${count} SVTT · ${pct}% tổng phiếu`];
  }));

  if (!total) {
    return `<div class="hr-empty-box"><strong>Chưa có phiếu</strong>Không có dữ liệu cho bộ lọc đang chọn.</div>`;
  }

  return `
    <div class="rp-donut-wrap">
      <div class="rp-donut" aria-label="Biểu đồ tròn theo trạng thái">
        <svg viewBox="0 0 220 220" role="img">
          <circle cx="110" cy="110" r="90" stroke="#edf2f7" style="stroke-width:34" fill="none"></circle>
          ${donutSegments(items, total)}
        </svg>
        <div class="rp-donut__center"><strong>${total}</strong><span>phiếu</span></div>
      </div>
      <ul class="rp-legend">
        ${items.map(it => `
          <li data-rp-leg="${it.code}">
            <i style="background:${statusColor(it.code)}"></i>
            <span>${escapeHtml(STATUS_LABEL[it.code])}</span>
            <b>${it.count}</b>
            <small>${Math.round((it.count / total) * 100)}%</small>
          </li>`).join("")}
      </ul>
    </div>`;
}

function rpTip() {
  let el = document.getElementById("rpTip");
  if (!el) {
    el = document.createElement("div");
    el.id = "rpTip";
    el.className = "rp-tip";
    document.body.appendChild(el);
  }
  return el;
}

function rpHighlight(code) {
  const root = document.getElementById("reportsRoot");
  if (!root) return;
  root.querySelectorAll("[data-rp-seg]").forEach(c => {
    c.classList.toggle("is-dim", !!code && c.dataset.rpSeg !== code);
    c.classList.toggle("is-hover", !!code && c.dataset.rpSeg === code);
  });
  root.querySelectorAll("[data-rp-leg]").forEach(li => li.classList.toggle("is-hover", li.dataset.rpLeg === code));
}

function bindReportTooltip(root) {
  if (root.dataset.tip) return;
  root.dataset.tip = "1";
  root.addEventListener("mouseover", event => {
    const el = event.target.closest("[data-rp-seg], [data-rp-leg]");
    if (!el) return;
    const code = el.dataset.rpSeg || el.dataset.rpLeg;
    const tip = rpTip();
    tip.innerHTML = rpTipData[code] || "";
    tip.classList.add("show");
    rpHighlight(code);
  });
  root.addEventListener("mousemove", event => {
    const tip = document.getElementById("rpTip");
    if (!tip || !tip.classList.contains("show")) return;
    const x = Math.min(event.clientX + 14, window.innerWidth - tip.offsetWidth - 8);
    const y = Math.min(event.clientY + 14, window.innerHeight - tip.offsetHeight - 8);
    tip.style.left = `${Math.max(8, x)}px`;
    tip.style.top = `${Math.max(8, y)}px`;
  });
  root.addEventListener("mouseout", event => {
    const el = event.target.closest("[data-rp-seg], [data-rp-leg]");
    if (!el) return;
    const tip = document.getElementById("rpTip");
    if (tip) tip.classList.remove("show");
    rpHighlight("");
  });
}

export function renderReportsView() {
  const root = document.getElementById("reportsRoot");
  if (!root) return;
  state.reports.periodId = resolvePeriodId(state.reports.periodId);
  bindReportTooltip(root);
  if (!root.dataset.bound) {
    root.dataset.bound = "1";
    root.addEventListener("change", event => {
      for (const kind of Object.keys(EXPORTS)) {
        if (event.target.matches(`[data-${kind}-check]`)) {
          const id = event.target.dataset[`${kind}Check`];
          if (event.target.checked) exportOff[kind].delete(id);
          else exportOff[kind].add(id);
          renderReportsView();
          return;
        }
        if (event.target.matches(`[data-${kind}-school]`)) {
          state.reports[EXPORTS[kind].schoolKey] = event.target.value;
          exportOff[kind] = new Set();
          renderReportsView();
          return;
        }
      }
      if (event.target.matches("[data-rp-period]")) state.reports.periodId = event.target.value;
      else if (event.target.matches("[data-rp-dept]")) state.reports.dept = event.target.value;
      else if (event.target.matches("[data-rp-school]")) state.reports.school = event.target.value;
      else return;
      exportOff.att = new Set();
      exportOff.ev = new Set();
      state.reports.limit = 5;
      state.reports.schoolLimit = 5;
      renderReportsView();
    });
    root.addEventListener("click", event => {
      for (const kind of Object.keys(EXPORTS)) {
        if (event.target.closest(`[data-${kind}-export]`)) {
          exportList(kind);
          return;
        }
        if (event.target.closest(`[data-${kind}-all]`)) {
          exportOff[kind] = new Set();
          renderReportsView();
          return;
        }
        if (event.target.closest(`[data-${kind}-clear]`)) {
          exportOff[kind] = new Set(exportListIds[kind]);
          renderReportsView();
          return;
        }
      }
      if (event.target.closest("[data-rp-school-more]")) {
        state.reports.schoolLimit = (state.reports.schoolLimit || 5) + 5;
        renderReportsView();
      } else if (event.target.closest("[data-rp-school-less]")) {
        state.reports.schoolLimit = 5;
        renderReportsView();
      } else if (event.target.closest("[data-rp-more]")) {
        state.reports.limit = (state.reports.limit || 5) + 5;
        renderReportsView();
      } else if (event.target.closest("[data-rp-less]")) {
        state.reports.limit = 5;
        renderReportsView();
      }
    });
  }

  const role = state.userProfile?.role;
  const isCom = role === "committee";
  let list = reportTickets();
  const finalized = list.filter(t => t.status === STATUS.FINALIZED).length;

  // Tổ Công tác sinh viên: số SVTT đã chốt, lọc theo Trường (Tổ được phân công theo Trường)
  if (isCom) {
    const schools = [...new Set(list.map(t => t.school || "").filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi"));
    if (state.reports.school && !schools.includes(state.reports.school)) state.reports.school = "";
    const scoped = state.reports.school ? list.filter(t => (t.school || "") === state.reports.school) : list;
    const done = scoped.filter(t => t.status === STATUS.FINALIZED).length;
    root.innerHTML = `
      <h2 style="margin:0 0 16px;"><span>Báo cáo đánh giá</span></h2>
      <div class="assign-toolbar">
        <select data-rp-period aria-label="Kỳ đánh giá">${periodOptions(state.reports.periodId)}</select>
        <select data-rp-school aria-label="Trường">
          <option value="">Tất cả trường</option>
          ${schools.map(sc => `<option value="${escapeHtml(sc)}" ${state.reports.school === sc ? "selected" : ""}>${escapeHtml(sc)}</option>`).join("")}
        </select>
      </div>
      <div class="stats-grid" style="margin:16px 0;">
        <div class="stat-card"><div class="stat-label">SVTT đã được Tổ CTSV chốt</div><div class="stat-value">${done}</div></div>
      </div>
      <p style="color:var(--text-muted);font-size:13px;margin:0;">Trên tổng ${scoped.length} SVTT ${state.reports.school ? `của ${escapeHtml(state.reports.school)}` : "được phân công"} trong kỳ đã chọn.</p>`;
    return;
  }

  const ownDept = state.userProfile?.department || "";
  const deptControl = isHR()
    ? `<select data-rp-dept aria-label="Bộ phận">${departmentOptions(state.reports.dept)}</select>`
    : `<span class="rp-dept-label"><strong>Bộ phận:</strong> ${escapeHtml(ownDept || "—")}</span>`;
  const toolbar = `
    <div class="assign-toolbar">
      <select data-rp-period aria-label="Kỳ đánh giá">${periodOptions(state.reports.periodId)}</select>
      ${deptControl}
    </div>`;
  const head = `<h2 style="margin:0 0 16px;"><span>Báo cáo đánh giá</span></h2>`;

  // Phòng Nhân sự: số SVTT đã chốt, chia theo Trường (Tổ CTSV phụ trách theo Trường)
  if (isHR()) {
    const bySchool = new Map();
    list.forEach(t => {
      const key = t.school || "Chưa có trường";
      if (!bySchool.has(key)) bySchool.set(key, { school: key, total: 0, done: 0, waiting: 0 });
      const g = bySchool.get(key);
      g.total += 1;
      if (t.status === STATUS.FINALIZED) g.done += 1;
      if (t.status === STATUS.COMMITTEE) g.waiting += 1;
    });
    const rows = [...bySchool.values()].sort((a, b) => b.done - a.done || a.school.localeCompare(b.school, "vi"));
    const limit = state.reports.schoolLimit || 5;
    const shown = rows.slice(0, limit);
    const left = rows.length - shown.length;
    const moreHtml = left > 0
      ? `<div class="more-row"><button type="button" class="btn btn-secondary btn-sm" data-rp-school-more>Xem thêm ${Math.min(left, 5)} (còn ${left})</button></div>`
      : (rows.length > 5 ? `<div class="more-row"><button type="button" class="btn btn-secondary btn-sm" data-rp-school-less>Thu gọn</button></div>` : "");
    root.innerHTML = `
      ${head}
      ${toolbar}
      <div class="stats-grid" style="margin:16px 0;">
        <div class="stat-card"><div class="stat-label">SVTT đã được Tổ CTSV chốt</div><div class="stat-value">${finalized}</div></div>
      </div>
      <h3>Theo trường</h3>
      <div class="table-wrap">
        <table class="table-cards">
          <thead><tr><th>Trường</th><th class="r">SVTT</th><th class="r">Đã được Tổ CTSV chốt</th><th class="r">Đang chờ Tổ CTSV</th></tr></thead>
          <tbody>${shown.length ? shown.map(g => `
            <tr>
              <td data-label="Trường">${escapeHtml(g.school)}</td>
              <td class="r" data-label="SVTT">${g.total}</td>
              <td class="r" data-label="Đã chốt">${g.done}</td>
              <td class="r" data-label="Chờ Tổ CTSV">${g.waiting}</td>
            </tr>`).join("") : `<tr class="empty-state"><td colspan="4">Chưa có dữ liệu</td></tr>`}</tbody>
        </table>
      </div>
      ${moreHtml}
      ${exportSectionsHtml()}`;
    return;
  }

  const results = reportResults(list);
  const avgFinal = average(results.map(r => r.summary.final));
  const pct = list.length ? Math.round((finalized / list.length) * 100) : 0;
  const limit = state.reports.limit || 5;
  const shownResults = results.slice(0, limit);
  const left = results.length - shownResults.length;
  const moreHtml = left > 0
    ? `<div class="more-row"><button type="button" class="btn btn-secondary btn-sm" data-rp-more>Xem thêm ${Math.min(left, 5)} (còn ${left})</button></div>`
    : (results.length > 5 ? `<div class="more-row"><button type="button" class="btn btn-secondary btn-sm" data-rp-less>Thu gọn</button></div>` : "");

  root.innerHTML = `
    ${head}
    ${toolbar}
    <div class="stats-grid" style="margin:16px 0;">
      <div class="stat-card"><div class="stat-label">Tổng phiếu</div><div class="stat-value">${list.length}</div></div>
      <div class="stat-card"><div class="stat-label">Đã chốt</div><div class="stat-value">${finalized} <small>(${pct}%)</small></div></div>
      <div class="stat-card"><div class="stat-label">Điểm cuối trung bình</div><div class="stat-value">${formatScore(avgFinal)}</div></div>
    </div>
    <h3>Theo trạng thái</h3>
    <div class="card" style="padding:16px;">${reportStatusDonut(list)}</div>
    <h3>Theo bộ phận</h3>
    <div class="table-wrap">
      <table class="table-cards">
        <thead><tr><th>Bộ phận</th><th class="r">Tổng phiếu</th><th class="r">Đã chốt</th><th class="r">Điểm bộ phận</th><th class="r">Điểm Tổ CTSV</th><th class="r">Điểm cuối</th></tr></thead>
        <tbody>${reportDepartmentRows(list)}</tbody>
      </table>
    </div>
    <h3>Kết quả phiếu đã chốt</h3>
    <div class="table-wrap">
      <table class="table-cards">
        <thead><tr><th>Sinh viên</th><th>Trường</th><th>Bộ phận</th><th class="r">Điểm bộ phận</th><th class="r">Điểm Tổ CTSV</th><th class="r">Điểm cuối</th></tr></thead>
        <tbody>${reportResultRows(shownResults)}</tbody>
      </table>
    </div>
    ${moreHtml}
    ${exportSectionsHtml()}`;
}

