// ============================================
// Firebase Configuration
// ============================================

// Firebase config từ Console
export const firebaseConfig = {
  apiKey: "AIzaSyCawDFnIgAWa8lE9ArBA3s0Zmcileyx_zU",
  authDomain: "bnc-interhub.firebaseapp.com",
  projectId: "bnc-interhub",
  storageBucket: "bnc-interhub.firebasestorage.app",
  messagingSenderId: "889463162947",
  appId: "1:889463162947:web:7625ec797d2dabb8062cf6"
};

// Admin credentials (stored securely on server in production)
// For now, this will be set during app initialization
export const ADMIN_CREDENTIALS = {
  username: "admin",
  passwordHash: null  // Will be set during first login setup
};

// Firestore Collections
export const COLLECTIONS = {
  USERS: "users",           // Registered users
  TICKETS: "tickets",       // Evaluation tickets
  PERIODS: "periods",       // Evaluation periods
  DEPARTMENTS: "departments",
  ITEMS: "evaluation_items", // 15 criteria items
  LOGS: "activity_logs"
};

// User roles
export const ROLES = {
  ADMIN: "admin",
  HR: "hr",                 // Phòng Nhân sự
  SUPERVISOR: "supervisor", // Trưởng bộ phận
  INTERN: "intern"
};

// User approval statuses
export const USER_STATUS = {
  PENDING: "pending",       // Chờ phê duyệt
  APPROVED: "approved",     // Đã phê duyệt
  REJECTED: "rejected"      // Từ chối
};
