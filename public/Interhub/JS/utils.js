// ============================================
// utils.js
// Hàm tiện ích: escape HTML, định dạng, tùy chọn chọn kỳ/bộ phận, tải CSV.
// ============================================

import { DemoStore } from "./db.js";
import { admin, state } from "./state.js";

// Định dạng yyyy-mm-dd -> dd/mm/yyyy
export function formatDate(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "—";
}

export function formatScore(value) {
  return typeof value === "number" ? value.toFixed(2) : "—";
}

export function average(values) {
  const nums = values.filter(v => typeof v === "number");
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}

// Trả về mã kỳ hợp lệ: ưu tiên kỳ đã chọn, sau đó kỳ đang mở, cuối cùng là kỳ đầu tiên
export function resolvePeriodId(selectedId) {
  const periods = DemoStore.listPeriods();
  if (periods.some(p => p.id === selectedId)) return selectedId;
  return (DemoStore.activePeriod() || periods[0] || {}).id || "";
}

export function periodOptions(selectedId) {
  const periods = DemoStore.listPeriods();
  if (!periods.length) return `<option value="">Chưa có kỳ nào</option>`;
  return periods
    .map(p => `<option value="${escapeHtml(p.id)}" ${p.id === selectedId ? "selected" : ""}>${escapeHtml(p.name || p.id)}</option>`)
    .join("");
}

export function departmentOptions(selected, allLabel = "Tất cả bộ phận") {
  return [
    `<option value="">${escapeHtml(allLabel)}</option>`,
    ...DemoStore.listDepartments().map(d =>
      `<option value="${escapeHtml(d.code)}" ${selected === d.code ? "selected" : ""}>${escapeHtml(d.code)} — ${escapeHtml(d.name)}</option>`)
  ].join("");
}

// Tải file CSV (có BOM để Excel đọc đúng tiếng Việt)
export function downloadCsv(filename, rows) {
  const cell = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const text = "\ufeff" + rows.map(r => r.map(cell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function isHR() {
  return state.userProfile?.role === "hr";
}

export function actorInfo() {
  return {
    uid: state.currentUser?.uid,
    name: state.userProfile?.fullName || state.currentUser?.email,
    role: state.userProfile?.role,
    department: state.userProfile?.department
  };
}

// Sắp xếp theo mã sinh viên
export function byInternId(list) {
  return [...list].sort((a, b) => String(a.internId).localeCompare(String(b.internId), "vi", { numeric: true }));
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export const html = (value = "") => String(value).replace(/[&<>"']/g, c => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
}[c]));

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function dateText(value) {
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

export function departmentLabel(code) {
  const found = admin.departments.find(item => item.code === code);
  return found ? `${found.code} — ${found.name}` : (code || "—");
}

// Đọc ngày dd/mm/yyyy, trả về yyyy-mm-dd (hoặc null nếu sai)
export function parseViewDate(text) {
  const m = String(text || "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const d = new Date(Number(m[3]), month - 1, day);
  if (d.getDate() !== day || d.getMonth() !== month - 1) return null;
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

// Hiển thị ngày dạng dd/mm/yyyy (dữ liệu lưu dạng yyyy-mm-dd)
export function viewDate(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (iso || "");
}
