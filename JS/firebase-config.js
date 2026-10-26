// ============================================
// Firebase Configuration
// ============================================

// JS/firebase-config.js
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export default firebaseConfig;

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
