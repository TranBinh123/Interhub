// ============================================
// modules/timesheet.js
// Chấm công: tổng hợp o / v / Off theo kỳ và chấm công ngày hôm nay.
// ============================================

import { showMessage } from "../components/messages.js";
import { DemoStore } from "../db.js";
import { state } from "../state.js";
import { actorInfo, byInternId, escapeHtml, periodOptions, resolvePeriodId } from "../utils.js";

// ===== Mục "Chấm công": tổng hợp ký hiệu o / v / Off theo phiếu của kỳ =====
export function timesheetRows(actor, periodId) {
  const today = DemoStore.todayIso();
  return byInternId(DemoStore.listTickets(actor, periodId)).map(ticket => {
    const days = DemoStore.attendanceDays(ticket.id);
    const counts = { o: 0, v: 0, Off: 0 };
    days.forEach(d => { if (counts[d.code] !== undefined) counts[d.code] += 1; });
    return {
      ticket,
      counts,
      total: days.length,
      recorded: days.filter(d => d.recorded).length,
      today: days.find(d => d.date === today) || null,
      canEdit: DemoStore.permissionsFor(ticket, actor).attendance
    };
  });
}

export function timesheetTodayCell(row) {
  if (!row.today) return `<small>Ngoài thời gian thực tập</small>`;
  if (!row.canEdit) return escapeHtml(row.today.code || "—");
  const opt = (value, label) => `<option value="${value}" ${row.today.code === value ? "selected" : ""}>${label}</option>`;
  return `<select data-ts-day data-ticket="${escapeHtml(row.ticket.id)}" data-date="${escapeHtml(row.today.date)}" aria-label="Chấm công hôm nay">
    ${opt("", "—")}${opt("o", "o · đi làm")}${opt("v", "v · vắng")}${opt("Off", "Off · nghỉ")}
  </select>`;
}

export function fillTimesheetRows() {
  const body = document.getElementById("timesheetBody");
  if (!body) return;
  const q = state.timesheet.q.trim().toLowerCase();
  const rows = timesheetRows(actorInfo(), state.timesheet.periodId)
    .filter(r => !q || `${r.ticket.internId} ${r.ticket.internName}`.toLowerCase().includes(q));
  body.innerHTML = rows.length
    ? rows.map(r => `
      <tr>
        <td>${escapeHtml(r.ticket.internName)}<br><small>${escapeHtml(r.ticket.internId)}</small></td>
        <td>${escapeHtml(r.ticket.department)}</td>
        <td class="r">${r.counts.o}</td>
        <td class="r">${r.counts.v}</td>
        <td class="r">${r.counts.Off}</td>
        <td class="r">${r.recorded}/${r.total}</td>
        <td>${timesheetTodayCell(r)}</td>
        <td><a class="btn btn-secondary btn-sm" href="./evaluation-form.html?id=${encodeURIComponent(r.ticket.id)}#attendanceCard">Chi tiết</a></td>
      </tr>`).join("")
    : `<tr class="empty-state"><td colspan="8">Chưa có phiếu nào trong kỳ này</td></tr>`;
}

export function renderTimesheetView() {
  const root = document.getElementById("timesheetRoot");
  if (!root) return;
  state.timesheet.periodId = resolvePeriodId(state.timesheet.periodId);
  if (!root.dataset.bound) {
    root.dataset.bound = "1";
    root.addEventListener("input", event => {
      if (!event.target.matches("[data-ts-q]")) return;
      state.timesheet.q = event.target.value;
      fillTimesheetRows();
    });
    root.addEventListener("change", event => {
      const el = event.target;
      if (el.matches("[data-ts-period]")) {
        state.timesheet.periodId = el.value;
        fillTimesheetRows();
      } else if (el.matches("[data-ts-day]")) {
        const result = DemoStore.setAttendance(el.dataset.ticket, actorInfo(), el.dataset.date, el.value);
        if (!result.ok) showMessage("error", "❌ " + result.error);
        fillTimesheetRows();
      }
    });
  }
  root.innerHTML = `
    <h2 style="margin:0 0 6px;">Chấm công</h2>
    <p style="margin:0 0 16px;color:var(--text-muted);font-size:13px;">Tổng hợp theo kỳ. Ký hiệu: o = đi làm, v = vắng, Off = nghỉ. Người được phân công đánh giá chấm công ngày hôm nay tại đây; các ngày khác mở "Chi tiết".</p>
    <div class="assign-toolbar">
      <select data-ts-period aria-label="Kỳ đánh giá">${periodOptions(state.timesheet.periodId)}</select>
      <input type="search" class="search-input" data-ts-q placeholder="Tìm theo tên hoặc mã SV" value="${escapeHtml(state.timesheet.q)}">
    </div>
    <div class="table-wrap">
      <table class="assign-table">
        <thead>
          <tr><th>Sinh viên</th><th>Bộ phận</th><th class="r">Đi làm</th><th class="r">Vắng</th><th class="r">Off</th><th class="r">Đã ghi</th><th>Hôm nay</th><th></th></tr>
        </thead>
        <tbody id="timesheetBody"></tbody>
      </table>
    </div>`;
  fillTimesheetRows();
}
