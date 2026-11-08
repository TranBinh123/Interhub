
// ============================================
// modules/timesheet.js
// Chấm công: tổng hợp theo kỳ và quản lý chi tiết từng ngày.
// ============================================

import { showMessage } from "../components/messages.js";
import { DemoStore, STATUS_LABEL } from "../db.js";
import { state } from "../state.js";
import {
  actorInfo,
  escapeHtml,
  isHR
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
  { value: "X", label: "X · Đi làm" },
  { value: "X/2", label: "X/2 · Nửa buổi (0,5 công)" },
  { value: "O", label: "O · Ngày off" },
  { value: "V", label: "V · Vắng" }
];

function attendanceCodeLabel(code) {
  const item = ATTENDANCE_CODES.find(x => x.value === code);
  return item ? item.label : "Chưa chấm";
}

function attendanceCodeClass(code) {
  if (code === "X") return "ts-status-work";
  if (code === "X/2") return "ts-status-half";
  if (code === "V") return "ts-status-absent";
  if (code === "O") return "ts-status-off";
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

// Tháng của kỳ theo mã kỳ "EV-YYYY-MM"; không có kỳ nào thì dùng kỳ hiện tại theo ngày hôm nay
function monthOfPeriodId(periodId) {
  return String(periodId || "").startsWith("EV-")
    ? periodId.slice(3)
    : DemoStore.periodMonthOf(DemoStore.todayIso());
}

// Danh sách chấm công lấy từ SVTT, nên hiển thị cả khi chưa có kỳ đánh giá nào mở
export function timesheetRows(actor, periodId) {
  const today = DemoStore.todayIso();
  const month = monthOfPeriodId(periodId);

  return DemoStore.timesheetInterns(actor, month).map(({ intern, ticket, days, canEdit }) => {
    const counts = {
      X: 0,
      "X/2": 0,
      O: 0,
      V: 0
    };

    days.forEach(day => {
      if (counts[day.code] !== undefined) {
        counts[day.code] += 1;
      }
    });

    return {
      // "ticket" giữ tên cũ để các phần giao diện dùng chung; id chính là mã SVTT
      ticket: {
        id: intern.internId,
        internId: intern.internId,
        internName: intern.fullName,
        department: intern.department,
        status: ticket ? ticket.status : "",
        ticketId: ticket ? ticket.id : ""
      },
      counts,
      workDays: counts.X + counts["X/2"] * 0.5,
      total: days.length,
      recorded: days.filter(day => day.recorded).length,
      today: days.find(day => day.date === today) || null,
      canEdit
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

// Nút "⋯" ở góc ô ngày; bấm vào mở bảng thả xuống chọn ký hiệu
let openQuickMenu = ""; // dạng "mãPhiếu|ngày" của bảng đang mở

function renderQuickMenu(day, ticketId) {
  const key = `${ticketId}|${day.date}`;
  const isOpen = openQuickMenu === key;
  const options = ATTENDANCE_CODES.filter(item => item.value).map(item => `
    <button
      type="button"
      class="ts-code-option ${day.code === item.value ? "is-on" : ""}"
      data-ts-quick-code="${escapeHtml(item.value)}"
      data-ticket="${escapeHtml(ticketId)}"
      data-date="${escapeHtml(day.date)}"
    >${escapeHtml(item.label)}</button>`).join("");
  return `
    <button
      type="button"
      class="ts-menu-toggle"
      data-ts-menu-toggle="${escapeHtml(key)}"
      aria-label="Chọn ký hiệu cho ngày ${escapeHtml(formatShortDate(day.date))}"
      aria-expanded="${isOpen}"
    >⋯</button>
    ${isOpen ? `
      <div class="ts-code-menu" role="menu">
        ${options}
        <button
          type="button"
          class="ts-code-option ts-code-clear"
          data-ts-quick-code=""
          data-ticket="${escapeHtml(ticketId)}"
          data-date="${escapeHtml(day.date)}"
        >Xóa ký hiệu</button>
      </div>` : ""}`;
}

function renderAttendanceCalendar(days, ticketId = "", canEdit = false) {
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
      <div class="ts-calendar-day ${statusClass} ${isSelected ? "is-selected" : ""} ${isToday ? "is-today" : ""}">
        <button
          type="button"
          class="ts-calendar-main"
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
        ${canEdit && ticketId ? renderQuickMenu(day, ticketId) : ""}
      </div>
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

  const days = DemoStore.internAttendanceDays(ticket.id, monthOfPeriodId(state.timesheet.periodId));
  const canEdit = DemoStore.internAttendanceAllowed(ticket.id, actorInfo());

  if (!days.some(day => day.date === selectedAttendanceDate)) {
    selectedAttendanceDate = days[0]?.date || "";
  }

  const selectedDay = getSelectedDay(days);

  const counts = {
    X: days.filter(day => day.code === "X").length,
    "X/2": days.filter(day => day.code === "X/2").length,
    O: days.filter(day => day.code === "O").length,
    V: days.filter(day => day.code === "V").length
  };
  const workDays = counts.X + counts["X/2"] * 0.5;

  panel.hidden = false;

  panel.innerHTML = `
    <div class="ts-detail-box" role="dialog" aria-modal="true" aria-label="Chi tiết chấm công">
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
        <span>Ngày công</span>
        <strong>${workDays}</strong>
      </div>

      <div class="ts-summary-item">
        <span>X · Đi làm</span>
        <strong>${counts.X}</strong>
      </div>

      <div class="ts-summary-item">
        <span>X/2 · Nửa buổi</span>
        <strong>${counts["X/2"]}</strong>
      </div>

      <div class="ts-summary-item">
        <span>V · Vắng</span>
        <strong>${counts.V}</strong>
      </div>

      <div class="ts-summary-item">
        <span>O · Off</span>
        <strong>${counts.O}</strong>
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

      ${renderAttendanceCalendar(days, ticket.id, canEdit)}
    </div>


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
    </div>
  `;
}

// ============================================
// RENDER BẢNG TỔNG HỢP
// ============================================

export function fillTimesheetRows() {
  const body = document.getElementById("timesheetBody");
  if (!body) return;

  const q = state.timesheet.q.trim().toLowerCase();
  const all = timesheetRows(actorInfo(), state.timesheet.periodId)
    .filter(row =>
      !q ||
      `${row.ticket.internId} ${row.ticket.internName}`
        .toLowerCase()
        .includes(q)
    )
    .filter(row => !state.timesheet.dept || row.ticket.department === state.timesheet.dept);

  const limit = state.timesheet.limit || 5;
  const rows = all.slice(0, limit);

  body.innerHTML = rows.length
    ? rows.map(row => `
        <tr>
          <td data-label="Sinh viên">
            ${escapeHtml(row.ticket.internName)}
            <br>
            <small>${escapeHtml(row.ticket.internId)}</small>
          </td>

          <td data-label="Bộ phận">${escapeHtml(row.ticket.department)}</td>
          <td data-label="Trạng thái">${row.ticket.status
            ? escapeHtml(STATUS_LABEL[row.ticket.status] || row.ticket.status)
            : "<em>Chưa có phiếu</em>"}</td>

          <td class="r" data-label="Ngày công">${row.workDays}</td>
          <td class="r" data-label="V · Vắng">${row.counts.V}</td>
          <td class="r" data-label="O · Off">${row.counts.O}</td>
          <td class="r" data-label="Đã ghi">${row.recorded}/${row.total}</td>

          <td data-label="Hôm nay">${timesheetTodayCell(row)}</td>

          <td data-label="Thao tác">
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
        <td colspan="9">Chưa có phiếu nào khớp bộ lọc</td>
      </tr>
    `;

  const more = document.getElementById("timesheetMore");
  if (more) {
    const left = all.length - rows.length;
    more.innerHTML = left > 0
      ? `<button type="button" class="btn btn-secondary btn-sm" data-ts-more>Xem thêm ${Math.min(left, 5)} (còn ${left})</button>`
      : (all.length > 5 ? `<button type="button" class="btn btn-secondary btn-sm" data-ts-less>Thu gọn</button>` : "");
  }

  const expandedRow = all.find(
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

    if (target.matches("[data-ts-dept]")) {
      state.timesheet.dept = target.value;
      state.timesheet.limit = 5;
      fillTimesheetRows();
      return;
    }

    if (target.matches("[data-ts-period]")) {
      state.timesheet.periodId = target.value;
      state.timesheet.limit = 5;

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

        const days = DemoStore.internAttendanceDays(ticketId, monthOfPeriodId(state.timesheet.periodId));
        selectedAttendanceDate = days[0]?.date || "";
      }

      fillTimesheetRows();
      return;
    }

    // Bảng chọn ký hiệu: mở/đóng bằng nút ⋯, chọn ký hiệu thì lưu ngay
    const menuToggle = target.closest("[data-ts-menu-toggle]");
    if (menuToggle) {
      const key = menuToggle.dataset.tsMenuToggle;
      openQuickMenu = openQuickMenu === key ? "" : key;
      renderTimesheetDetail(getExpandedTicket());
      return;
    }

    const quick = target.closest("[data-ts-quick-code]");
    if (quick) {
      openQuickMenu = "";
      selectedAttendanceDate = quick.dataset.date;
      saveAttendance(quick.dataset.ticket, quick.dataset.date, quick.dataset.tsQuickCode);
      return;
    }

    if (openQuickMenu && !target.closest(".ts-code-menu")) {
      openQuickMenu = "";
      renderTimesheetDetail(getExpandedTicket());
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

    if (target.closest("[data-ts-close-detail]") || target.id === "timesheetDetail") {
      expandedTicketId = null;
      selectedAttendanceDate = "";
      fillTimesheetRows();
      return;
    }

    if (target.closest("[data-ts-more]")) {
      state.timesheet.limit = (state.timesheet.limit || 5) + 5;
      fillTimesheetRows();
      return;
    }

    if (target.closest("[data-ts-less]")) {
      state.timesheet.limit = 5;
      fillTimesheetRows();
    }
  });

  // Esc đóng cửa sổ chi tiết
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape" || !expandedTicketId) return;
    expandedTicketId = null;
    selectedAttendanceDate = "";
    fillTimesheetRows();
  });
}

// ============================================
// LẤY PHIẾU ĐANG MỞ CHI TIẾT
// ============================================

function getExpandedTicket() {
  if (!expandedTicketId) return null;

  return timesheetRows(actorInfo(), state.timesheet.periodId)
    .map(row => row.ticket)
    .find(ticket => ticket.id === expandedTicketId) || null;
}

// ============================================
// LƯU CHẤM CÔNG
// ============================================

function saveAttendance(ticketId, date, code) {
  if (!ticketId || !date) return;

  const result = DemoStore.setInternAttendance(
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

// Danh sách kỳ; luôn có kỳ hiện tại, kể cả khi chưa mở đánh giá
function tsPeriodOptions() {
  const current = `EV-${DemoStore.periodMonthOf(DemoStore.todayIso())}`;
  const items = new Map();
  DemoStore.listPeriods().forEach(p => items.set(p.id, p.name || p.id));
  if (!items.has(current)) {
    const m = current.slice(3);
    items.set(current, `Kỳ ${m.slice(5)}/${m.slice(0, 4)} (chưa mở đánh giá)`);
  }
  return [...items.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([id, label]) => `<option value="${escapeHtml(id)}" ${id === state.timesheet.periodId ? "selected" : ""}>${escapeHtml(label)}</option>`)
    .join("");
}

export function renderTimesheetView() {
  const root = document.getElementById("timesheetRoot");
  if (!root) return;

  if (!state.timesheet.periodId) {
    state.timesheet.periodId = `EV-${DemoStore.periodMonthOf(DemoStore.todayIso())}`;
  }

  bindTimesheetEvents(root);

  root.innerHTML = `
    <h2 class="ts-page-title">Chấm công</h2>

    ${isHR() ? "" : `
    <p class="ts-page-description">
      Theo dõi và quản lý tình trạng chấm công của sinh viên thực tập
      theo từng kỳ. Ký hiệu: o = đi làm, v = vắng, Off = nghỉ.
    </p>`}

    <div class="assign-toolbar">
      <select
        data-ts-period
        aria-label="Chọn kỳ chấm công"
      >
        ${tsPeriodOptions()}
      </select>

      ${isHR() ? `<select
        data-ts-dept
        aria-label="Lọc theo bộ phận"
      >
        <option value="">Tất cả bộ phận</option>
        ${DemoStore.listDepartments().map(d => `<option value="${escapeHtml(d.code)}" ${state.timesheet.dept === d.code ? "selected" : ""}>${escapeHtml(d.code)} — ${escapeHtml(d.name)}</option>`).join("")}
      </select>` : ""}

      <input
        type="search"
        class="search-input"
        data-ts-q
        placeholder="Tìm theo tên hoặc mã SV"
        value="${escapeHtml(state.timesheet.q)}"
      >
    </div>

    <div class="table-wrap">
      <table class="assign-table table-cards">
        <thead>
          <tr>
            <th>Sinh viên</th>
            <th>Bộ phận</th>
            <th>Trạng thái</th>
            <th class="r">Ngày công</th>
            <th class="r">V · Vắng</th>
            <th class="r">O · Off</th>
            <th class="r">Đã ghi</th>
            <th>Hôm nay</th>
            <th></th>
          </tr>
        </thead>

        <tbody id="timesheetBody"></tbody>
      </table>
    </div>

    <div class="more-row" id="timesheetMore"></div>

    <section
      id="timesheetDetail"
      class="ts-detail-panel"
      hidden
    ></section>
  `;

  fillTimesheetRows();
}
