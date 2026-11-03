// ============================================
// modules/reports.js
// Báo cáo: số liệu theo kỳ/bộ phận, kết quả đã chốt, xuất CSV.
// ============================================

import { DemoStore, STATUS, STATUS_LABEL } from "../db.js";
import { HR_COLOR, state } from "../state.js";
import { actorInfo, average, departmentOptions, downloadCsv, escapeHtml, formatScore, isHR, periodOptions, resolvePeriodId } from "../utils.js";

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
      if (event.target.matches("[data-rp-period]")) state.reports.periodId = event.target.value;
      else if (event.target.matches("[data-rp-dept]")) state.reports.dept = event.target.value;
      else return;
      state.reports.limit = 5;
      renderReportsView();
    });
    root.addEventListener("click", event => {
      if (event.target.closest("[data-rp-export]")) exportReportCsv();
      else if (event.target.closest("[data-rp-more]")) {
        state.reports.limit = (state.reports.limit || 5) + 5;
        renderReportsView();
      } else if (event.target.closest("[data-rp-less]")) {
        state.reports.limit = 5;
        renderReportsView();
      }
    });
  }

  const list = reportTickets();
  const finalized = list.filter(t => t.status === STATUS.FINALIZED).length;
  const toolbar = `
    <div class="assign-toolbar">
      <select data-rp-period aria-label="Kỳ đánh giá">${periodOptions(state.reports.periodId)}</select>
      <select data-rp-dept aria-label="Bộ phận">${departmentOptions(state.reports.dept)}</select>
    </div>`;
  const head = `
    <h2 style="display:flex;justify-content:space-between;align-items:center;margin:0 0 16px;gap:12px;flex-wrap:wrap;">
      <span>Báo cáo đánh giá</span>
      <button type="button" class="btn btn-primary btn-sm" data-rp-export ${finalized ? "" : "disabled"}>Xuất CSV kết quả</button>
    </h2>`;

  // Phòng Nhân sự: chỉ cần số SVTT đã được Tổ Công tác sinh viên chốt
  if (isHR()) {
    root.innerHTML = `
      ${head}
      ${toolbar}
      <div class="stats-grid" style="margin:16px 0;">
        <div class="stat-card"><div class="stat-label">SVTT đã được Tổ CTSV chốt</div><div class="stat-value">${finalized}</div></div>
      </div>
      <p style="color:var(--text-muted);font-size:13px;margin:0;">Trên tổng ${list.length} SVTT trong kỳ đã chọn.</p>`;
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
    ${moreHtml}`;
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
