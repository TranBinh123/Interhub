// ============================================
// Authentication Module - Firebase + Google Sign-in
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { firebaseConfig, COLLECTIONS, USER_STATUS, ROLES } from "./firebase-config.js";

// ============================================
// Initialize Firebase
// ============================================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// ============================================
// Global State
// ============================================
let currentUser = null;
let currentUserEmail = null;

// ============================================
// Initialize Auth
// ============================================
export function initializeAuth() {
  // Listen for auth state changes
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      currentUserEmail = user.email;
      console.log("User logged in:", user.email);

      // Show user form after Google login
      simulateGoogleLoginSuccess(user.email);

      // Check if user already registered
      checkUserRegistration(user.email);
    } else {
      currentUser = null;
      currentUserEmail = null;
      console.log("User logged out");
    }
  });
}

// ============================================
// Google Sign-in
// ============================================
export async function handleGoogleSignIn() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    console.log("Google Sign-in successful:", user.email);
    return user;
  } catch (error) {
    console.error("Google Sign-in error:", error);
    showError("googleSigninBtn", "Đăng nhập Google thất bại: " + error.message);
    throw error;
  }
}

// ============================================
// Simulate Google Login Success (for UI)
// ============================================
function simulateGoogleLoginSuccess(email) {
  document.getElementById('googleSigninStep').style.display = 'none';
  document.getElementById('userSignupForm').style.display = 'block';
  document.getElementById('userEmail').value = email;
}

// ============================================
// User Registration (Submit Form)
// ============================================
export async function handleUserSubmit(formData) {
  if (!currentUser) {
    showError('userError', 'Vui lòng đăng nhập bằng Google trước');
    return false;
  }

  try {
    // Check if user already exists
    const existingUser = await getUserByEmail(currentUserEmail);
    if (existingUser) {
      showError('userError', 'Tài khoản đã được đăng ký. Chờ Admin phê duyệt.');
      return false;
    }

    // Create user document
    const userData = {
      uid: currentUser.uid,
      email: currentUserEmail,
      fullName: formData.fullName,
      position: formData.position,
      department: formData.department,
      role: null,  // Will be set by admin
      status: USER_STATUS.PENDING,
      createdAt: serverTimestamp(),
      approvedAt: null,
      approvedBy: null,
      lastLogin: serverTimestamp(),
      isActive: false  // Not active until admin approves
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.USERS), userData);
    console.log("User registered:", docRef.id);

    showSuccess('userSuccess', 'Thông tin đã được gửi. Admin sẽ kiểm tra và phê duyệt trong vòng 24 giờ.');
    return true;
  } catch (error) {
    console.error("User registration error:", error);
    showError('userError', 'Lỗi đăng ký: ' + error.message);
    return false;
  }
}

// ============================================
// Check User Registration Status
// ============================================
export async function checkUserRegistration(email) {
  try {
    const user = await getUserByEmail(email);
    if (user) {
      if (user.status === USER_STATUS.APPROVED) {
        console.log("User is approved:", user.role);
        // Redirect to main app
        redirectToApp(user.role);
      } else if (user.status === USER_STATUS.PENDING) {
        showMessage('userSuccess', 'Tài khoản đang chờ Admin phê duyệt...');
      } else if (user.status === USER_STATUS.REJECTED) {
        showError('userError', 'Tài khoản của bạn đã bị từ chối.');
      }
    }
  } catch (error) {
    console.error("Error checking registration:", error);
  }
}

// ============================================
// Get User by Email
// ============================================
async function getUserByEmail(email) {
  try {
    const q = query(collection(db, COLLECTIONS.USERS), where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    return null;
  } catch (error) {
    console.error("Error getting user:", error);
    return null;
  }
}

// ============================================
// Admin Login (Username + Password)
// ============================================
export async function handleAdminLogin(username, password) {
  try {
    // TODO: Implement admin authentication
    // For now, validate against hardcoded credentials
    // In production, use a secure backend endpoint

    if (username === "admin" && password === "admin123") {
      console.log("Admin logged in");
      redirectToApp(ROLES.ADMIN);
      return true;
    } else {
      showError('adminError', 'Tên đăng nhập hoặc mật khẩu không đúng');
      return false;
    }
  } catch (error) {
    console.error("Admin login error:", error);
    showError('adminError', 'Lỗi đăng nhập: ' + error.message);
    return false;
  }
}

// ============================================
// Approve/Reject User (Admin Function)
// ============================================
export async function approveUser(userId, role) {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await updateDoc(userRef, {
      status: USER_STATUS.APPROVED,
      role: role,
      isActive: true,
      approvedAt: serverTimestamp(),
      approvedBy: currentUser.uid
    });
    console.log("User approved:", userId);
    return true;
  } catch (error) {
    console.error("Error approving user:", error);
    return false;
  }
}

export async function rejectUser(userId, reason) {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await updateDoc(userRef, {
      status: USER_STATUS.REJECTED,
      isActive: false,
      approvedAt: serverTimestamp(),
      approvedBy: currentUser.uid
    });
    console.log("User rejected:", userId);
    return true;
  } catch (error) {
    console.error("Error rejecting user:", error);
    return false;
  }
}

// ============================================
// Sign Out
// ============================================
export async function handleSignOut() {
  try {
    await signOut(auth);
    currentUser = null;
    currentUserEmail = null;
    console.log("User signed out");
  } catch (error) {
    console.error("Sign out error:", error);
  }
}

// ============================================
// UI Helpers
// ============================================
function showError(elementId, message) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = message;
    el.classList.add('show');
  }
}

function showSuccess(elementId, message) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = message;
    el.classList.add('show');
  }
}

function showMessage(elementId, message) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = message;
    el.classList.add('show');
  }
}

function redirectToApp(role) {
  // Redirect to main app based on role
  // TODO: Implement routing logic
  console.log("Redirect to app with role:", role);
  // window.location.href = '/app.html?role=' + role;
}

// ============================================
// Export public API
// ============================================
export const Auth = {
  init: initializeAuth,
  googleSignIn: handleGoogleSignIn,
  userSubmit: handleUserSubmit,
  adminLogin: handleAdminLogin,
  approveUser: approveUser,
  rejectUser: rejectUser,
  signOut: handleSignOut,
  getCurrentUser: () => currentUser,
  getCurrentEmail: () => currentUserEmail
};
