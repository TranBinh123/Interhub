// ============================================
// layout.js
// Khung giao diện: khởi tạo app.html, chuyển view và khung trang quản trị (admin.html).
// ============================================

import { Auth } from "./auth.js";
import { announce, showDemoBanner, showLoading } from "./components/messages.js";
import { setupSidebar } from "./components/sidebar.js";
import { applyPageHeader, setupTopbar } from "./components/topbar.js";
import { DemoStore, firestore } from "./db.js";
import { COLLECTIONS } from "./firebase-config.js";
import { collection, getDocs, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { handleAssignChange, handleAssignClick, renderAssignments } from "./modules/assignments.js";
import { followBanner, loadDashboardData, renderOverview, renderUsers } from "./modules/dashboard.js";
import { handleHrChange, handleHrClick, handleHrInput, renderHrAll } from "./modules/evaluations.js";
import { handleDemoAction, handleFileChange, renderDepartments, renderFollowUp, renderInterns, renderInternsView } from "./modules/interns.js";
import { renderAdminPeriods, renderPeriods } from "./modules/periods.js";
import { renderReportsView } from "./modules/reports.js";
import { renderTimesheetView } from "./modules/timesheet.js";
import { ADMIN_EMAIL, ASSIGNABLE_ROLES, NO_DEPT_ROLES, admin, state } from "./state.js";
import { html, isHR, normalizeEmail } from "./utils.js";

// Khung ứng dụng (app.html): khởi tạo, ghép sidebar/topbar, chuyển view.
// Phần khung trang quản trị (admin.html) nằm ở nửa dưới của file này.
export async function initApp() {
  showDemoBanner();

  // Chờ Firebase xác định trạng thái đăng nhập (khởi tạo listener trong auth.js)
  let user = null;
  try {
    user = await Auth.waitForUser();
  } catch (error) {
    console.error("Không thể kiểm tra đăng nhập:", error);
  }

  if (!user) {
    window.location.replace("./index.html");
    return;
  }

  // Chỉ cho vào app khi tài khoản đã được Admin duyệt.
  let profile = null;
  try {
    profile = await Auth.getProfile(user.uid);
  } catch (error) {
    console.error("Không thể tải hồ sơ người dùng:", error);
  }

  if (!profile || profile.status !== "approved" || profile.isActive !== true) {
    window.location.replace("./index.html");
    return;
  }

  // Áp dụng vai trò/bộ phận Admin đã chỉnh (mô phỏng) lên hồ sơ Firestore
  profile = DemoStore.effectiveProfile(user.uid, profile);

  state.currentUser = user;
  state.userProfile = profile;
  setupUI();
  loadDashboardData();

  // Mở đúng mục khi đến từ trang khác, ví dụ ?view=evaluations từ nút "Quay lại" của phiếu in
  const requestedView = new URLSearchParams(window.location.search).get("view");
  if (requestedView && document.querySelector(`.nav-link[data-view="${requestedView}"]:not([hidden])`)) {
    switchView(requestedView);
  }
}

export function setupUI() {
  setupSidebar();
  setupTopbar();

  // Chỉ Phòng Nhân sự được tạo phiếu/kỳ (thực hiện ở trang quản lý)
  const hr = isHR();
  document.getElementById("createTicketBtn").hidden = !hr;
  document.getElementById("createPeriodBtn").hidden = !hr;

  document.getElementById("assignments").addEventListener("click", handleAssignClick);
  document.getElementById("assignments").addEventListener("change", handleAssignChange);
  document.getElementById("assignSearch").addEventListener("input", () => { renderAssignments(); });
  ["dashboard", "evaluations"].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener("click", handleHrClick);
    el.addEventListener("change", handleHrChange);
    el.addEventListener("input", handleHrInput);
  });

  // Quay lại từ trang phiếu (nút Quay lại / bfcache) hoặc đổi tab: nạp lại dữ liệu mới nhất
  window.addEventListener("pageshow", refreshAll);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshAll();
  });
}

// Vẽ lại nội dung các mục nạp theo yêu cầu
export function renderActiveView(viewName) {
  if (viewName === "assignments") renderAssignments();
  if (viewName === "periods") renderPeriods();
  if (viewName === "interns") renderInternsView();
  if (viewName === "timesheet") renderTimesheetView();
  if (viewName === "reports") renderReportsView();
}

export function refreshAll() {
  if (!state.currentUser) return;
  loadDashboardData();
  const active = document.querySelector(".nav-link.active")?.dataset.view;
  if (["interns", "timesheet", "reports"].includes(active)) renderActiveView(active);
}

export function switchView(viewName) {
  document.querySelectorAll(".nav-link").forEach(link => {
    link.classList.toggle("active", link.dataset.view === viewName);
  });

  document.querySelectorAll(".view").forEach(view => {
    view.classList.add("hidden");
  });

  const view = document.getElementById(viewName);
  if (view) view.classList.remove("hidden");

  renderActiveView(viewName);
  if (isHR() && (viewName === "dashboard" || viewName === "evaluations")) renderHrAll();

  applyPageHeader(viewName);

  // Đóng sidebar trên màn hình nhỏ
  if (window.innerWidth <= 768) {
    document.getElementById("appContainer").classList.remove("sidebar-open");
  }
}

// Thao tác nghiệp vụ: Admin và Phòng Nhân sự đều được làm
export function ensureBusiness() {
  if (admin.currentRole === "hr") return;
  ensureAdmin();
}

export function ensureAdmin() {
  const email = normalizeEmail(Auth.getCurrentEmail?.());

  if (email !== ADMIN_EMAIL) {
    throw new Error(
      "Bạn không có quyền truy cập bảng quản trị. Vui lòng đăng nhập bằng tài khoản Admin."
    );
  }
}

export function watchUsers() {
  if (admin.currentRole !== "admin" || admin.unwatchUsers) return;

  admin.unwatchUsers = onSnapshot(
    collection(firestore, COLLECTIONS.USERS),
    snapshot => {
      admin.users = snapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
      }));
      DemoStore.syncMembers(admin.users);
      if (admin.mountNode) renderView();
    },
    error => {
      console.error("[InternHub Admin] Users listener error", error);
      admin.unwatchUsers = null;
      admin.loadError =
        "Không thể tải danh sách tài khoản. Vui lòng kiểm tra Firestore Rules rồi bấm Làm mới.";
      if (admin.mountNode) renderView();
    }
  );
}

export async function refreshData() {
  if (admin.loading) return;

  try {
    ensureBusiness();
  } catch (error) {
    admin.loadError = error.message;
    renderView();
    return;
  }

  admin.loading = true;
  admin.loadError = "";
  showLoading(true);

  try {
    // Chỉ Admin đọc được danh sách tài khoản (Firestore Rules)
    if (admin.currentRole === "admin") {
      const userSnapshot = await getDocs(collection(firestore, COLLECTIONS.USERS));
      admin.users = userSnapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
      }));
      // Đồng bộ tài khoản đã duyệt vào danh bạ mô phỏng (giữ vai trò Admin đã chỉnh)
      DemoStore.syncMembers(admin.users);
    } else {
      admin.users = [];
    }

    // Kỳ, SVTT và phiếu hiện là dữ liệu mô phỏng (JS/demo-store.js)
    admin.periods = DemoStore.listPeriods();
    admin.departments = DemoStore.listDepartments();
    admin.tickets = DemoStore.listAllTickets();
  } catch (error) {
    console.error("[InternHub Admin] Load error", error);

    admin.loadError =
      "Không thể tải dữ liệu. Vui lòng kiểm tra kết nối Firebase, tài khoản Admin và Firestore Rules.";
  } finally {
    admin.loading = false;
    showLoading(false);
    renderView();
  }
}

export function shell() {
  admin.mountNode.innerHTML = `
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

  admin.mountNode.querySelectorAll("[data-tab]").forEach(button => {
    button.addEventListener("click", () => {
      admin.currentTab = button.dataset.tab;

      admin.mountNode.querySelectorAll(".ih-tabs [data-tab]").forEach(item => {
        item.classList.toggle("is-active", item === button);
      });

      renderView();
    });
  });

  admin.mountNode.querySelector('[data-action="refresh"]')
    .addEventListener("click", refreshData);

  // Gắn một lần trên phần tử gốc.
  admin.mountNode.addEventListener("click", handleAction);
  admin.mountNode.addEventListener("change", handleFileChange);
}

export function renderView() {
  const view = admin.mountNode?.querySelector("[data-admin-view]");
  if (!view) return;

  if (admin.loadError) {
    view.innerHTML = `
      <div class="ih-error">
        ${html(admin.loadError)}
        <button type="button" data-action="refresh">Thử lại</button>
      </div>
    `;
    return;
  }

  if (admin.currentTab === "users") {
    view.innerHTML = renderUsers();
  } else if (admin.currentTab === "interns") {
    view.innerHTML = renderInterns();
  } else if (admin.currentTab === "followup") {
    view.innerHTML = renderFollowUp();
  } else if (admin.currentTab === "periods") {
    view.innerHTML = renderAdminPeriods();
  } else if (admin.currentTab === "departments") {
    view.innerHTML = renderDepartments();
  } else {
    view.innerHTML = followBanner() + renderOverview();
  }

  view.querySelector("[data-user-status-filter]")
    ?.addEventListener("change", renderView);
}

export async function handleAction(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const tabLink = target.closest("[data-tab]");

  if (tabLink && !tabLink.matches(".ih-tabs button")) {
    admin.currentTab = tabLink.dataset.tab;

    admin.mountNode.querySelectorAll(".ih-tabs [data-tab]").forEach(item => {
      item.classList.toggle(
        "is-active",
        item.dataset.tab === admin.currentTab
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
      const roleSelect = admin.mountNode.querySelector(
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

      const deptCode = admin.mountNode.querySelector(
        `[data-dept-for="${CSS.escape(userId)}"]`
      )?.value || "";

      if (!NO_DEPT_ROLES.includes(role) && !deptCode) {
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
      if (!NO_DEPT_ROLES.includes(role)) {
        const result = DemoStore.updateMember(userId, { role, department: deptCode });
        if (!result.ok) throw new Error(result.error);
      }

      announce("Đã duyệt tài khoản và gán vai trò.");
    } else if (action === "delete-user") {
      const account = admin.users.find(u => u.id === userId)?.email || userId;
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

export async function initAdminPanel(target = "adminPanelRoot", options = {}) {
  const user = await Auth.waitForUser();
  admin.currentRole = options.role === "hr" ? "hr" : "admin";

  if (!user || (admin.currentRole === "admin" && normalizeEmail(user.email) !== ADMIN_EMAIL)) {
    throw new Error(
      "Không có quyền truy cập. Vui lòng đăng nhập bằng tài khoản Admin hoặc Phòng Nhân sự."
    );
  }

  admin.mountNode = typeof target === "string"
    ? document.getElementById(target)
    : target;

  if (!(admin.mountNode instanceof HTMLElement)) {
    throw new Error(
      `Không tìm thấy phần tử gắn Admin Panel: ${
        typeof target === "string" ? target : "đã truyền vào"
      }`
    );
  }

  shell();
  if (admin.currentRole === "hr") {
    // Phòng Nhân sự không quản lý tài khoản: ẩn tab Tổng quan và Tài khoản
    admin.mountNode.querySelectorAll('[data-tab="overview"], [data-tab="users"]').forEach(b => b.remove());
    admin.currentTab = "followup";
    admin.mountNode.querySelectorAll(".ih-tabs [data-tab]").forEach(item => {
      item.classList.toggle("is-active", item.dataset.tab === admin.currentTab);
    });
  }
  await refreshData();
  watchUsers();
}

export async function refreshAdminPanel() {
  if (!admin.mountNode) {
    throw new Error("Admin Panel chưa được khởi tạo.");
  }

  await refreshData();
}

export const AdminPanel = {
  init: initAdminPanel,
  refresh: refreshAdminPanel
};
