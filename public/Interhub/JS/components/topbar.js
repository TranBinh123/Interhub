// ============================================
// components/topbar.js
// Thanh trên cùng: tiêu đề trang, lời chào, người dùng, nút mở menu.
// ============================================

import { showMessage } from "./messages.js";
import { MEMBER_ROLES } from "../db.js";
import { state } from "../state.js";
import { escapeHtml } from "../utils.js";

// Khối người dùng, chuông thông báo và nút mở menu trên thanh trên cùng
export function setupTopbar() {
  const profile = state.userProfile;
  const roleLabel = MEMBER_ROLES[profile?.role] || profile?.role || "—";
  document.getElementById("topbarUserName").textContent = profile?.fullName || state.currentUser.email;
  document.getElementById("topbarUserRole").textContent = roleLabel;
  document.getElementById("notifBtn")?.addEventListener("click", () => showMessage("success", "Không có thông báo mới."));
  document.getElementById("menuToggle").addEventListener("click", () => {
    document.getElementById("appContainer").classList.toggle("sidebar-open");
  });
  applyPageHeader("dashboard");
}

// Tiêu đề + lời chào trên topbar theo từng trang
export function applyPageHeader(viewName) {
  const h1 = document.getElementById("pageTitle");
  const p = document.getElementById("pageSubtitle");
  if (!h1 || !p) return;

  if (viewName === "dashboard") {
    h1.innerHTML = `👋 Xin chào, ${escapeHtml(state.userProfile?.fullName || "bạn")}!`;
    p.textContent = "Chúc bạn một ngày làm việc hiệu quả!";
    return;
  }

  const titles = {
    evaluations: "Phiếu đánh giá",
    periods: "Các kỳ đánh giá",
    assignments: "Phân công đánh giá",
    interns: "Thực tập sinh",
    timesheet: "Chấm công",
    reports: "Báo cáo"
  };
  h1.textContent = titles[viewName] || "—";
  p.textContent = "";
}
