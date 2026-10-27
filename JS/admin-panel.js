
 // ============================================
 // InternHub Admin Panel
 // Tương thích API hiện có trong JS/auth.js và JS/db.js
 // ============================================

import { getFirestore, collection, getDocs } from
  "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

import { Auth } from "./auth.js";
import { Database } from "./db.js";
import { DemoStore, INTERN_COLUMNS } from "./demo-store.js";
import { COLLECTIONS, ROLES, USER_STATUS } from "./firebase-config.js";

const ADMIN_EMAIL = "dptbinh193@gmail.com";
const firestore = getFirestore();

// Chỉ hai vai trò này được phép gán khi duyệt tài khoản.
const ASSIGNABLE_ROLES = {
  [ROLES.HR]: "Phòng Nhân sự",
  [ROLES.SUPERVISOR]: "Trưởng bộ phận"
};

// Nhãn hiển thị, bao gồm cả các vai trò cũ nếu có trong dữ liệu.
const ROLE_LABELS = {
  [ROLES.ADMIN]: "Quản trị hệ thống",
  [ROLES.HR]: "Phòng Nhân sự",
  [ROLES.SUPERVISOR]: "Trưởng bộ phận",
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

function departmentLabel(id) {
  const found = departments.find(item => item.id === id);
  return found?.name || id || "—";
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
    const [userSnapshot, departmentRows] = await Promise.all([
      getDocs(collection(firestore, COLLECTIONS.USERS)),
      Database.getAllDepartments()
    ]);

    users = userSnapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));

    // Kỳ, SVTT và phiếu hiện là dữ liệu mô phỏng (JS/demo-store.js)
    periods = DemoStore.listPeriods();
    departments = Array.isArray(departmentRows) ? departmentRows : [];
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

function userRow(user) {
  const status = user.status || USER_STATUS.PENDING;

  const roleOptions = Object.entries(ASSIGNABLE_ROLES)
    .map(([role, label]) => `
      <option value="${html(role)}"
        ${user.role === role ? "selected" : ""}>
        ${html(label)}
      </option>
    `).join("");

  const controls = status === USER_STATUS.PENDING
    ? `
      <div class="ih-actions">
        <select aria-label="Vai trò cần gán"
          data-role-for="${html(user.id)}">
          <option value="">Chọn vai trò</option>
          ${roleOptions}
        </select>

        <button type="button"
          class="ih-btn ih-btn--primary"
          data-action="approve"
          data-user-id="${html(user.id)}">Duyệt</button>

        <button type="button"
          class="ih-btn ih-btn--danger"
          data-action="reject"
          data-user-id="${html(user.id)}">Từ chối</button>
      </div>
    `
    : "—";

  return `
    <tr>
      <td>
        <strong>${html(user.fullName || "Chưa cập nhật")}</strong>
        <small>${html(user.email || "")}</small>
      </td>
      <td>${html(departmentLabel(user.department))}</td>
      <td>${html(ROLE_LABELS[user.role] || "Chưa gán")}</td>
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
  const internCount = DemoStore.listInterns().length;
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
                          data-period-id="${html(period.id)}"
                          ${internCount ? "" : "disabled"}>
                          Tạo phiếu cho ${internCount} SVTT
                        </button>
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
      ${internCount ? "" : `<p class="ih-empty">Chưa có danh sách SVTT. Nhập ở tab "Sinh viên TT" trước khi tạo phiếu.</p>`}
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
  const departmentCount = new Set(interns.map(i => i.department)).size;
  const preview = interns.slice(0, 50).map(i => `
      <tr>
        <td>${html(i.internId)}</td>
        <td>${html(i.fullName)}</td>
        <td>${html(i.school || "—")}</td>
        <td>${html(i.department)}</td>
      </tr>`).join("");

  return `
    <section class="ih-section">
      <div class="ih-section__heading">
        <div>
          <h2>Sinh viên thực tập</h2>
          <p>Nhập danh sách SVTT từ file CSV (trong Excel: Save As → CSV UTF-8). Dòng lỗi được báo lại và không nhập. SVTT đã có cùng Mã SV được giữ nguyên, không ghi đè.</p>
        </div>
      </div>

      <p><strong>${interns.length}</strong> SVTT · ${departmentCount} bộ phận</p>
      <p>Cột cần có: ${INTERN_COLUMNS.map(html).join(", ")}. Bắt buộc: Mã SV, Họ tên, Bộ phận.</p>

      <div style="margin:12px 0;">
        <input type="file" accept=".csv,text/csv" data-import-file>
      </div>
      ${importResultHtml()}

      <div style="display:flex;gap:8px;flex-wrap:wrap;margin:16px 0;">
        <button type="button" class="ih-btn ih-btn--secondary" data-action="load-sample">Nạp dữ liệu mẫu (520 SVTT)</button>
        <button type="button" class="ih-btn ih-btn--secondary" data-action="reset-demo">Xóa toàn bộ dữ liệu mô phỏng</button>
      </div>

      ${interns.length ? `
      <div class="ih-table-wrap">
        <table class="ih-table">
          <thead>
            <tr><th>Mã SV</th><th>Họ tên</th><th>Trường</th><th>Bộ phận</th></tr>
          </thead>
          <tbody>${preview}</tbody>
        </table>
      </div>
      ${interns.length > 50 ? `<p>Đang xem 50 SVTT đầu tiên trên tổng ${interns.length}.</p>` : ""}
      ` : `<p class="ih-empty">Chưa có SVTT nào.</p>`}
    </section>
  `;
}

function renderDepartments() {
  return `
    <section class="ih-section">
      <div class="ih-section__heading">
        <div>
          <h2>Bộ phận</h2>
          <p>Danh mục bộ phận trong Firestore.</p>
        </div>
      </div>

      <div class="ih-table-wrap">
        <table class="ih-table">
          <thead>
            <tr>
              <th>Mã</th>
              <th>Tên bộ phận</th>
              <th>Người quản lý</th>
            </tr>
          </thead>
          <tbody>
            ${departments.length
              ? departments.map(item => `
                  <tr>
                    <td>${html(item.id)}</td>
                    <td><strong>${html(item.name || "Chưa đặt tên")}</strong></td>
                    <td>${html(item.manager || "—")}</td>
                  </tr>
                `).join("")
              : `<tr><td colspan="3" class="ih-empty">
                   Chưa có dữ liệu bộ phận.
                 </td></tr>`
            }
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
  } else if (currentTab === "periods") {
    view.innerHTML = renderPeriods();
  } else if (currentTab === "departments") {
    view.innerHTML = renderDepartments();
  } else {
    view.innerHTML = renderOverview();
  }

  view.querySelector("[data-user-status-filter]")
    ?.addEventListener("change", renderView);
}

// ============================================
// Thao tác với dữ liệu mô phỏng (kỳ, SVTT, phiếu)
// ============================================
async function handleDemoAction(action, button) {
  const demoActions = ["create-period", "generate-tickets", "load-sample", "reset-demo"];
  if (!demoActions.includes(action)) return false;

  try {
    ensureAdmin();
  } catch (error) {
    announce(error.message, "error");
    return true;
  }

  if (action === "create-period") {
    const month = mountNode.querySelector('[name="month"]')?.value;
    const name = mountNode.querySelector('[name="name"]')?.value;
    const result = DemoStore.createPeriod({ month, name });
    announce(result.ok ? "Đã tạo kỳ đánh giá." : result.error, result.ok ? "success" : "error");
  } else if (action === "generate-tickets") {
    const result = DemoStore.generateTickets(button.dataset.periodId);
    announce(
      result.ok
        ? `Đã tạo ${result.created} phiếu mới. ${result.existing} phiếu đã có được giữ nguyên.`
        : result.error,
      result.ok ? "success" : "error"
    );
  } else if (action === "load-sample") {
    if (!window.confirm("Nạp dữ liệu mẫu sẽ THAY THẾ toàn bộ kỳ, SVTT và phiếu hiện có. Tiếp tục?")) return true;
    DemoStore.loadSampleData();
    lastImport = null;
    announce("Đã nạp dữ liệu mẫu (dữ liệu giả lập).");
  } else if (action === "reset-demo") {
    if (!window.confirm("Xóa toàn bộ kỳ, SVTT và phiếu mô phỏng trên trình duyệt này?")) return true;
    DemoStore.resetDemo();
    lastImport = null;
    announce("Đã xóa dữ liệu mô phỏng.");
  }

  await refreshData();
  return true;
}

// Đọc file CSV của Admin, kiểm tra cột rồi nhập
async function handleFileChange(event) {
  const input = event.target;
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

      const ok = await Auth.approveUser(userId, role);

      if (!ok) {
        throw new Error(
          "Không thể duyệt tài khoản. Kiểm tra tài khoản Admin và Firestore Rules."
        );
      }

      announce("Đã duyệt tài khoản và gán vai trò.");
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
