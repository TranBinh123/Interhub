// ============================================
// db.js — Tầng truy cập dữ liệu
// ============================================
// Mọi module giao diện chỉ import dữ liệu từ file này, không import trực tiếp demo-store.js.
// Hiện tại nguồn dữ liệu là kho mô phỏng (localStorage) trong demo-store.js.
// Khi chuyển sang Firestore, chỉ cần thay phần hiện thực ở đây (hoặc trong demo-store.js)
// mà không phải sửa các module giao diện.
//
// Firestore (`firestore`) hiện chỉ dùng cho danh sách tài khoản ở trang quản trị.

import "./auth.js"; // khởi tạo Firebase app trước khi gọi getFirestore()
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import {
  DemoStore,
  STATUS,
  STATUS_LABEL,
  DEMO_BANNER,
  INTERN_COLUMNS,
  MEMBER_ROLES,
  formatDateTime
} from "./demo-store.js";

export const DATA_MODE = "demo"; // "demo" = localStorage, "firestore" = (chưa triển khai)

export const firestore = getFirestore();

export {
  DemoStore,
  STATUS,
  STATUS_LABEL,
  DEMO_BANNER,
  INTERN_COLUMNS,
  MEMBER_ROLES,
  formatDateTime
};
