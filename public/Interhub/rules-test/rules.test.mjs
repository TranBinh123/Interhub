// Kiểm thử Firestore Rules trên Emulator. Chạy: npm install && npm test
import { readFileSync } from "node:fs";
import { before, after, beforeEach, test } from "node:test";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";

const RULES = readFileSync(new URL("../../data/firestore.rules", import.meta.url), "utf8");
let env;

before(async () => {
  env = await initializeTestEnvironment({ projectId: "internhub-rules-test", firestore: { rules: RULES } });
});
after(async () => { await env.cleanup(); });

const SCORES = Array(15).fill(7);

async function seed() {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const user = (uid, data) => setDoc(doc(db, "users", uid), { uid, email: `${uid}@test.vn`, fullName: uid, isActive: true, status: "approved", ...data });
    await user("hr1", { role: "hr", department: "" });
    await user("tbp1", { role: "supervisor", department: "HD" });
    await user("tbp2", { role: "supervisor", department: "CT" });
    await user("mentor1", { role: "mentor", department: "HD" });
    await user("mentor2", { role: "mentor", department: "HD" });
    await user("com1", { role: "committee", department: "" });
    await setDoc(doc(db, "users", "pending1"), { uid: "pending1", email: "pending1@test.vn", fullName: "pending1", status: "pending", isActive: false });

    await setDoc(doc(db, "departments", "HD"), { code: "HD", name: "Hành chính" });
    await setDoc(doc(db, "departments", "CT"), { code: "CT", name: "Căn tin" });

    await setDoc(doc(db, "interns", "I1"), { internId: "I1", department: "HD", evaluatorUid: "mentor1", evaluatorAssigned: true, attendance: {} });

    const ticket = (id, o) => setDoc(doc(db, "tickets", id), {
      id, periodId: "EV-2026-11", department: "HD", internId: id, scores: Array(15).fill(null),
      committeeParts: null, committeeScore: null, committeeReason: "", strengths: "", improvements: "",
      sendCount: 0, returnReason: "", history: [], updatedAt: "t0", ...o
    });
    // T1: mentor1 đang chấm; T2: chờ TBP duyệt; T3: TBP tự đánh giá; T4: chờ Tổ CTSV; T5: đã chốt
    await ticket("EV-2026-11-I1", { evaluatorUid: "mentor1", evaluatorAssigned: true, status: "dang_thuc_hien", committeeUid: "com1" });
    await ticket("EV-2026-11-I2", { evaluatorUid: "mentor1", evaluatorAssigned: true, status: "cho_truong_bo_phan", committeeUid: "com1" });
    await ticket("EV-2026-11-I3", { evaluatorUid: null, evaluatorAssigned: true, status: "dang_thuc_hien", committeeUid: "com1" });
    await ticket("EV-2026-11-I4", { evaluatorUid: "mentor1", evaluatorAssigned: true, status: "cho_to_cong_tac", committeeUid: "com1" });
    await ticket("EV-2026-11-I5", { evaluatorUid: "mentor1", evaluatorAssigned: true, status: "da_chot", committeeUid: "com1", committeeScore: 8 });
  });
}

beforeEach(async () => { await env.clearFirestore(); await seed(); });

const as = (uid, email = `${uid}@test.vn`, verified = true) =>
  env.authenticatedContext(uid, { email, email_verified: verified }).firestore();
const ref = (db, path) => doc(db, ...path.split("/"));

// ---------- Tài khoản ----------
test("người dùng đọc hồ sơ của mình được, của người khác thì không", async () => {
  await assertSucceeds(getDoc(ref(as("mentor1"), "users/mentor1")));
  await assertFails(getDoc(ref(as("mentor1"), "users/mentor2")));
});

test("người dùng không tự đổi được vai trò của mình", async () => {
  await assertFails(updateDoc(ref(as("mentor1"), "users/mentor1"), { role: "hr" }));
});

test("người dùng được đổi tên hiển thị của mình", async () => {
  await assertSucceeds(updateDoc(ref(as("mentor1"), "users/mentor1"), { fullName: "Nguyễn Văn A" }));
});

test("đăng ký mới: tạo hồ sơ chờ duyệt không có vai trò được", async () => {
  const db = as("newuser");
  await assertSucceeds(setDoc(ref(db, "users/newuser"), { uid: "newuser", email: "newuser@test.vn", status: "pending", isActive: false }));
});

test("đăng ký mới: không tự gán được vai trò hr", async () => {
  const db = as("newuser2");
  await assertFails(setDoc(ref(db, "users/newuser2"), { uid: "newuser2", email: "newuser2@test.vn", status: "pending", role: "hr" }));
});

test("tài khoản chưa xác minh email không đọc được dữ liệu", async () => {
  await assertFails(getDoc(ref(as("mentor1", "mentor1@test.vn", false), "departments/HD")));
});

test("tài khoản chờ duyệt không đọc được danh mục bộ phận", async () => {
  await assertFails(getDoc(ref(as("pending1"), "departments/HD")));
});

test("HR không có cờ adminGranted không được đổi vai trò người khác", async () => {
  await assertFails(updateDoc(ref(as("hr1"), "users/mentor2"), { role: "supervisor" }));
});

test("Admin kỹ thuật (đúng email) được đổi vai trò", async () => {
  const db = as("super1", "dptbinh193@gmail.com", true);
  await assertSucceeds(updateDoc(ref(db, "users/mentor2"), { role: "supervisor", department: "CT" }));
});

// ---------- Phiếu: đọc ----------
test("người hướng dẫn đọc được phiếu của mình, không đọc được phiếu của người khác", async () => {
  await assertSucceeds(getDoc(ref(as("mentor1"), "tickets/EV-2026-11-I1")));
  await assertFails(getDoc(ref(as("mentor2"), "tickets/EV-2026-11-I1")));
});

test("TBP đọc được phiếu chờ duyệt của bộ phận mình", async () => {
  await assertSucceeds(getDoc(ref(as("tbp1"), "tickets/EV-2026-11-I2")));
});

test("TBP không đọc được phiếu đang do người hướng dẫn làm", async () => {
  await assertFails(getDoc(ref(as("tbp1"), "tickets/EV-2026-11-I1")));
});

test("TBP khác bộ phận không đọc được phiếu chờ duyệt", async () => {
  await assertFails(getDoc(ref(as("tbp2"), "tickets/EV-2026-11-I2")));
});

test("TBP đọc được phiếu tự đánh giá của bộ phận mình", async () => {
  await assertSucceeds(getDoc(ref(as("tbp1"), "tickets/EV-2026-11-I3")));
});

test("Tổ CTSV đọc được phiếu được giao, không đọc được phiếu khác", async () => {
  await assertSucceeds(getDoc(ref(as("com1"), "tickets/EV-2026-11-I4")));
  await assertFails(getDoc(ref(as("mentor1"), "tickets/EV-2026-11-I4")));
});

// ---------- Phiếu: ghi ----------
test("người hướng dẫn lưu điểm phiếu của mình", async () => {
  await assertSucceeds(updateDoc(ref(as("mentor1"), "tickets/EV-2026-11-I1"), { scores: SCORES, updatedAt: "t1" }));
});

test("người hướng dẫn gửi phiếu lên TBP", async () => {
  await assertSucceeds(updateDoc(ref(as("mentor1"), "tickets/EV-2026-11-I1"), { status: "cho_truong_bo_phan", updatedAt: "t1" }));
});

test("người hướng dẫn không tự chốt được phiếu", async () => {
  await assertFails(updateDoc(ref(as("mentor1"), "tickets/EV-2026-11-I1"), { status: "da_chot", updatedAt: "t1" }));
});

test("người hướng dẫn không sửa được phiếu đang chờ TBP", async () => {
  await assertFails(updateDoc(ref(as("mentor1"), "tickets/EV-2026-11-I2"), { scores: SCORES, updatedAt: "t1" }));
});

test("người hướng dẫn không ghi được điểm Tổ CTSV", async () => {
  await assertFails(updateDoc(ref(as("mentor1"), "tickets/EV-2026-11-I1"), { committeeScore: 8, updatedAt: "t1" }));
});

test("TBP duyệt phiếu chờ duyệt rồi gửi Tổ CTSV", async () => {
  await assertSucceeds(updateDoc(ref(as("tbp1"), "tickets/EV-2026-11-I2"), { status: "cho_to_cong_tac", updatedAt: "t1" }));
});

test("TBP trả phiếu về người hướng dẫn", async () => {
  await assertSucceeds(updateDoc(ref(as("tbp1"), "tickets/EV-2026-11-I2"), { status: "tra_ve", returnReason: "Bổ sung nhận xét", updatedAt: "t1" }));
});

test("TBP không đổi được người đánh giá của phiếu", async () => {
  await assertFails(updateDoc(ref(as("tbp1"), "tickets/EV-2026-11-I2"), { status: "cho_to_cong_tac", evaluatorUid: "mentor2", updatedAt: "t1" }));
});

test("TBP tự đánh giá lưu điểm được", async () => {
  await assertSucceeds(updateDoc(ref(as("tbp1"), "tickets/EV-2026-11-I3"), { scores: SCORES, updatedAt: "t1" }));
});

test("Tổ CTSV chốt phiếu khi có điểm", async () => {
  await assertSucceeds(updateDoc(ref(as("com1"), "tickets/EV-2026-11-I4"), {
    committeeParts: [4, 3], committeeScore: 7, committeeReason: "Chấp hành nội quy tốt, tích cực tham gia phong trào", status: "da_chot", updatedAt: "t1"
  }));
});

test("Tổ CTSV không sửa được phiếu đã chốt", async () => {
  await assertFails(updateDoc(ref(as("com1"), "tickets/EV-2026-11-I5"), { committeeScore: 9, updatedAt: "t1" }));
});

test("HR được mở lại phiếu đã chốt", async () => {
  await assertSucceeds(updateDoc(ref(as("hr1"), "tickets/EV-2026-11-I5"), { status: "tra_ve", returnReason: "Mở lại sau khi chốt: sửa lỗi nhập", updatedAt: "t1" }));
});

// ---------- Thực tập sinh & chấm công ----------
test("người hướng dẫn chấm công SVTT của mình", async () => {
  await assertSucceeds(updateDoc(ref(as("mentor1"), "interns/I1"), { attendance: { "2026-11-03": "X" }, updatedAt: "t1" }));
});

test("người hướng dẫn khác không chấm công được SVTT này", async () => {
  await assertFails(updateDoc(ref(as("mentor2"), "interns/I1"), { attendance: { "2026-11-03": "X" }, updatedAt: "t1" }));
});

test("người hướng dẫn không sửa được hồ sơ SVTT (tên, bộ phận)", async () => {
  await assertFails(updateDoc(ref(as("mentor1"), "interns/I1"), { fullName: "Sửa tên" }));
});

test("HR quản lý được hồ sơ SVTT", async () => {
  await assertSucceeds(updateDoc(ref(as("hr1"), "interns/I1"), { fullName: "Nguyễn Văn B" }));
});

// ---------- Danh mục ----------
test("HR ghi được danh mục bộ phận và kỳ", async () => {
  await assertSucceeds(setDoc(ref(as("hr1"), "periods/EV-2026-12"), { id: "EV-2026-12", month: "2026-12", status: "dang_mo" }));
});

test("người hướng dẫn không ghi được danh mục bộ phận", async () => {
  await assertFails(setDoc(ref(as("mentor1"), "departments/XX"), { code: "XX", name: "Sai" }));
});
