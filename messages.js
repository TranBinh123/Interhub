// ============================================
// components/messages.js
// Thông báo: toast ở app.html, banner dữ liệu mô phỏng, thông báo/loading ở trang quản trị.
// ============================================

import { DEMO_BANNER } from "../db.js";
import { admin } from "../state.js";
import { escapeHtml } from "../utils.js";

// Banner nhắc dữ liệu mô phỏng, đặt ngay trên khu vực thông báo
export function showDemoBanner() {
  const anchor = document.getElementById("successMessage");
  if (anchor && !document.getElementById("demoBanner")) {
    anchor.insertAdjacentHTML("beforebegin",
      `<div id="demoBanner" class="message show" style="background:#fff7ed;color:#9a3412;">${escapeHtml(DEMO_BANNER)}</div>`);
  }
}

export function showMessage(type, text, duration = 4000) {
  const el = document.getElementById(type + "Message");
  if (el) {
    el.textContent = text;
    el.classList.add("show");
    if (duration) {
      setTimeout(() => el.classList.remove("show"), duration);
    }
  }
}

export function announce(message, type = "success") {
  const target = admin.mountNode?.querySelector("[data-admin-notice]");

  if (!target) {
    console.info(`[InternHub Admin] ${message}`);
    return;
  }

  target.textContent = message;
  target.dataset.type = type;
  target.hidden = false;
}

export function showLoading(isLoading) {
  const node = admin.mountNode?.querySelector("[data-admin-loading]");
  if (node) node.hidden = !isLoading;
}
