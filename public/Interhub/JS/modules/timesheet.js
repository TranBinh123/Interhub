
// ============================================
// modules/timesheet.js
// Chấm công: tổng hợp theo kỳ và quản lý chi tiết từng ngày.
// ============================================

import { showMessage } from "../components/messages.js";
import { DemoStore } from "../db.js";
import { state } from "../state.js";
import {
  actorInfo,
  byInternId,
  escapeHtml,
  periodOptions,
  resolvePeriodId
} from "../utils.js";

// ============================================
// STATE NỘI BỘ CỦA MODULE
// ============================================

let expandedTicketId = null;
let selectedAttendanceDate = "";

// ============================================
// TIỆN ÍCH
// ============================================

const WEEKDAYS = [
  "Chủ nhật",
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7"
];

const ATTENDANCE_CODES = [
  { value: "", label: "Chưa chấm" },
  { value: "o", label: "o · Đi làm" },
  { value: "v", label: "v · Vắng" },
  { value: "Off", label: "Off · Nghỉ" }
];

function attendanceCodeLabel(code) {
  const item = ATTENDANCE_CODES.find(x => x.value === code);
  return item ? item.label : "Chưa chấm";
}

function attendanceCodeClass(code) {
  if (code === "o") return "ts-status-work";
  if (code === "v") return "ts-status-absent";
  if (code === "Off") return "ts-status-off";
  return "ts-status-empty";
}

function formatShortDate(date) {
  if (!date) return "";
  const [year, month, day] = date.split("-");
  return `${day}/${month}`;
}

function getSelectedDay(days) {
  return days.find(day => day.date === selectedAttendanceDate) || null;
}

// ============================================
// DỮ LIỆU TỔNG HỢP
// ============================================

export function timesheetRows(actor, periodId) {
  const today = DemoStore.todayIso();

  return byInternId(DemoStore.listTickets(actor, periodId)).map(ticket => {
    const days = DemoStore.attendanceDays(ticket.id);

    const counts = {
      o: 0,
      v: 0,
      Off: 0
    };

    days.forEach(day => {
      if (counts[day.code] !== undefined) {
        counts[day.code] += 1;
      }
    });

    return {
      ticket,
      counts,
      total: days.length,
      recorded: days.filter(day => day.recorded).length,
      today: days.find(day => day.date === today) || null,
      canEdit: DemoStore.permissionsFor(ticket, actor).attendance
    };
  });
}

// ============================================
// Ô CHẤM CÔNG HÔM NAY TRÊN BẢNG TỔNG HỢP
// ============================================

export function timesheetTodayCell(row) {
  if (!row.today) {
    return `<small>Ngoài thời gian thực tập</small>`;
  }

  if (!row.canEdit) {
    return escapeHtml(row.today.code || "—");
  }

  const options = ATTENDANCE_CODES.map(item => `
    <option
      value="${escapeHtml(item.value)}"
      ${row.today.code === item.value ? "selected" : ""}
    >${escapeHtml(item.label)}</option>
  `).join("");

  return `
    <select
      data-ts-day
      data-ticket="${escapeHtml(row.ticket.id)}"
      data-date="${escapeHtml(row.today.date)}"
      aria-label="Chấm công hôm nay"
    >
      ${options}
    </select>
  `;
}

// ============================================
// LỊCH CHẤM CÔNG THEO NGÀY
// ============================================

function renderAttendanceCalendar(days) {
  if (!days.length) {
    return `
      <div class="ts-empty">
        Không có ngày thực tập trong khoảng thời gian này.
      </div>
    `;
  }

  // Căn ngày đầu tiên vào đúng thứ trong tuần.
  const leadingSpaces = Array.from(
    { length: days[0].weekday },
    () => `<div class="ts-calendar-placeholder"></div>`
  ).join("");

  const dayCards = days.map(day => {
    const isSelected = day.date === selectedAttendanceDate;
    const isToday = day.date === DemoStore.todayIso();
    const statusClass = attendanceCodeClass(day.code);

    return `
      <button
        type="button"
        class="ts-calendar-day ${statusClass} ${isSelected ? "is-selected" : ""} ${isToday ? "is-today" : ""}"
        data-ts-select-date="${escapeHtml(day.date)}"
        aria-label="${WEEKDAYS[day.weekday]}, ngày ${formatShortDate(day.date)}, ${attendanceCodeLabel(day.code)}"
        aria-pressed="${isSelected}"
      >
        <span class="ts-calendar-weekday">
          ${WEEKDAYS[day.weekday]}
        </span>

        <strong class="ts-calendar-date">
          ${formatShortDate(day.date)}
        </strong>

        <span class="ts-calendar-status">
          ${day.code ? escapeHtml(day.code) : "—"}
        </span>
      </button>
    `;
  }).join("");

  return `
    <div class="ts-calendar">
      ${leadingSpaces}
      ${dayCards}
    </div>
  `;
}

// ============================================
// HÀNG CHỈNH SỬA CHẤM CÔNG
// ============================================

function renderAttendanceEditor(days, canEdit) {
  if (!days.length) return "";

  let selectedDay = getSelectedDay(days);

  if (!selectedDay) {
    selectedAttendanceDate = days[0].date;
    selectedDay = days[0];
  }

  const dateOptions = days.map(day => `
    <option
      value="${escapeHtml(day.date)}"
      ${day.date === selectedAttendanceDate ? "selected" : ""}
    >
      ${formatShortDate(day.date)}
    </option>
  `).join("");

  const statusOptions = ATTENDANCE_CODES.map(item => `
    <option
      value="${escapeHtml(item.value)}"
      ${selectedDay.code === item.value ? "selected" : ""}
    >
      ${escapeHtml(item.label)}
    </option>
  `).join("");

  return `
    <div class="ts-editor">
      <div class="ts-editor-title">
        <strong>Chỉnh sửa chấm công</strong>
        <small>Chọn ngày và cập nhật trạng thái tương ứng.</small>
      </div>

      <div class="ts-editor-row">
        <div class="ts-editor-field">
          <label>Ngày chấm công</label>
          <select data-ts-editor-date aria-label="Chọn ngày chấm công">
            ${dateOptions}
          </select>
        </div>

        <div class="ts-editor-field">
          <label>Thứ</label>
          <input
            type="text"
            value="${WEEKDAYS[selectedDay.weekday]}"
            readonly
            aria-label="Thứ trong tuần"
          >
        </div>

        <div class="ts-editor-field ts-editor-status">
          <label>Trạng thái</label>
          ${
            canEdit
              ? `
                <select
                  data-ts-editor-code
                  aria-label="Trạng thái chấm công"
                >
                  ${statusOptions}
                </select>
              `
              : `
                <div class="ts-readonly-status ${attendanceCodeClass(selectedDay.code)}">
                  ${escapeHtml(attendanceCodeLabel(selectedDay.code))}
                </div>
              `
          }
        </div>
      </div>

      ${
        canEdit
          ? `<p class="ts-editor-note">Thay đổi trạng thái sẽ được lưu trực tiếp vào dữ liệu chấm công.</p>`
          : `<p class="ts-editor-note">Bạn chỉ có quyền xem chấm công của sinh viên này.</p>`
      }
    </div>
  `;
}

// ============================================
// KHU VỰC CHI TIẾT CHẤM CÔNG
// ============================================

function renderTimesheetDetail(ticket) {
  const panel = document.getElementById("timesheetDetail");
  if (!panel) return;

  if (!ticket || ticket.id !== expandedTicketId) {
    panel.innerHTML = "";
    panel.hidden = true;
    return;
  }

  const days = DemoStore.attendanceDays(ticket.id);
  const canEdit = DemoStore.permissionsFor(ticket, actorInfo()).attendance;

  if (!days.some(day => day.date === selectedAttendanceDate)) {
    selectedAttendanceDate = days[0]?.date || "";
  }

  const selectedDay = getSelectedDay(days);

  const counts = {
    o: days.filter(day => day.code === "o").length,
    v: days.filter(day => day.code === "v").length,
    Off: days.filter(day => day.code === "Off").length
  };

  panel.hidden = false;

  panel.innerHTML = `
    <div class="ts-detail-header">
      <div>
        <span class="ts-detail-eyebrow">CHI TIẾT CHẤM CÔNG</span>
        <h3>${escapeHtml(ticket.internName)}</h3>
        <p>
          ${escapeHtml(ticket.internId)}
          <span>·</span>
          ${escapeHtml(ticket.department || "Chưa phân bộ phận")}
        </p>
      </div>

      <button
        type="button"
        class="btn btn-secondary btn-sm"
        data-ts-close-detail
      >
        Đóng chi tiết
      </button>
    </div>

    <div class="ts-detail-summary">
      <div class="ts-summary-item">
        <span>Đi làm</span>
        <strong>${counts.o}</strong>
      </div>

      <div class="ts-summary-item">
        <span>Vắng</span>
        <strong>${counts.v}</strong>
      </div>

      <div class="ts-summary-item">
        <span>Off</span>
        <strong>${counts.Off}</strong>
      </div>

      <div class="ts-summary-item">
        <span>Đã ghi</span>
        <strong>${days.filter(day => day.recorded).length}/${days.length}</strong>
      </div>
    </div>

    <div class="ts-detail-section">
      <div class="ts-section-heading">
        <div>
          <h4>Lịch chấm công</h4>
          <p>Chọn một ngày để xem hoặc cập nhật trạng thái.</p>
        </div>
      </div>

      ${renderAttendanceCalendar(days)}
    </div>

    ${renderAttendanceEditor(days, canEdit)}

    ${
      selectedDay
        ? `
          <div class="ts-selected-info">
            Ngày đang chọn:
            <strong>${WEEKDAYS[selectedDay.weekday]}, ${formatShortDate(selectedDay.date)}</strong>
            <span>·</span>
            Trạng thái:
            <strong>${escapeHtml(attendanceCodeLabel(selectedDay.code))}</strong>
          </div>
        `
        : ""
    }
  `;
}

// ============================================
// RENDER BẢNG TỔNG HỢP
// ============================================

export function fillTimesheetRows() {
  const body = document.getElementById("timesheetBody");
  if (!body) return;

  const q = state.timesheet.q.trim().toLowerCase();

  const rows = timesheetRows(actorInfo(), state.timesheet.periodId)
    .filter(row =>
      !q ||
      `${row.ticket.internId} ${row.ticket.internName}`
        .toLowerCase()
        .includes(q)
    );

  body.innerHTML = rows.length
    ? rows.map(row => `
        <tr>
          <td>
            ${escapeHtml(row.ticket.internName)}
            <br>
            <small>${escapeHtml(row.ticket.internId)}</small>
          </td>

          <td>${escapeHtml(row.ticket.department)}</td>

          <td class="r">${row.counts.o}</td>
          <td class="r">${row.counts.v}</td>
          <td class="r">${row.counts.Off}</td>
          <td class="r">${row.recorded}/${row.total}</td>

          <td>${timesheetTodayCell(row)}</td>

          <td>
            <button
              type="button"
              class="btn btn-secondary btn-sm"
              data-ts-detail="${escapeHtml(row.ticket.id)}"
            >
              ${expandedTicketId === row.ticket.id ? "Đang mở" : "Chi tiết"}
            </button>
          </td>
        </tr>
      `).join("")
    : `
      <tr class="empty-state">
        <td colspan="8">Chưa có phiếu nào trong kỳ này</td>
      </tr>
    `;

  const expandedRow = rows.find(
    row => row.ticket.id === expandedTicketId
  );

  renderTimesheetDetail(expandedRow?.ticket || null);
}

// ============================================
// XỬ LÝ SỰ KIỆN
// ============================================

function bindTimesheetEvents(root) {
  if (root.dataset.bound) return;

  root.dataset.bound = "1";

  // Tìm kiếm sinh viên
  root.addEventListener("input", event => {
    const target = event.target;

    if (!target.matches("[data-ts-q]")) return;

    state.timesheet.q = target.value;
    fillTimesheetRows();
  });

  // Thay đổi kỳ hoặc trạng thái chấm công
  root.addEventListener("change", event => {
    const target = event.target;

    if (target.matches("[data-ts-period]")) {
      state.timesheet.periodId = target.value;

      expandedTicketId = null;
      selectedAttendanceDate = "";

      fillTimesheetRows();
      return;
    }

    if (target.matches("[data-ts-day]")) {
      saveAttendance(
        target.dataset.ticket,
        target.dataset.date,
        target.value
      );
      return;
    }

    if (target.matches("[data-ts-editor-date]")) {
      selectedAttendanceDate = target.value;

      const ticket = getExpandedTicket();

      if (ticket) {
        renderTimesheetDetail(ticket);
      }

      return;
    }

    if (target.matches("[data-ts-editor-code]")) {
      saveAttendance(
        expandedTicketId,
        selectedAttendanceDate,
        target.value
      );
    }
  });

  // Click chi tiết, chọn ngày hoặc đóng chi tiết
  root.addEventListener("click", event => {
    const target = event.target;

    const detailButton = target.closest("[data-ts-detail]");
    if (detailButton) {
      const ticketId = detailButton.dataset.tsDetail;

      if (expandedTicketId === ticketId) {
        expandedTicketId = null;
        selectedAttendanceDate = "";
      } else {
        expandedTicketId = ticketId;

        const days = DemoStore.attendanceDays(ticketId);
        selectedAttendanceDate = days[0]?.date || "";
      }

      fillTimesheetRows();
      return;
    }

    const dateButton = target.closest("[data-ts-select-date]");
    if (dateButton) {
      selectedAttendanceDate = dateButton.dataset.tsSelectDate;

      const ticket = getExpandedTicket();

      if (ticket) {
        renderTimesheetDetail(ticket);
      }

      return;
    }

    if (target.closest("[data-ts-close-detail]")) {
      expandedTicketId = null;
      selectedAttendanceDate = "";
      fillTimesheetRows();
    }
  });
}

// ============================================
// LẤY PHIẾU ĐANG MỞ CHI TIẾT
// ============================================

function getExpandedTicket() {
  if (!expandedTicketId) return null;

  return DemoStore.listTickets(
    actorInfo(),
    state.timesheet.periodId
  ).find(ticket => ticket.id === expandedTicketId) || null;
}

// ============================================
// LƯU CHẤM CÔNG
// ============================================

function saveAttendance(ticketId, date, code) {
  if (!ticketId || !date) return;

  const result = DemoStore.setAttendance(
    ticketId,
    actorInfo(),
    date,
    code
  );

  if (!result.ok) {
    showMessage("error", "❌ " + result.error);
  } else {
    showMessage("success", "Đã cập nhật chấm công.");
  }

  fillTimesheetRows();
}

// ============================================
// RENDER MODULE CHẤM CÔNG
// ============================================

export function renderTimesheetView() {
  const root = document.getElementById("timesheetRoot");
  if (!root) return;

  state.timesheet.periodId = resolvePeriodId(
    state.timesheet.periodId
  );

  bindTimesheetEvents(root);

  root.innerHTML = `
    <h2 class="ts-page-title">Chấm công</h2>

    <p class="ts-page-description">
      Theo dõi và quản lý tình trạng chấm công của sinh viên thực tập
      theo từng kỳ. Ký hiệu: o = đi làm, v = vắng, Off = nghỉ.
    </p>

    <div class="assign-toolbar">
      <select
        data-ts-period
        aria-label="Chọn kỳ chấm công"
      >
        ${periodOptions(state.timesheet.periodId)}
      </select>

      <input
        type="search"
        class="search-input"
        data-ts-q
        placeholder="Tìm theo tên hoặc mã SV"
        value="${escapeHtml(state.timesheet.q)}"
      >
    </div>

    <div class="table-wrap">
      <table class="assign-table">
        <thead>
          <tr>
            <th>Sinh viên</th>
            <th>Bộ phận</th>
            <th class="r">Đi làm</th>
            <th class="r">Vắng</th>
            <th class="r">Off</th>
            <th class="r">Đã ghi</th>
            <th>Hôm nay</th>
            <th></th>
          </tr>
        </thead>

        <tbody id="timesheetBody"></tbody>
      </table>
    </div>

    <section
      id="timesheetDetail"
      class="ts-detail-panel"
      hidden
    ></section>
  `;

  fillTimesheetRows();
}
