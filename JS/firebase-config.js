
 // ============================================
 // Firebase Configuration & Constants
 // ============================================

 // Điền giá trị lấy từ Firebase Console
 // Project settings > General > Your apps > SDK setup and configuration
 export const firebaseConfig = {
  apiKey: "AIzaSyCawDFnIgAWa8lE9ArBA3s0Zmcileyx_zU",
  authDomain: "bnc-interhub.firebaseapp.com",
  projectId: "bnc-interhub",
  storageBucket: "bnc-interhub.firebasestorage.app",
  messagingSenderId: "889463162947",
  appId: "1:889463162947:web:7625ec797d2dabb8062cf6"
 };

 // Admin credentials
 export const ADMIN_CREDENTIALS = {
   username: "admin",
   passwordHash: null
 };

 // Firestore Collections
 export const COLLECTIONS = {
   USERS: "users",
   TICKETS: "tickets",
   PERIODS: "periods",
   DEPARTMENTS: "departments",
   ITEMS: "evaluation_items",
   LOGS: "activity_logs"
 };

 // User roles
 export const ROLES = {
   ADMIN: "admin",
   HR: "hr",
   SUPERVISOR: "supervisor",
   MENTOR: "mentor",
   INTERN: "intern",
   USER: "user"
 };

 // User approval statuses
 export const USER_STATUS = {
   PENDING: "pending",
   APPROVED: "approved",
   REJECTED: "rejected"
 };
