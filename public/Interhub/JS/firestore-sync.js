// ============================================
// firestore-sync.js — Đồng bộ SVTT (collection `interns`) với Firestore
// ============================================
// Giai đoạn 2, bước 1: chỉ SVTT. Kỳ, phiếu, phòng ban và Tổ CTSV vẫn lưu trên trình duyệt.
//
// Đọc: khi tải trang, layout.js gọi loadInternsFromFirestore() và đưa kết quả vào kho mô phỏng.
//      Firestore Rules tự giới hạn: HR/Admin đọc tất cả; người hướng dẫn và TBP chỉ đọc phần được giao.
// Ghi: mỗi lần demo-store ghi dữ liệu, hook so sánh bản trước và bản sau, rồi chỉ gửi các SVTT đã đổi.
//      Các lượt ghi được xếp hàng để không chèn lên nhau.

import "./auth.js"; // khởi tạo Firebase app trước khi gọi getFirestore()
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { setPersistHook } from "./demo-store.js";

const INTERNS = "interns";
const BATCH_LIMIT = 400; // Firestore cho tối đa 500 thao tác mỗi batch

const db = getFirestore();
let queue = Promise.resolve();
let lastError = "";

// Bỏ giá trị undefined (Firestore không nhận), giữ null
function plain(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

// So sánh không phụ thuộc thứ tự khóa
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.keys(value).sort().reduce((out, key) => {
      out[key] = stable(value[key]);
      return out;
    }, {});
  }
  return value;
}

function sameData(a, b) {
  return JSON.stringify(stable(plain(a))) === JSON.stringify(stable(plain(b)));
}

function validId(id) {
  return typeof id === "string" && id.length > 0 && !id.includes("/");
}

// Danh sách thao tác cần gửi: SVTT mới hoặc đổi là set, SVTT bị xóa là delete
function diffInterns(prev, next) {
  const before = prev?.interns || {};
  const after = next?.interns || {};
  const ops = [];
  for (const id of Object.keys(after)) {
    if (!sameData(before[id], after[id])) ops.push({ id, data: after[id] });
  }
  for (const id of Object.keys(before)) {
    if (!(id in after)) ops.push({ id, remove: true });
  }
  return ops;
}

async function commit(ops) {
  for (let start = 0; start < ops.length; start += BATCH_LIMIT) {
    const batch = writeBatch(db);
    for (const op of ops.slice(start, start + BATCH_LIMIT)) {
      if (!validId(op.id)) throw new Error(`Mã SV không hợp lệ để lưu: "${op.id}"`);
      const ref = doc(db, INTERNS, op.id);
      if (op.remove) batch.delete(ref);
      else batch.set(ref, plain(op.data));
    }
    await batch.commit();
  }
}

function friendlyError(error) {
  if (error?.code === "permission-denied") {
    return "Tài khoản này không có quyền lưu thay đổi SVTT. Chỉ HR và Admin được sửa hồ sơ SVTT; người hướng dẫn chỉ lưu chấm công của SVTT được giao.";
  }
  return `Không lưu được SVTT lên Firestore: ${error?.message || error}`;
}

function onWrite(prev, next) {
  const ops = diffInterns(prev, next);
  if (!ops.length) return;
  queue = queue
    .then(() => commit(ops))
    .then(
      () => {
        lastError = "";
      },
      error => {
        lastError = friendlyError(error);
        console.error("[InternHub]", lastError, error);
      }
    );
}

setPersistHook(onWrite);

// Chờ các lượt ghi đang xếp hàng xong trước khi đọc lại (tránh đọc đè lên dữ liệu vừa sửa)
export function waitForSync() {
  return queue;
}

export function internSyncError() {
  return lastError;
}

// Đọc SVTT theo quyền của tài khoản. Trả về null nếu vai trò không được đọc SVTT.
export async function loadInternsFromFirestore(profile, uid) {
  await waitForSync();
  if (!profile || !uid) return null;

  const col = collection(db, INTERNS);
  const role = profile.role;
  const isAdmin = role === "admin" || profile.adminGranted === true;

  let q = null;
  if (isAdmin || role === "hr") {
    q = col;
  } else if (role === "mentor") {
    q = query(col, where("evaluatorUid", "==", uid));
  } else if (role === "supervisor" && profile.department) {
    q = query(col, where("department", "==", profile.department));
  }
  if (!q) return null;

  const snapshot = await getDocs(q);
  const interns = {};
  snapshot.forEach(item => {
    interns[item.id] = item.data();
  });
  return interns;
}
