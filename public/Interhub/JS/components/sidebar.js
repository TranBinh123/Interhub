// ============================================
// components/sidebar.js
// Thanh bên: thông tin người dùng, mục điều hướng theo vai trò, đăng xuất.
// ============================================

import { Auth } from "../auth.js";
import { MEMBER_ROLES } from "../db.js";
import { switchView } from "../layout.js";
import { state } from "../state.js";
import { isHR } from "../utils.js";

// Thanh bên: thông tin người dùng, hiển thị mục theo vai trò, điều hướng, đăng xuất
export function setupSidebar() {
  const profile = state.userProfile;
  const role = profile?.role;
  if (profile) {
    document.getElementById("userDisplayName").textContent = profile.fullName || "—";
    document.getElementById("userDisplayRole").textContent = MEMBER_ROLES[role] || role || "—";
  }
  document.getElementById("userDisplayEmail").textContent = state.currentUser.email;

  document.getElementById("navAssignments").hidden = !["supervisor", "hr"].includes(role);
  document.getElementById("navManage").hidden = role !== "hr";
  document.getElementById("navInterns").hidden = !["supervisor", "hr"].includes(role);
  document.getElementById("navTimesheet").hidden = !["supervisor", "hr", "mentor"].includes(role);

  document.querySelectorAll(".nav-link[data-view]").forEach(link => {
    link.addEventListener("click", () => switchView(link.dataset.view));
  });

  document.getElementById("logoutBtn").addEventListener("click", async () => {
    // Phải đăng xuất Firebase trước khi về index.html, nếu không index sẽ tự chuyển lại app.html.
    try {
      await Auth.signOut();
    } catch (error) {
      console.error("Đăng xuất thất bại:", error);
    }
    window.location.replace("./index.html");
  });
}

// Phòng Nhân sự: ẩn các khối tổng quan cũ, ẩn mục Kỳ (Báo cáo và Chấm công dùng chung)
export function applyHrLayout() {
  if (!isHR()) return;
  ["followBox", "todoBox", "statsGrid", "recentCard", "ticketsTableWrap"].forEach(id =>
    document.getElementById(id)?.classList.add("hidden"));
  ["hrDashboard", "hrTicketFilters", "hrTicketRows"].forEach(id =>
    document.getElementById(id)?.classList.remove("hidden"));
  ["navPeriods"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.hidden = true;
  });
}
