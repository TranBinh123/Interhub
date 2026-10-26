// ============================================
// Firebase Configuration & Constants
// ============================================

// JS/firebase-config.js
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Admin credentials
export const ADMIN_CREDENTIALS = {
  username: "admin",
  passwordHash: null // Will be set during first login setup
};

// Firestore Collections (Đầy đủ theo yêu cầu hệ thống đánh giá thực tập sinh)
export const COLLECTIONS = {
  USERS: "users",             // Registered users
  TICKETS: "tickets",         // Evaluation tickets
  PERIODS: "periods",         // Evaluation periods
  DEPARTMENTS: "departments",
  ITEMS: "evaluation_items",  // Criteria items
  LOGS: "activity_logs"
};

// User roles (Mở rộng đầy đủ các cấp độ quyền)
export const ROLES = {
  ADMIN: "admin",
  HR: "hr",                   // Phòng Nhân sự
  SUPERVISOR: "supervisor",   // Trưởng bộ phận
  INTERN: "intern",
  USER: "user"                // Dự phòng tương thích
};

// User approval statuses
export const USER_STATUS = {
  PENDING: "pending",         // Chờ phê duyệt
  APPROVED: "approved",       // Đã phê duyệt
  REJECTED: "rejected"        // Từ chối
};
