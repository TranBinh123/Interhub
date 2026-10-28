
 // ============================================
 // InternHub Admin Panel
 // Tương thích API hiện có trong JS/auth.js và JS/db.js
 // ============================================

import { getFirestore, collection, getDocs } from
  "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

import { Auth } from "./auth.js";
import { Database } from "./db.js";
import { DemoStore, INTERN_COLUMNS, MEMBER_ROLES } from "./demo-store.js";
import { COLLECTIONS, ROLES, USER_STATUS } from "./firebase-config.js";

const ADMIN_EMAIL = "dptbinh193@gmail.com";
const firestore = getFirestore();

// Chỉ hai vai trò này được phép gán khi duyệt tài khoản.
const ASSIGNABLE_ROLES = {
  [ROLES.HR]: "Phòng Nhân sự",
  [ROLES.SUPERVISOR]: "Trưởng bộ phận",
  [ROLES.MENTOR]: "Người hướng dẫn"
};

// Nhãn hiển thị, bao gồm cả các vai trò cũ nếu có trong dữ liệu.
const ROLE_LABELS = {
  [ROLES.ADMIN]: "Quản trị hệ thống",
  [ROLES.HR]: "Phòng Nhân sự",
  [ROLES.SUPERVISOR]: "Trưởng bộ phận",
  [ROLES.MENTOR]: "Người hướng dẫn",
  [ROLES.INTERN]: "Sinh viên thực tập",
  [ROLES.USER]: "Người dùng"
};

const STATUS_LABELS = {
  [USER_STATUS.PENDING]: "Chờ duyệt",
  [USER_STATUS.APPROVED]: "Đã duyệt",
  [USER_STATUS.REJECTED]: "Từ chối"
};

const TICKET_STATUS_LABELS = {
  chua_bat_dau: "Chưa bắt đầu",
  dang_thuc_hien: "Đang thực hiện",
  cho_xac_nhan: "Chờ Đào tạo xác nhận",
  da_chot: "Đã chốt"
};

let mountNode = null;
let currentTab = "overview";
let users = [];
let periods = [];
let departments = [];
let tickets = [];
let loading = false;
let lastImport = null;
let editingInternId = null;
let followDate = "";
let loadError = "";

const html = (value = "") => String(value).replace(/[&<>"']/g, c => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
}[c]));

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function dateText(value) {
  if (!value) return "—";

  const date = typeof value?.toDate === "function"
    ? value.toDate()
    : new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function announce(message, type = "success") {
  const target = mountNode?.querySelector("[data-admin-notice]");

  if (!target) {
    console.info(`[InternHub Admin] ${message}`);
    return;
  }

  target.textContent = message;
  target.dataset.type = type;
  target.hidden = false;
}

function departmentLabel(code) {
  const found = departments.find(item => item.code === code);
  return found ? `${found.code} — ${found.name}` : (code || "—");
}

function ensureAdmin() {
  const email = normalizeEmail(Auth.getCurrentEmail?.());

  if (email !== ADMIN_EMAIL) {
    throw new Error(
      "Bạn không có quyền truy cập bảng quản trị. Vui lòng đăng nhập bằng tài khoản Admin."
    );
  }
}

async function refreshData() {
  if (loading) return;

  try {
    ensureAdmin();
  } catch (error) {
    loadError = error.message;
    renderView();
    return;
  }

  loading = true;
  loadError = "";
  showLoading(true);

  try {
    const userSnapshot = await getDocs(collection(firestore, COLLECTIONS.USERS));

    users = userSnapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));

    // Đồng bộ tài khoản đã duyệt vào danh bạ mô phỏng (giữ vai trò Admin đã chỉnh)
    DemoStore.syncMembers(users);

    // Kỳ, SVTT và phiếu hiện là dữ liệu mô phỏng (JS/demo-store.js)
    periods = DemoStore.listPeriods();
    departments = DemoStore.listDepartments();
    tickets = DemoStore.listAllTickets();
  } catch (error) {
    console.error("[InternHub Admin] Load error", error);

    loadError =
      "Không thể tải dữ liệu. Vui lòng kiểm tra kết nối Firebase, tài khoản Admin và Firestore Rules.";
  } finally {
    loading = false;
    showLoading(false);
    renderView();
  }
}

function showLoading(isLoading) {
  const node = mountNode?.querySelector("[data-admin-loading]");
  if (node) node.hidden = !isLoading;
}

function shell() {
  mountNode.innerHTML = `
    <section class="ih-admin" aria-label="InternHub - Quản trị">
      <header class="ih-admin__header">
        <div>
          <p class="ih-admin__eyebrow">INTERNHUB / ADMIN</p>
          <h1>Quản trị hệ thống</h1>
          <p class="ih-admin__subhead">
            Quản lý tài khoản và theo dõi các kỳ đánh giá.
          </p>
        </div>
        <button type="button"
          class="ih-btn ih-btn--secondary"
          data-action="refresh">Làm mới</button>
      </header>

      <div class="ih-notice" data-admin-notice hidden role="status"></div>
      <p class="ih-loading" data-admin-loading hidden>Đang tải dữ liệu…</p>

      <nav class="ih-tabs" aria-label="Mục quản trị">
        <button type="button" data-tab="overview" class="is-active">Tổng quan</button>
        <button type="button" data-tab="users">Tài khoản</button>
        <button type="button" data-tab="interns">Sinh viên TT</button>
        <button type="button" data-tab="followup">Theo dõi</button>
        <button type="button" data-tab="periods">Kỳ đánh giá</button>
        <button type="button" data-tab="departments">Bộ phận</button>
      </nav>

      <main data-admin-view></main>
    </section>
  `;

  mountNode.querySelectorAll("[data-tab]").forEach(button => {
    button.addEventListener("click", () => {
      currentTab = button.dataset.tab;

      mountNode.querySelectorAll(".ih-tabs [data-tab]").forEach(item => {
        item.classList.toggle("is-active", item === button);
      });

      renderView();
    });
  });

  mountNode.querySelector('[data-action="refresh"]')
    .addEventListener("click", refreshData);

  // Gắn một lần trên phần tử gốc.
  mountNode.addEventListener("click", handleAction);
  mountNode.addEventListener("change", handleFileChange);
}

function card(title, count, caption) {
  return `
    <article class="ih-stat">
      <span>${html(title)}</span>
      <strong>${Number(count) || 0}</strong>
      <small>${html(caption)}</small>
    </article>
  `;
}

function renderOverview() {
  const pendingUsers = users.filter(
    user => user.status === USER_STATUS.PENDING
  ).length;

  const activePeriods = periods.filter(
    period => period.status === "Đang mở"
  ).length;

  const pendingTickets = tickets.filter(
    ticket => ticket.status === "cho_xac_nhan"
  ).length;

  const finalizedTickets = tickets.filter(
    ticket => ticket.status === "da_chot"
  ).length;

  return `
    <section class="ih-section">
      <div class="ih-stats">
        ${card("Tài khoản", users.length, "Tổng người dùng")}
        ${card("Chờ duyệt", pendingUsers, "Tài khoản cần xử lý")}
        ${card("Kỳ đang mở", activePeriods, "Kỳ đánh giá")}
        ${card("Chờ xác nhận", pendingTickets, "Phiếu gửi Đào tạo")}
        ${card("Đã chốt", finalizedTickets, "Phiếu hoàn tất")}
      </div>

      <section class="ih-panel">
        <h2>Việc cần theo dõi</h2>
        <button class="ih-link-row" data-tab="users">
          <span>${pendingUsers} tài khoản chờ duyệt</span><b>›</b>
        </button>
        <button class="ih-link-row" data-tab="periods">
          <span>${activePeriods} kỳ đang mở</span><b>›</b>
        </button>
        <div class="ih-link-row">
          <span>${pendingTickets} phiếu chờ Đào tạo xác nhận</span>
        </div>
      </section>
    </section>
  `;
}

function renderUsers() {
  const selected =
    mountNode.querySelector("[data-user-status-filter]")?.value || "all";

  const rows = users.filter(user =>
    selected === "all" ||
    (user.status || USER_STATUS.PENDING) === selected
  );

  return `
    <section class="ih-section">
      <div class="ih-section__heading">
        <div>
          <h2>Tài khoản người dùng</h2>
          <p>Duyệt tài khoản và phân vai trò.</p>
        </div>

        <label>
          Trạng thái
          <select data-user-status-filter>
            ${[
              ["all", "Tất cả"],
              [USER_STATUS.PENDING, "Chờ duyệt"],
              [USER_STATUS.APPROVED, "Đã duyệt"],
              [USER_STATUS.REJECTED, "Từ chối"]
            ].map(([value, label]) => `
              <option value="${html(value)}"
                ${selected === value ? "selected" : ""}>
                ${html(label)}
              </option>
            `).join("")}
          </select>
        </label>
      </div>

      <div class="ih-table-wrap">
        <table class="ih-table">
          <thead>
            <tr>
              <th>Họ tên / Email</th>
              <th>Bộ phận</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length
              ? rows.map(userRow).join("")
              : `<tr><td colspan="6" class="ih-empty">
                   Không có tài khoản phù hợp.
                 </td></tr>`
            }
          </tbody>
        </table>
      </div>
    </section>
  `;
}

// Ô chọn bộ phận: chỉ liệt kê bộ phận có trong danh mục Admin đã tạo
function deptSelectHtml(selectedCode, attrs, allowEmpty) {
  const options = departments
    .map(d => `<option value="${html(d.code)}" ${selectedCode === d.code ? "selected" : ""}>${html(d.code)} — ${html(d.name)}</option>`)
    .join("");
  return `
    <select ${attrs}>
      <option value="">${allowEmpty ? "— Không thuộc bộ phận —" : "— Chọn bộ phận —"}</option>
      ${options}
    </select>`;
}

function userRow(user) {
  const status = user.status || USER_STATUS.PENDING;
  const deleteButton = `
        <button type="button" class="ih-btn ih-btn--danger"
          data-action="delete-user" data-user-id="${html(user.id)}">Xóa tài khoản</button>`;
  const id = html(user.id);
  const member = DemoStore.getMember(user.id);
  const role = member?.role || user.role;
  const deptCode = member ? member.department : user.department;
  const noDepartments = departments.length === 0
    ? `<small>Chưa có bộ phận nào. Hãy tạo ở tab "Bộ phận" trước.</small>`
    : "";

  let controls = "—";

  if (status === USER_STATUS.PENDING) {
    const roleOptions = Object.entries(ASSIGNABLE_ROLES)
      .map(([value, label]) => `<option value="${html(value)}">${html(label)}</option>`)
      .join("");
    controls = `
      <div class="ih-actions">
        <select aria-label="Vai trò cần gán" data-role-for="${id}">
          <option value="">Chọn vai trò</option>
          ${roleOptions}
        </select>
        <span data-dept-wrap-for="${id}">${deptSelectHtml("", `aria-label="Bộ phận" data-dept-for="${id}"`, true)}</span>
        <button type="button" class="ih-btn ih-btn--primary"
          data-action="approve" data-user-id="${id}">Duyệt</button>
        <button type="button" class="ih-btn ih-btn--danger"
          data-action="reject" data-user-id="${id}">Từ chối</button>
        ${deleteButton}
      </div>
      ${noDepartments}`;
  } else if (status === USER_STATUS.APPROVED && member) {
    const roleOptions = Object.entries(MEMBER_ROLES)
      .map(([value, label]) => `<option value="${html(value)}" ${role === value ? "selected" : ""}>${html(label)}</option>`)
      .join("");
    controls = `
      <div class="ih-actions">
        <select aria-label="Vai trò" data-member-role-for="${id}">${roleOptions}</select>
        <span data-dept-wrap-for="${id}" ${role === ROLES.HR ? "hidden" : ""}>${deptSelectHtml(deptCode, `aria-label="Bộ phận" data-member-dept-for="${id}"`, true)}</span>
        <button type="button" class="ih-btn ih-btn--secondary"
          data-action="save-member" data-user-id="${id}">Lưu</button>
        ${deleteButton}
      </div>
      ${noDepartments}`;
  }

  return `
    <tr>
      <td>
        <strong>${html(user.fullName || "Chưa cập nhật")}</strong>
        <small>${html(user.email || "")}</small>
      </td>
      <td>${role === ROLES.HR ? "—" : html(departmentLabel(deptCode))}</td>
      <td>${html(ROLE_LABELS[role] || "Chưa gán")}</td>
      <td>
        <span class="ih-status ih-status--${html(status)}">
          ${html(STATUS_LABELS[status] || status)}
        </span>
      </td>
      <td>${dateText(user.createdAt)}</td>
      <td>${controls}</td>
    </tr>
  `;
}

function renderPeriods() {
  return `
    <section class="ih-section">
      <div class="ih-section__heading">
        <div>
          <h2>Kỳ đánh giá</h2>
          <p>Tạo kỳ theo tháng, rồi tạo phiếu cho toàn bộ SVTT trong danh sách. Phiếu đã có sẽ không bị tạo trùng.</p>
        </div>
      </div>

      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:16px;">
        <label>Tháng<br>
          <input type="month" name="month" required>
        </label>
        <label>Tên kỳ (không bắt buộc)<br>
          <input type="text" name="name" placeholder="Ví dụ: Đánh giá tháng 11">
        </label>
        <button type="button" class="ih-btn ih-btn--primary" data-action="create-period">Tạo kỳ</button>
      </div>

      <div class="ih-table-wrap">
        <table class="ih-table">
          <thead>
            <tr>
              <th>Tên kỳ</th>
              <th>Trạng thái</th>
              <th>Tổng phiếu</th>
              <th>Chờ xác nhận</th>
              <th>Đã chốt</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            ${periods.length
              ? periods.map(period => {
                  const periodTickets = tickets.filter(t => t.periodId === period.id);
                  const groups = DemoStore.classifyInterns(period.id);
                  const internCount = groups.eligible.length;
                  return `
                    <tr>
                      <td>
                        <strong>${html(period.name || period.id)}</strong>
                        <small>${html(period.id)}</small>
                      </td>
                      <td>${period.status === "dang_mo" ? "Đang mở" : html(period.status || "—")}</td>
                      <td>${periodTickets.length}</td>
                      <td>${periodTickets.filter(t => t.status === "cho_xac_nhan").length}</td>
                      <td>${periodTickets.filter(t => t.status === "da_chot").length}</td>
                      <td>
                        <button type="button" class="ih-btn ih-btn--secondary"
                          data-action="generate-tickets"
                          data-period-id="${html(period.id)}">
                          Đồng bộ phiếu
                        </button>
                        <small>
                          ${internCount} SVTT thuộc kỳ · ${groups.early} kết thúc sớm · ${groups.startMid} bắt đầu giữa tháng<br>
                          ${groups.outside.length} ngoài tháng · ${groups.noDates.length} thiếu ngày
                        </small>
                      </td>
                    </tr>
                  `;
                }).join("")
              : `<tr><td colspan="6" class="ih-empty">
                   Chưa có kỳ đánh giá. Hãy tạo kỳ ở trên.
                 </td></tr>`
            }
          </tbody>
        </table>
      </div>
      ${DemoStore.listInterns().length ? "" : `<p class="ih-empty">Chưa có danh sách SVTT. Nhập ở tab "Sinh viên TT" trước khi tạo phiếu.</p>`}
    </section>
  `;
}

function importResultHtml() {
  if (!lastImport) return "";
  const errorItems = lastImport.errors.slice(0, 20)
    .map(e => `<li>Dòng ${e.line}: ${html(e.message)}</li>`).join("");
  return `
    <div class="ih-notice" style="margin-top:12px;">
      Lần nhập gần nhất: ${lastImport.added} SVTT mới, ${lastImport.skipped} đã có (giữ nguyên),
      ${lastImport.errors.length} dòng lỗi (không nhập).
      ${errorItems ? `<ul>${errorItems}</ul>` : ""}
    </div>`;
}

function renderInterns() {
  const interns = DemoStore.listInterns();
  const edit = editingInternId ? interns.find(i => i.internId === editingInternId) : null;
  const v = field => html(edit?.[field] ?? "");

  const deptOptions = departments
    .map(d => `<option value="${html(d.code)}" ${edit?.department === d.code ? "selected" : ""}>${html(d.code)} — ${html(d.name)}</option>`)
    .join("");

  const followMap = new Map(DemoStore.followUp(followDate || DemoStore.todayIso()).map(r => [r.internId, r]));
  const rows = interns.map(i => `
      <tr>
        <td>${html(i.internId)}</td>
        <td>${html(i.fullName)}</td>
        <td>${html(i.school || "—")}</td>
        <td>${html(departmentLabel(i.department))}</td>
        <td>${html(i.startDate || "—")} → ${html(i.endDate || "—")}</td>
        <td>${followMap.get(i.internId)?.leavingSoon ? `<span class="ih-status ih-status--pending">Sắp về</span>` : "—"}</td>
        <td class="ih-actions">
          <button type="button" class="ih-btn ih-btn--secondary"
            data-action="edit-intern" data-intern-id="${html(i.internId)}">Sửa</button>
          <button type="button" class="ih-btn ih-btn--danger"
            data-action="delete-intern" data-intern-id="${html(i.internId)}">Xóa</button>
        </td>
      </tr>`).join("");

  return `
    <section class="ih-section">
      <div class="ih-section__heading">
        <div>
          <h2>Sinh viên thực tập</h2>
          <p>Nhập từ CSV (Excel: Save As → CSV UTF-8) hoặc thêm, sửa, xóa thủ công. Bộ phận phải có trong danh mục.</p>
        </div>
      </div>

      <p><strong>${interns.length}</strong> SVTT · ${departments.length} bộ phận trong danh mục</p>
      <p>Cột CSV: ${INTERN_COLUMNS.map(html).join(", ")}. Bắt buộc: Mã SV, Họ tên, Bộ phận.
         Dòng lỗi không được nhập; SVTT trùng Mã SV được giữ nguyên.</p>

      <div style="margin:12px 0;">
        <input type="file" accept=".csv,text/csv" data-import-file>
      </div>
      ${importResultHtml()}

      <div style="display:flex;gap:8px;flex-wrap:wrap;margin:16px 0;">
        <button type="button" class="ih-btn ih-btn--secondary" data-action="load-sample">Nạp dữ liệu mẫu (520 SVTT)</button>
        <button type="button" class="ih-btn ih-btn--secondary" data-action="reset-demo">Xóa toàn bộ dữ liệu mô phỏng</button>
      </div>

      <div data-intern-form style="border:1px solid #d6dde5;border-radius:8px;padding:12px;margin-bottom:16px;">
        <h3 style="margin-top:0;">${edit ? `Sửa SVTT ${html(edit.internId)}` : "Thêm SVTT thủ công"}</h3>
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;">
          <label>Mã SV<br>
            <input type="text" name="internId" value="${v("internId")}" ${edit ? "readonly" : ""}>
          </label>
          <label>Họ tên<br>
            <input type="text" name="fullName" value="${v("fullName")}">
          </label>
          <label>Trường<br>
            <input type="text" name="school" value="${v("school")}">
          </label>
          <label>Bộ phận<br>
            <select name="department">
              <option value="">— Chọn bộ phận —</option>
              ${deptOptions}
            </select>
          </label>
          <label>Ngày bắt đầu<br>
            <input type="date" name="startDate" value="${v("startDate")}">
          </label>
          <label>Ngày kết thúc<br>
            <input type="date" name="endDate" value="${v("endDate")}">
          </label>
          <button type="button" class="ih-btn ih-btn--primary" data-action="submit-intern">
            ${edit ? "Lưu thay đổi" : "Thêm SVTT"}
          </button>
          ${edit ? `<button type="button" class="ih-btn ih-btn--secondary" data-action="cancel-intern-edit">Hủy sửa</button>` : ""}
        </div>
      </div>

      ${interns.length ? `
      <div class="ih-table-wrap">
        <table class="ih-table">
          <thead>
            <tr><th>Mã SV</th><th>Họ tên</th><th>Trường</th><th>Bộ phận</th><th>Thời gian thực tập</th><th>Sắp về</th><th>Thao tác</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>` : `<p class="ih-empty">Chưa có SVTT nào.</p>`}
    </section>
  `;
}

function followBanner() {
  const alerts = DemoStore.followUp(DemoStore.todayIso()).filter(r => r.level === "alert");
  if (!alerts.length) return "";
  return `
    <div class="ih-error" style="margin-bottom:16px;">
      Có <strong>${alerts.length}</strong> SVTT cần tạo phiếu hoặc đã về chưa có phiếu.
      <button type="button" data-tab="followup">Xem theo dõi</button>
    </div>`;
}

function renderFollowUp() {
  const date = followDate || DemoStore.todayIso();
  const rows = DemoStore.followUp(date);
  const alerts = rows.filter(r => r.level === "alert");
  const soon = rows.filter(r => r.leavingSoon);

  const body = rows.length
    ? rows.map(r => `
        <tr>
          <td><strong>${html(r.internName)}</strong><small>${html(r.internId)}</small></td>
          <td>${html(departmentLabel(r.department))}</td>
          <td>${html(r.endDate.split("-").reverse().join("/"))}</td>
          <td>${r.daysLeft < 0 ? `Đã về ${-r.daysLeft} ngày trước` : `còn ${r.daysLeft} ngày`}</td>
          <td>${r.leavingSoon ? `<span class="ih-status ih-status--pending">Sắp về</span>` : "—"}</td>
          <td>${r.hasTicket ? "Đã có phiếu" : "Chưa có phiếu"}</td>
          <td class="${r.level === "alert" ? "ih-error" : ""}">${html(r.message)}</td>
        </tr>`).join("")
    : `<tr><td colspan="7" class="ih-empty">Không có SVTT cần theo dõi vào ngày này.</td></tr>`;

  return `
    <section class="ih-section">
      <div class="ih-section__heading">
        <div>
          <h2>Theo dõi SVTT sắp về</h2>
          <p>Cảnh báo bắt đầu trước ngày về ${DemoStore.FOLLOW_UP_DAYS} ngày theo lịch (kể cả thứ 7, chủ nhật) để kịp tạo phiếu đánh giá cho kỳ có ngày về.</p>
        </div>
      </div>

      <label>Ngày kiểm tra<br>
        <input type="date" value="${html(date)}" data-follow-date>
      </label>

      <div class="ih-notice" style="margin:12px 0;">
        <strong>${alerts.length}</strong> cần làm ngay ·
        <strong>${soon.length}</strong> sắp về trong ${DemoStore.FOLLOW_UP_DAYS} ngày
      </div>

      <div class="ih-table-wrap">
        <table class="ih-table">
          <thead>
            <tr>
              <th>SVTT</th><th>Bộ phận</th><th>Ngày về</th><th>Thời gian</th>
              <th>Sắp về</th><th>Phiếu</th><th>Cảnh báo</th>
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    </section>`;
}

function renderDepartments() {
  const interns = DemoStore.listInterns();
  const members = DemoStore.listMembers();

  const rows = departments.map(d => {
    const internCount = interns.filter(i => i.department === d.code).length;
    const memberCount = members.filter(m => m.department === d.code).length;
    return `
      <tr>
        <td><strong>${html(d.code)}</strong></td>
        <td>${html(d.name)}</td>
        <td>${internCount}</td>
        <td>${memberCount}</td>
        <td>
          <button type="button" class="ih-btn ih-btn--danger"
            data-action="delete-department" data-code="${html(d.code)}">Xóa</button>
        </td>
      </tr>`;
  }).join("");

  return `
    <section class="ih-section">
      <div class="ih-section__heading">
        <div>
          <h2>Danh mục bộ phận</h2>
          <p>Bộ phận dùng cho SVTT, tài khoản và phân công. Không xóa được bộ phận đang có SVTT hoặc tài khoản.</p>
        </div>
      </div>

      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:16px;">
        <label>Mã bộ phận<br>
          <input type="text" name="deptCode" maxlength="12" placeholder="Ví dụ: LT">
        </label>
        <label>Tên bộ phận<br>
          <input type="text" name="deptName" placeholder="Ví dụ: Lễ tân">
        </label>
        <button type="button" class="ih-btn ih-btn--primary" data-action="create-department">Thêm bộ phận</button>
      </div>

      <div class="ih-table-wrap">
        <table class="ih-table">
          <thead>
            <tr><th>Mã</th><th>Tên bộ phận</th><th>SVTT</th><th>Tài khoản</th><th>Thao tác</th></tr>
          </thead>
          <tbody>
            ${rows || `<tr><td colspan="5" class="ih-empty">Chưa có bộ phận nào.</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderView() {
  const view = mountNode?.querySelector("[data-admin-view]");
  if (!view) return;

  if (loadError) {
    view.innerHTML = `
      <div class="ih-error">
        ${html(loadError)}
        <button type="button" data-action="refresh">Thử lại</button>
      </div>
    `;
    return;
  }

  if (currentTab === "users") {
    view.innerHTML = renderUsers();
  } else if (currentTab === "interns") {
    view.innerHTML = renderInterns();
  } else if (currentTab === "followup") {
    view.innerHTML = renderFollowUp();
  } else if (currentTab === "periods") {
    view.innerHTML = renderPeriods();
  } else if (currentTab === "departments") {
    view.innerHTML = renderDepartments();
  } else {
    view.innerHTML = followBanner() + renderOverview();
  }

  view.querySelector("[data-user-status-filter]")
    ?.addEventListener("change", renderView);
}

// ============================================
// Thao tác với dữ liệu mô phỏng (kỳ, SVTT, phiếu)
// ============================================
async function handleDemoAction(action, button) {
  const demoActions = [
    "create-period", "generate-tickets", "load-sample", "reset-demo",
    "create-department", "delete-department",
    "submit-intern", "edit-intern", "cancel-intern-edit", "delete-intern",
    "save-member"
  ];
  if (!demoActions.includes(action)) return false;

  try {
    ensureAdmin();
  } catch (error) {
    announce(error.message, "error");
    return true;
  }

  const report = (result, okText) => {
    announce(result.ok ? okText : result.error, result.ok ? "success" : "error");
  };

  if (action === "create-period") {
    const month = mountNode.querySelector('[name="month"]')?.value;
    const name = mountNode.querySelector('[name="name"]')?.value;
    const created = DemoStore.createPeriod({ month, name });
    const sync = created.sync;
    announce(
      created.ok
        ? `Đã tạo kỳ. Tự động tạo ${sync?.created ?? 0} phiếu cho ${sync?.eligible ?? 0} SVTT thuộc kỳ.`
        : created.error,
      created.ok ? "success" : "error"
    );

  } else if (action === "generate-tickets") {
    const result = DemoStore.generateTickets(button.dataset.periodId);
    announce(
      result.ok
        ? `Đồng bộ xong: thêm ${result.created} phiếu, gỡ ${result.removed} phiếu chưa làm của SVTT ngoài kỳ, giữ ${result.kept} phiếu đã có tiến độ.`
        : result.error,
      result.ok ? "success" : "error"
    );

  } else if (action === "load-sample") {
    if (!window.confirm("Nạp dữ liệu mẫu sẽ THAY THẾ toàn bộ bộ phận, kỳ, SVTT và phiếu hiện có. Tiếp tục?")) return true;
    DemoStore.loadSampleData();
    lastImport = null;
    editingInternId = null;
    announce("Đã nạp dữ liệu mẫu (dữ liệu giả lập).");

  } else if (action === "reset-demo") {
    if (!window.confirm("Xóa toàn bộ dữ liệu mô phỏng (bộ phận, SVTT, kỳ, phiếu, phân vai trò) trên trình duyệt này?")) return true;
    DemoStore.resetDemo();
    lastImport = null;
    editingInternId = null;
    announce("Đã xóa dữ liệu mô phỏng.");

  } else if (action === "create-department") {
    const code = mountNode.querySelector('[name="deptCode"]')?.value;
    const name = mountNode.querySelector('[name="deptName"]')?.value;
    report(DemoStore.createDepartment({ code, name }), "Đã thêm bộ phận.");

  } else if (action === "delete-department") {
    if (!window.confirm(`Xóa bộ phận ${button.dataset.code}?`)) return true;
    report(DemoStore.deleteDepartment(button.dataset.code), "Đã xóa bộ phận.");

  } else if (action === "submit-intern") {
    const form = mountNode.querySelector("[data-intern-form]");
    const get = name => form?.querySelector(`[name="${name}"]`)?.value ?? "";
    const data = {
      internId: get("internId"),
      fullName: get("fullName"),
      school: get("school"),
      department: get("department"),
      startDate: get("startDate"),
      endDate: get("endDate")
    };
    const result = editingInternId
      ? DemoStore.updateIntern(editingInternId, data)
      : DemoStore.createIntern(data);
    if (result.ok) editingInternId = null;
    report(result, "Đã lưu SVTT.");

  } else if (action === "edit-intern") {
    editingInternId = button.dataset.internId;

  } else if (action === "cancel-intern-edit") {
    editingInternId = null;

  } else if (action === "delete-intern") {
    if (!window.confirm(`Xóa SVTT ${button.dataset.internId}?`)) return true;
    if (editingInternId === button.dataset.internId) editingInternId = null;
    report(DemoStore.deleteIntern(button.dataset.internId), "Đã xóa SVTT.");

  } else if (action === "save-member") {
    const uid = button.dataset.userId;
    const role = mountNode.querySelector(`[data-member-role-for="${CSS.escape(uid)}"]`)?.value;
    const department = mountNode.querySelector(`[data-member-dept-for="${CSS.escape(uid)}"]`)?.value;
    if (role !== "hr" && !department) {
      announce("Người hướng dẫn và Trưởng bộ phận phải chọn bộ phận.", "error");
      return true;
    }
    report(DemoStore.updateMember(uid, { role, department }), "Đã cập nhật vai trò và bộ phận (mô phỏng).");
  }

  await refreshData();
  return true;
}

// Đọc file CSV của Admin, kiểm tra cột rồi nhập
async function handleFileChange(event) {
  const input = event.target;

  // Phòng Nhân sự không thuộc bộ phận nào: ẩn ô bộ phận khi chọn vai trò HR
  if (input instanceof HTMLSelectElement && input.matches("[data-role-for], [data-member-role-for]")) {
    const uid = input.dataset.roleFor || input.dataset.memberRoleFor;
    const wrap = mountNode.querySelector(`[data-dept-wrap-for="${CSS.escape(uid)}"]`);
    if (wrap) wrap.hidden = input.value === ROLES.HR;
    return;
  }

  if (input instanceof HTMLInputElement && input.matches("[data-follow-date]")) {
    followDate = input.value;
    renderView();
    return;
  }
  if (!(input instanceof HTMLInputElement) || !input.matches("[data-import-file]")) return;
  const file = input.files?.[0];
  if (!file) return;

  try {
    ensureAdmin();
    const parsed = DemoStore.parseCsv(await file.text());
    const headers = parsed.headers.map(h => String(h).trim().toLowerCase());
    const columnIndex = INTERN_COLUMNS.map(name => headers.indexOf(name.toLowerCase()));
    const requiredIdx = [0, 1, 3]; // Mã SV, Họ tên, Bộ phận
    const missing = requiredIdx.filter(i => columnIndex[i] === -1).map(i => INTERN_COLUMNS[i]);

    if (missing.length) {
      announce(`File thiếu cột bắt buộc: ${missing.join(", ")}.`, "error");
      input.value = "";
      return;
    }

    const rows = parsed.rows.map(row => ({
      line: row.line,
      cells: columnIndex.map(idx => (idx === -1 ? "" : row.cells[idx] ?? ""))
    }));

    lastImport = DemoStore.importInterns(rows);
    announce(
      `Đã nhập ${lastImport.added} SVTT mới, ${lastImport.skipped} đã có, ${lastImport.errors.length} dòng lỗi.`,
      lastImport.errors.length ? "error" : "success"
    );
  } catch (error) {
    console.error("[InternHub Admin] Import error", error);
    announce("Không đọc được file. Vui lòng dùng file CSV.", "error");
  }

  input.value = "";
  await refreshData();
}

async function handleAction(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const tabLink = target.closest("[data-tab]");

  if (tabLink && !tabLink.matches(".ih-tabs button")) {
    currentTab = tabLink.dataset.tab;

    mountNode.querySelectorAll(".ih-tabs [data-tab]").forEach(item => {
      item.classList.toggle(
        "is-active",
        item.dataset.tab === currentTab
      );
    });

    renderView();
    return;
  }

  const button = target.closest("[data-action]");
  if (!button) return;

  const action = button.dataset.action;

  if (action === "refresh") {
    await refreshData();
    return;
  }

  if (await handleDemoAction(action, button)) return;

  const userId = button.dataset.userId;
  if (!userId) return;

  button.disabled = true;

  try {
    ensureAdmin();

    if (action === "approve") {
      const roleSelect = mountNode.querySelector(
        `[data-role-for="${CSS.escape(userId)}"]`
      );

      const role = roleSelect?.value;

      if (!Object.hasOwn(ASSIGNABLE_ROLES, role)) {
        announce(
          "Vui lòng chọn HR (Phòng Nhân sự) hoặc Trưởng bộ phận trước khi duyệt.",
          "error"
        );
        button.disabled = false;
        return;
      }

      const deptCode = mountNode.querySelector(
        `[data-dept-for="${CSS.escape(userId)}"]`
      )?.value || "";

      if (role !== ROLES.HR && !deptCode) {
        announce("Trưởng bộ phận và người hướng dẫn phải được chọn bộ phận.", "error");
        button.disabled = false;
        return;
      }

      const ok = await Auth.approveUser(userId, role);

      if (!ok) {
        throw new Error(
          "Không thể duyệt tài khoản. Kiểm tra tài khoản Admin và Firestore Rules."
        );
      }

      // Đồng bộ để có hồ sơ thành viên, rồi ghi bộ phận Admin đã chọn
      await refreshData();
      if (role !== ROLES.HR) {
        const result = DemoStore.updateMember(userId, { role, department: deptCode });
        if (!result.ok) throw new Error(result.error);
      }

      announce("Đã duyệt tài khoản và gán vai trò.");
    } else if (action === "delete-user") {
      const account = users.find(u => u.id === userId)?.email || userId;
      if (!window.confirm(
        `Xóa tài khoản ${account} khỏi hệ thống?\n\nHồ sơ trên Firestore sẽ bị xóa và không khôi phục được. Tài khoản Google vẫn tồn tại; muốn chặn đăng nhập hẳn, vô hiệu hóa trong Firebase Console.`
      )) {
        button.disabled = false;
        return;
      }

      const ok = await Auth.deleteUserProfile(userId);
      if (!ok) {
        throw new Error("Không xóa được tài khoản. Kiểm tra quyền Admin và Firestore Rules.");
      }

      DemoStore.removeMember(userId);
      announce("Đã xóa tài khoản.");
    } else if (action === "reject") {
      const reason = window.prompt(
        "Lý do từ chối tài khoản (bắt buộc):"
      );

      if (reason === null) {
        button.disabled = false;
        return;
      }

      if (!reason.trim()) {
        announce("Cần nhập lý do từ chối.", "error");
        button.disabled = false;
        return;
      }

      const ok = await Auth.rejectUser(userId, reason.trim());

      if (!ok) {
        throw new Error(
          "Không thể từ chối tài khoản. Kiểm tra tài khoản Admin và Firestore Rules."
        );
      }

      announce("Đã từ chối tài khoản.");
    }

    await refreshData();
  } catch (error) {
    console.error("[InternHub Admin] Action error", error);
    announce(error.message || "Thao tác không thành công.", "error");
    button.disabled = false;
  }
}

/** Khởi tạo bảng quản trị bên trong element hoặc ID truyền vào. */
export async function initAdminPanel(target = "adminPanelRoot") {
  const user = await Auth.waitForUser();

  if (!user || normalizeEmail(user.email) !== ADMIN_EMAIL) {
    throw new Error(
      "Không có quyền truy cập. Vui lòng đăng nhập bằng tài khoản Admin."
    );
  }

  mountNode = typeof target === "string"
    ? document.getElementById(target)
    : target;

  if (!(mountNode instanceof HTMLElement)) {
    throw new Error(
      `Không tìm thấy phần tử gắn Admin Panel: ${
        typeof target === "string" ? target : "đã truyền vào"
      }`
    );
  }

  shell();
  await refreshData();
}

export async function refreshAdminPanel() {
  if (!mountNode) {
    throw new Error("Admin Panel chưa được khởi tạo.");
  }

  await refreshData();
}

export const AdminPanel = {
  init: initAdminPanel,
  refresh: refreshAdminPanel
};

export default AdminPanel;
