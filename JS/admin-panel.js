// ============================================
// InternHub Admin Panel
// Tương thích API hiện có trong JS/auth.js và JS/db.js
// ============================================

import { getFirestore, collection, getDocs } from
  "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { Auth } from "./auth.js";
import { Database } from "./db.js";
import { COLLECTIONS, ROLES, USER_STATUS } from "./firebase-config.js";

const firestore = getFirestore();
const ROLE_LABELS = {
  [ROLES.ADMIN]: "Quản trị hệ thống",
  [ROLES.HR]: "Đào tạo / Nhân sự",
  [ROLES.SUPERVISOR]: "Trưởng bộ phận",
  [ROLES.INTERN]: "Sinh viên thực tập"
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
let loadError = "";

const html = (value = "") => String(value).replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));

function dateText(value) {
  if (!value) return "—";
  const date = value?.toDate instanceof Function ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
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

function departmentLabel(id) {
  const found = departments.find(item => item.id === id);
  return found?.name || id || "—";
}

async function refreshData() {
  if (loading) return;
  loading = true;
  loadError = "";
  showLoading(true);
  try {
    const [userSnapshot, periodRows, departmentRows] = await Promise.all([
      getDocs(collection(firestore, COLLECTIONS.USERS)),
      Database.getAllPeriods(),
      Database.getAllDepartments()
    ]);
    users = userSnapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    periods = Array.isArray(periodRows) ? periodRows : [];
    departments = Array.isArray(departmentRows) ? departmentRows : [];
    const byPeriod = await Promise.all(periods.map(period => Database.getTicketsByPeriod(period.id)));
    tickets = byPeriod.flat().map(ticket => ({ ...ticket }));
  } catch (error) {
    console.error("[InternHub Admin] Load error", error);
    loadError = "Không thể tải dữ liệu. Kiểm tra kết nối Firebase và Firestore Rules.";
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
        <div><p class="ih-admin__eyebrow">INTERNHUB / ADMIN</p><h1>Quản trị hệ thống</h1>
        <p class="ih-admin__subhead">Quản lý tài khoản và theo dõi các kỳ đánh giá.</p></div>
        <button type="button" class="ih-btn ih-btn--secondary" data-action="refresh">Làm mới</button>
      </header>
      <div class="ih-notice" data-admin-notice hidden role="status"></div>
      <p class="ih-loading" data-admin-loading hidden>Đang tải dữ liệu…</p>
      <nav class="ih-tabs" aria-label="Mục quản trị">
        <button type="button" data-tab="overview" class="is-active">Tổng quan</button>
        <button type="button" data-tab="users">Tài khoản</button>
        <button type="button" data-tab="periods">Kỳ đánh giá</button>
        <button type="button" data-tab="departments">Bộ phận</button>
      </nav>
      <main data-admin-view></main>
    </section>`;

  mountNode.querySelectorAll("[data-tab]").forEach(button => button.addEventListener("click", () => {
    currentTab = button.dataset.tab;
    mountNode.querySelectorAll("[data-tab]").forEach(item => item.classList.toggle("is-active", item === button));
    renderView();
  }));
  mountNode.querySelector('[data-action="refresh"]').addEventListener("click", refreshData);
  mountNode.addEventListener("click", handleAction);
}

function card(title, count, caption) {
  return `<article class="ih-stat"><span>${html(title)}</span><strong>${Number(count) || 0}</strong><small>${html(caption)}</small></article>`;
}

function renderOverview() {
  const pendingUsers = users.filter(user => user.status === USER_STATUS.PENDING).length;
  const activePeriods = periods.filter(period => period.status === "Đang mở").length;
  const pendingTickets = tickets.filter(ticket => ticket.status === "cho_xac_nhan").length;
  const finalizedTickets = tickets.filter(ticket => ticket.status === "da_chot").length;
  return `<section class="ih-section">
    <div class="ih-stats">
      ${card("Tài khoản", users.length, "Tổng người dùng")}
      ${card("Chờ duyệt", pendingUsers, "Tài khoản cần xử lý")}
      ${card("Kỳ đang mở", activePeriods, "Kỳ đánh giá")}
      ${card("Chờ xác nhận", pendingTickets, "Phiếu gửi Đào tạo")}
      ${card("Đã chốt", finalizedTickets, "Phiếu hoàn tất")}
    </div>
    <section class="ih-panel"><h2>Việc cần theo dõi</h2>
      <button class="ih-link-row" data-tab="users"><span>${pendingUsers} tài khoản chờ duyệt</span><b>›</b></button>
      <button class="ih-link-row" data-tab="periods"><span>${activePeriods} kỳ đang mở</span><b>›</b></button>
      <div class="ih-link-row"><span>${pendingTickets} phiếu chờ Đào tạo xác nhận</span></div>
    </section></section>`;
}

function renderUsers() {
  const selected = mountNode.querySelector("[data-user-status-filter]")?.value || "all";
  const rows = users.filter(user => selected === "all" || (user.status || USER_STATUS.PENDING) === selected);
  return `<section class="ih-section"><div class="ih-section__heading"><div><h2>Tài khoản người dùng</h2><p>Duyệt tài khoản và phân vai trò.</p></div>
    <label>Trạng thái <select data-user-status-filter>
      ${[["all", "Tất cả"], ["pending", "Chờ duyệt"], ["approved", "Đã duyệt"], ["rejected", "Từ chối"]].map(([v, label]) => `<option value="${v}" ${selected === v ? "selected" : ""}>${label}</option>`).join("")}
    </select></label></div>
    <div class="ih-table-wrap"><table class="ih-table"><thead><tr><th>Họ tên / Email</th><th>Bộ phận</th><th>Vai trò</th><th>Trạng thái</th><th>Ngày tạo</th><th>Thao tác</th></tr></thead><tbody>
      ${rows.length ? rows.map(userRow).join("") : `<tr><td colspan="6" class="ih-empty">Không có tài khoản phù hợp.</td></tr>`}
    </tbody></table></div></section>`;
}

function userRow(user) {
  const status = user.status || USER_STATUS.PENDING;
  const roleOptions = Object.entries(ROLE_LABELS).map(([role, label]) => `<option value="${html(role)}" ${user.role === role ? "selected" : ""}>${html(label)}</option>`).join("");
  const controls = status === USER_STATUS.PENDING ? `<div class="ih-actions">
    <select aria-label="Vai trò cần gán" data-role-for="${html(user.id)}"><option value="">Chọn vai trò</option>${roleOptions}</select>
    <button type="button" class="ih-btn ih-btn--primary" data-action="approve" data-user-id="${html(user.id)}">Duyệt</button>
    <button type="button" class="ih-btn ih-btn--danger" data-action="reject" data-user-id="${html(user.id)}">Từ chối</button>
  </div>` : "—";
  return `<tr><td><strong>${html(user.fullName || "Chưa cập nhật")}</strong><small>${html(user.email || "")}</small></td>
    <td>${html(departmentLabel(user.department))}</td><td>${html(ROLE_LABELS[user.role] || "Chưa gán")}</td>
    <td><span class="ih-status ih-status--${html(status)}">${html(STATUS_LABELS[status] || status)}</span></td>
    <td>${dateText(user.createdAt)}</td><td>${controls}</td></tr>`;
}

function renderPeriods() {
  return `<section class="ih-section"><div class="ih-section__heading"><div><h2>Kỳ đánh giá</h2><p>Thống kê phiếu theo từng kỳ.</p></div></div>
    <div class="ih-table-wrap"><table class="ih-table"><thead><tr><th>Tên kỳ</th><th>Trạng thái</th><th>Hạn gửi</th><th>Tổng phiếu</th><th>Chờ xác nhận</th><th>Đã chốt</th></tr></thead><tbody>
    ${periods.length ? periods.map(period => {
      const periodTickets = tickets.filter(ticket => ticket.periodId === period.id);
      return `<tr><td><strong>${html(period.name || period.id)}</strong><small>${html(period.id)}</small></td><td>${html(period.status || "—")}</td><td>${dateText(period.dueDate)}</td><td>${periodTickets.length}</td><td>${periodTickets.filter(ticket => ticket.status === "cho_xac_nhan").length}</td><td>${periodTickets.filter(ticket => ticket.status === "da_chot").length}</td></tr>`;
    }).join("") : `<tr><td colspan="6" class="ih-empty">Chưa có kỳ đánh giá.</td></tr>`}
    </tbody></table></div></section>`;
}

function renderDepartments() {
  return `<section class="ih-section"><div class="ih-section__heading"><div><h2>Bộ phận</h2><p>Danh mục bộ phận trong Firestore.</p></div></div>
    <div class="ih-table-wrap"><table class="ih-table"><thead><tr><th>Mã</th><th>Tên bộ phận</th><th>Người quản lý</th></tr></thead><tbody>
    ${departments.length ? departments.map(item => `<tr><td>${html(item.id)}</td><td><strong>${html(item.name || "Chưa đặt tên")}</strong></td><td>${html(item.manager || "—")}</td></tr>`).join("") : `<tr><td colspan="3" class="ih-empty">Chưa có dữ liệu bộ phận.</td></tr>`}
    </tbody></table></div></section>`;
}

function renderView() {
  const view = mountNode?.querySelector("[data-admin-view]");
  if (!view) return;
  if (loadError) {
    view.innerHTML = `<div class="ih-error">${html(loadError)} <button type="button" data-action="refresh">Thử lại</button></div>`;
    return;
  }
  if (currentTab === "users") view.innerHTML = renderUsers();
  else if (currentTab === "periods") view.innerHTML = renderPeriods();
  else if (currentTab === "departments") view.innerHTML = renderDepartments();
  else view.innerHTML = renderOverview();
  view.querySelector("[data-user-status-filter]")?.addEventListener("change", renderView);
}

async function handleAction(event) {
  const tabLink = event.target.closest("[data-tab]");
  if (tabLink && !tabLink.matches(".ih-tabs button")) {
    currentTab = tabLink.dataset.tab;
    mountNode.querySelectorAll(".ih-tabs [data-tab]").forEach(item => item.classList.toggle("is-active", item.dataset.tab === currentTab));
    renderView();
    return;
  }
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  if (action === "refresh") return refreshData();
  const userId = button.dataset.userId;
  if (!userId) return;
  button.disabled = true;
  try {
    if (action === "approve") {
      const role = mountNode.querySelector(`[data-role-for="${CSS.escape(userId)}"]`)?.value;
      if (!role) {
        announce("Vui lòng chọn vai trò trước khi duyệt.", "error");
        button.disabled = false;
        return;
      }
      const ok = await Auth.approveUser(userId, role);
      if (!ok) throw new Error("Auth.approveUser không hoàn tất. Kiểm tra tài khoản Admin và Firestore Rules.");
      announce("Đã duyệt tài khoản.");
    } else if (action === "reject") {
      const reason = window.prompt("Lý do từ chối tài khoản (bắt buộc):");
      if (reason === null) { button.disabled = false; return; }
      if (!reason.trim()) {
        announce("Cần nhập lý do từ chối.", "error");
        button.disabled = false;
        return;
      }
      const ok = await Auth.rejectUser(userId, reason.trim());
      if (!ok) throw new Error("Auth.rejectUser không hoàn tất. Kiểm tra tài khoản Admin và Firestore Rules.");
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
  mountNode = typeof target === "string" ? document.getElementById(target) : target;
  if (!(mountNode instanceof HTMLElement)) {
    throw new Error(`Không tìm thấy phần tử gắn Admin Panel: ${target}`);
  }
  shell();
  await refreshData();
}

export async function refreshAdminPanel() {
  if (!mountNode) throw new Error("Admin Panel chưa được khởi tạo.");
  await refreshData();
}

export const AdminPanel = { init: initAdminPanel, refresh: refreshAdminPanel };
export default AdminPanel;
