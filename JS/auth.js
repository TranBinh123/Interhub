import { initializeApp, getApp, getApps } from
  "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

import {
  firebaseConfig,
  COLLECTIONS,
  USER_STATUS,
  ROLES
} from "./firebase-config.js";

const ADMIN_EMAIL = "dptbinh193@gmail.com";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

let currentUser = null;
let authInitialized = false;
let authReadyPromise;

const authReady = new Promise(resolve => {
  authReadyPromise = resolve;
});

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isAdminEmail(user) {
  return normalizeEmail(user?.email) === ADMIN_EMAIL;
}

function showMessage(elementId, message, type = "error") {
  const el = document.getElementById(elementId);
  if (!el) {
    console.info(message);
    return;
  }

  el.textContent = message;
  el.classList.remove("show");
  el.classList.add("show");
  el.dataset.type = type;
}

function clearMessage(elementId) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = "";
    el.classList.remove("show");
  }
}

function showSignupForm(user) {
  const loginStep = document.getElementById("googleSigninStep");
  const signupForm = document.getElementById("userSignupForm");
  const emailInput = document.getElementById("userEmail");

  if (loginStep) loginStep.style.display = "none";
  if (signupForm) signupForm.style.display = "block";
  if (emailInput) emailInput.value = user.email || "";

  clearMessage("userError");
}

function showGoogleLogin() {
  const loginStep = document.getElementById("googleSigninStep");
  const signupForm = document.getElementById("userSignupForm");

  if (loginStep) loginStep.style.display = "block";
  if (signupForm) signupForm.style.display = "none";
}

// ✅ FIX 1: Update redirectToApp() để redirect HR/Supervisor sang app.html
function redirectToApp(role) {
  if (role === ROLES.ADMIN) {
    setTimeout(() => {
  window.location.href = "./admin.html";
}, 100);
    return;
  }

  // HR & Supervisor chuyển sang app.html
  if (role === ROLES.HR || role === ROLES.SUPERVISOR) {
    setTimeout(() => {
  window.location.href = "./app.html";
}, 100);
    return;
  }

  console.info("Tài khoản đã được duyệt với vai trò:", role);
}

async function getUserProfile(uid) {
  const userRef = doc(db, COLLECTIONS.USERS, uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) return null;

  return {
    id: snapshot.id,
    ...snapshot.data()
  };
}

async function processSignedInUser(user) {
  if (!user) return;

  if (isAdminEmail(user)) {
    const adminTab = document.getElementById("admin");
    if (adminTab) {
      setTimeout(() => {
  window.location.href = "./admin.html";
}, 100);
    }
    return;
  }

  try {
    const profile = await getUserProfile(user.uid);

    if (!profile) {
      showSignupForm(user);
      return;
    }

    if (profile.status === USER_STATUS.APPROVED && profile.isActive === true) {
      redirectToApp(profile.role);
    } else if (profile.status === USER_STATUS.PENDING) {
      showMessage(
        "userSuccess",
        "Thông tin của bạn đang chờ Admin phê duyệt.",
        "success"
      );
      showGoogleLogin();
    } else if (profile.status === USER_STATUS.REJECTED) {
      showMessage(
        "userError",
        "Tài khoản đã bị từ chối. Vui lòng liên hệ quản trị viên."
      );
      showGoogleLogin();
    } else {
      showSignupForm(user);
    }
  } catch (error) {
    console.error("Không thể kiểm tra hồ sơ:", error);
    showMessage(
      "userError",
      "Không thể kiểm tra tài khoản. Vui lòng kiểm tra Firestore Rules rồi thử lại."
    );
  }
}

export function initializeAuth() {
  if (authInitialized) return;
  authInitialized = true;

  onAuthStateChanged(auth, async user => {
    currentUser = user;

    if (!authReadySettled) {
      authReadySettled = true;
      authReadyResolve(user);
    }

    if (user && window.location.pathname.endsWith("/admin.html")) {
      return;
    }

    if (user) {
      await processSignedInUser(user);
    }
  });
}

let authReadySettled = false;
let authReadyResolve;

const readyPromise = new Promise(resolve => {
  authReadyResolve = resolve;
});

export async function waitForUser() {
  initializeAuth();

  if (auth.currentUser) {
    currentUser = auth.currentUser;
    return currentUser;
  }

  return await readyPromise;
}

export async function handleGoogleSignIn() {
  clearMessage("userError");
  clearMessage("userSuccess");

  try {
    const result = await signInWithPopup(auth, googleProvider);
    currentUser = result.user;

    if (isAdminEmail(currentUser)) {
      setTimeout(() => {
  window.location.href = "./admin.html";
}, 100);
      return currentUser;
    }

    await processSignedInUser(currentUser);
    return currentUser;
  } catch (error) {
    console.error("Google Sign-in error:", error);

    showMessage(
      "userError",
      error.code === "auth/popup-closed-by-user"
        ? "Bạn đã đóng cửa sổ đăng nhập Google."
        : "Đăng nhập Google thất bại. Vui lòng thử lại."
    );

    throw error;
  }
}

// ✅ FIX 2: Thêm auto-check status sau submit
export async function handleUserSubmit(formData) {
  if (!currentUser) {
    showMessage("userError", "Vui lòng đăng nhập bằng Google trước.");
    return false;
  }

  if (isAdminEmail(currentUser)) {
    setTimeout(() => {
  window.location.href = "./admin.html";
}, 100);
    return false;
  }

  const fullName = String(formData.fullName || "").trim();
  const department = String(formData.department || "").trim();

  if (!fullName || !department) {
    showMessage("userError", "Vui lòng nhập họ tên và chọn bộ phận.");
    return false;
  }

  try {
    const userRef = doc(db, COLLECTIONS.USERS, currentUser.uid);
    const existing = await getDoc(userRef);

    if (existing.exists()) {
      showMessage(
        "userError",
        "Tài khoản đã được đăng ký. Nếu đang chờ duyệt, vui lòng liên hệ Admin."
      );
      return false;
    }

    await setDoc(userRef, {
      uid: currentUser.uid,
      email: normalizeEmail(currentUser.email),
      fullName,
      department,
      role: null,
      status: USER_STATUS.PENDING,
      isActive: false,
      createdAt: serverTimestamp(),
      approvedAt: null,
      approvedBy: null,
      lastLogin: serverTimestamp()
    });

    showMessage(
      "userSuccess",
      "✓ Đã gửi thông tin đăng ký. Vui lòng chờ Admin kiểm tra và phê duyệt.",
      "success"
    );

    const form = document.getElementById("userSignupForm");
    if (form) {
      for (const element of form.elements) {
        if (element.id !== "userEmail") element.disabled = true;
      }
    }

    // Auto-check status after 2 seconds (in case admin approved immediately)
    setTimeout(async () => {
      try {
        const profile = await getUserProfile(currentUser.uid);
        if (profile && profile.status === USER_STATUS.APPROVED && profile.isActive) {
          redirectToApp(profile.role);
        }
      } catch (error) {
        console.log("Auto-check status done");
      }
    }, 2000);

    return true;
  } catch (error) {
    console.error("User registration error:", error);

    showMessage(
      "userError",
      "Không thể gửi đăng ký. Vui lòng kiểm tra Firestore Rules rồi thử lại."
    );
    return false;
  }
}

export async function handleAdminLogin() {
  clearMessage("adminError");

  try {
    const result = await signInWithPopup(auth, googleProvider);
    currentUser = result.user;

    if (!isAdminEmail(currentUser)) {
      await signOut(auth);
      currentUser = null;

      showMessage(
        "adminError",
        "Không có quyền Admin. Hãy đăng nhập bằng email được cấp quyền."
      );
      return false;
    }

    setTimeout(() => {
  window.location.href = "./admin.html";
}, 100);
    return true;
  } catch (error) {
    console.error("Admin sign-in error:", error);

    showMessage(
      "adminError",
      "Không thể đăng nhập Admin bằng Google. Vui lòng thử lại."
    );
    return false;
  }
}

export async function approveUser(userId, role) {
  if (!isAdminEmail(currentUser)) {
    showMessage("adminError", "Bạn không có quyền duyệt tài khoản.");
    return false;
  }

  if (![ROLES.HR, ROLES.SUPERVISOR].includes(role)) {
    showMessage("adminError", "Vai trò được chọn không hợp lệ.");
    return false;
  }

  try {
    await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
      role,
      status: USER_STATUS.APPROVED,
      isActive: true,
      approvedAt: serverTimestamp(),
      approvedBy: currentUser.uid
    });

    return true;
  } catch (error) {
    console.error("Approve user error:", error);
    return false;
  }
}

export async function rejectUser(userId, reason) {
  if (!isAdminEmail(currentUser)) {
    showMessage("adminError", "Bạn không có quyền từ chối tài khoản.");
    return false;
  }

  try {
    await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
      status: USER_STATUS.REJECTED,
      isActive: false,
      approvedAt: serverTimestamp(),
      approvedBy: currentUser.uid,
      rejectionReason: String(reason || "Không nêu lý do").trim()
    });

    return true;
  } catch (error) {
    console.error("Reject user error:", error);
    return false;
  }
}

export async function handleSignOut() {
  try {
    await signOut(auth);
    currentUser = null;
  } catch (error) {
    console.error("Sign out error:", error);
  }
}

export const Auth = {
  init: initializeAuth,
  waitForUser,
  googleSignIn: handleGoogleSignIn,
  userSubmit: handleUserSubmit,
  adminLogin: handleAdminLogin,
  approveUser,
  rejectUser,
  signOut: handleSignOut,
  getCurrentUser: () => currentUser,
  getCurrentEmail: () => currentUser?.email || null
};
