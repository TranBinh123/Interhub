// ============================================
// DEMO STORE — DỮ LIỆU MÔ PHỎNG (prototype)
// ============================================
// Không ghi Firestore. Dữ liệu giả lập được lưu trong sessionStorage của
// trình duyệt, nên chỉ tồn tại trong tab hiện tại; bấm "Làm mới" sẽ tạo lại.
//
// Cấu trúc hạng mục, công thức điểm và luồng trạng thái theo README mục 2.3, 2.4, 2.5.
//
// CHỜ XÁC NHẬN (chưa đưa vào quyết định):
//  - Thang điểm chi tiết (đang dùng 0–10, bước 0.5; README ghi thang 10).
//  - Thang xếp loại: không hiển thị vì README chưa có quy định.
//  - Quy tắc làm tròn: chỉ làm tròn 2 chữ số khi hiển thị.
//  - Các ô nhận xét HR / Tổ công tác: README chưa có, giữ theo form hiện có.

export const DEMO_BANNER =
  "DỮ LIỆU MÔ PHỎNG — chưa kết nối cơ sở dữ liệu. Thay đổi chỉ lưu trên trình duyệt này.";

const STORAGE_KEY = "internhub-demo-v1";
const SEED = 20261027;
const INTERN_COUNT = 520;

export const PERIOD = { id: "EV-2026-10", label: "Tháng 10/2026" };

export const STATUS = {
  NOT_STARTED: "chua_bat_dau",
  IN_PROGRESS: "dang_thuc_hien",
  WAITING: "cho_xac_nhan",
  RETURNED: "tra_ve",
  FINALIZED: "da_chot"
};

export const STATUS_LABEL = {
  chua_bat_dau: "Chưa bắt đầu",
  dang_thuc_hien: "Đang thực hiện",
  cho_xac_nhan: "Chờ Đào tạo xác nhận",
  tra_ve: "Trả về bổ sung",
  da_chot: "Đã chốt"
};

// 15 hạng mục theo README mục 2.3: Phần I (5), Phần II (4), Phần III (6)
export const ITEMS = [
  { key: "I.1", part: 0, label: "Hình ảnh chỉn chu: trang phục, đầu tóc, khuôn mặt, phụ kiện và vệ sinh." },
  { key: "I.2", part: 0, label: "Ý thức giữ gìn vệ sinh chung và vệ sinh vị trí/khu vực thực tập." },
  { key: "I.3", part: 0, label: "Ý thức kỷ luật, chấp hành nội quy giờ giấc và lịch làm việc." },
  { key: "I.4", part: 0, label: "Không làm việc riêng ngoài phạm vi thực tập trong quá trình thực tập." },
  { key: "I.5", part: 0, label: "Không có phản ánh từ khách hàng/đối tác trong quá trình thực tập." },
  { key: "II.1", part: 1, label: "Ý thức tổ chức và tinh thần phối hợp với đồng nghiệp." },
  { key: "II.2", part: 1, label: "Khả năng lắng nghe, tiếp thu và phản hồi kịp thời, đầy đủ, rõ ràng." },
  { key: "II.3", part: 1, label: "Khả năng thích nghi, linh hoạt và điều chỉnh cách làm việc theo tình huống, yêu cầu công việc." },
  { key: "II.4", part: 1, label: "Mối quan hệ với đồng nghiệp, góp phần tạo môi trường hỗ trợ và cùng tiến bộ." },
  { key: "III.1", part: 2, label: "Khả năng nắm vững kiến thức lý thuyết, công thức, quy trình và nguyên tắc cơ bản của lĩnh vực thực tập." },
  { key: "III.2", part: 2, label: "Khả năng sử dụng các công cụ, phương pháp và kỹ thuật chuyên môn đã được trang bị." },
  { key: "III.3", part: 2, label: "Khả năng phân tích dữ liệu, thông tin và tình huống để đưa ra kết luận hoặc quyết định hợp lý trong phạm vi được giao." },
  { key: "III.4", part: 2, label: "Khả năng làm việc độc lập." },
  { key: "III.5", part: 2, label: "Khả năng làm việc nhóm." },
  { key: "III.6", part: 2, label: "Tính sáng tạo và đề xuất cải tiến." }
];

export const PARTS = [
  { name: "I. Thái độ & Tinh thần thực tập", from: 0, to: 4 },
  { name: "II. Tinh thần phối hợp", from: 5, to: 8 },
  { name: "III. Chuyên môn nghiệp vụ", from: 9, to: 14 }
];

export const SCORE_MIN = 0;
export const SCORE_MAX = 10;
export const SCORE_STEP = 0.5;

// ============================================
// Tính điểm (README mục 2.4)
// ============================================
export function partScore(scores, partIndex) {
  const { from, to } = PARTS[partIndex];
  const values = scores.slice(from, to + 1);
  if (values.some(v => v === null || v === undefined)) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function calcResult(scores) {
  const A = partScore(scores, 0);
  const B = partScore(scores, 1);
  const C = partScore(scores, 2);
  if (A === null || B === null || C === null) return { A, B, C, final: null };
  return { A, B, C, final: (A + B + C) / 3 };
}

// ============================================
// Dữ liệu giả lập
// ============================================
function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DEPARTMENTS = ["Lễ tân", "Nhà hàng", "Buồng phòng", "Kỹ thuật", "Kinh doanh", "Marketing", "Tài chính", "Vui chơi"];
const SURNAMES = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ"];
const MIDDLE = ["Văn", "Thị", "Minh", "Thu", "Hoàng", "Quốc", "Ngọc", "Anh"];
const GIVEN = ["An", "Bình", "Châu", "Dũng", "Hà", "Khang", "Linh", "Nam", "Phương", "Quân", "Trang", "Uyên", "Việt"];
const SCHOOLS = ["Trường ĐH Demo A", "Trường ĐH Demo B", "Trường CĐ Demo C", "Trường ĐH Demo D"];

function buildSeed() {
  const rnd = mulberry32(SEED);
  const pick = list => list[Math.floor(rnd() * list.length)];
  const baseTime = Date.UTC(2026, 9, 1, 8, 0, 0);
  const tickets = {};

  for (let i = 1; i <= INTERN_COUNT; i++) {
    const internId = `SV${String(i).padStart(4, "0")}`;
    const department = pick(DEPARTMENTS);
    const r = rnd();
    let status;
    if (r < 0.3) status = STATUS.NOT_STARTED;
    else if (r < 0.5) status = STATUS.IN_PROGRESS;
    else if (r < 0.75) status = STATUS.WAITING;
    else if (r < 0.85) status = STATUS.RETURNED;
    else status = STATUS.FINALIZED;

    const scores = Array(ITEMS.length).fill(null);
    const filled =
      status === STATUS.NOT_STARTED ? 0 :
      status === STATUS.IN_PROGRESS ? Math.floor(rnd() * ITEMS.length) :
      ITEMS.length;
    for (let k = 0; k < filled; k++) {
      scores[k] = Math.round((rnd() * 9 + 1) * 2) / 2;
    }

    const updated = new Date(baseTime + i * 600000).toISOString();
    const id = `${PERIOD.id}-${internId}`;
    const sent = [STATUS.WAITING, STATUS.FINALIZED, STATUS.RETURNED].includes(status);

    tickets[id] = {
      id,
      periodId: PERIOD.id,
      internId,
      internName: `${pick(SURNAMES)} ${pick(MIDDLE)} ${pick(GIVEN)}`,
      school: pick(SCHOOLS),
      department,
      evaluatorName: `Trưởng bộ phận ${department}`,
      status,
      scores,
      textPart4: status === STATUS.NOT_STARTED ? "" : "Nhận xét mẫu (dữ liệu giả lập).",
      textPart5: "",
      textCommittee: "",
      sendCount: sent ? 1 : 0,
      returnReason: status === STATUS.RETURNED ? "Bổ sung nhận xét chi tiết (dữ liệu giả lập)." : "",
      history: [],
      createdAt: updated,
      updatedAt: updated
    };
  }
  return tickets;
}

// ============================================
// Lưu trữ (sessionStorage, có try/catch)
// ============================================
let cache = null;

function save(data) {
  cache = data;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    // Trình duyệt chặn storage: vẫn chạy trong bộ nhớ, chỉ mất khi tải lại trang
  }
}

function data() {
  if (cache) return cache;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      cache = JSON.parse(raw);
      return cache;
    }
  } catch (error) {
    // Dữ liệu hỏng hoặc storage bị chặn: tạo lại từ seed
  }
  const seeded = buildSeed();
  save(seeded);
  return seeded;
}

function now() {
  return new Date().toISOString();
}

function ok(ticket) {
  return { ok: true, ticket: ticket ? { ...ticket } : null };
}

function fail(error) {
  return { ok: false, error };
}

function addHistory(ticket, actor, action, note = "") {
  ticket.history.push({ at: now(), by: actor.name || "—", action, note });
  ticket.updatedAt = now();
}

// ============================================
// Phân quyền (mô phỏng — logic giống quy tắc sẽ đặt ở máy chủ)
// ============================================
export function canView(ticket, actor) {
  if (!ticket || !actor) return false;
  if (actor.role === "hr") return true;
  if (actor.role === "supervisor") return actor.department === ticket.department;
  return false;
}

export function permissionsFor(ticket, actor) {
  const none = {
    scores: false, part4: false, part5: false, committee: false,
    submit: false, returnTicket: false, finalize: false
  };
  if (!ticket || !actor) return none;

  if (actor.role === "supervisor" && actor.department === ticket.department) {
    const editable = [STATUS.NOT_STARTED, STATUS.IN_PROGRESS, STATUS.RETURNED].includes(ticket.status);
    return { ...none, scores: editable, part4: editable, submit: editable };
  }

  if (actor.role === "hr") {
    const waiting = ticket.status === STATUS.WAITING;
    return { ...none, part5: waiting, committee: waiting, returnTicket: waiting, finalize: waiting };
  }

  return none;
}

// ============================================
// Thao tác (mô phỏng)
// ============================================
export function listTickets(actor) {
  return Object.values(data())
    .filter(t => canView(t, actor))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(t => ({ ...t }));
}

export function getTicket(id) {
  const t = data()[id];
  return t ? { ...t } : null;
}

// Lưu nháp: điểm và nhận xét. Chỉ ghi phần người dùng được phép sửa.
export function saveDraft(id, actor, { scores, notes = {} }) {
  const all = data();
  const ticket = all[id];
  if (!ticket) return fail("Phiếu không tồn tại.");
  const p = permissionsFor(ticket, actor);

  if (scores) {
    if (!p.scores) return fail("Bạn không có quyền sửa điểm của phiếu này.");
    for (const v of scores) {
      if (v === null) continue;
      if (typeof v !== "number" || v < SCORE_MIN || v > SCORE_MAX) {
        return fail(`Điểm phải từ ${SCORE_MIN} đến ${SCORE_MAX}.`);
      }
    }
    ticket.scores = [...scores];
    if (ticket.status === STATUS.NOT_STARTED) ticket.status = STATUS.IN_PROGRESS;
    addHistory(ticket, actor, "Lưu điểm");
  }

  const fieldPerm = { textPart4: p.part4, textPart5: p.part5, textCommittee: p.committee };
  for (const [field, value] of Object.entries(notes)) {
    if (!(field in fieldPerm) || !fieldPerm[field]) continue;
    ticket[field] = String(value ?? "");
  }

  save(all);
  return ok(ticket);
}

export function submit(id, actor) {
  const all = data();
  const ticket = all[id];
  if (!ticket) return fail("Phiếu không tồn tại.");
  if (!permissionsFor(ticket, actor).submit) return fail("Phiếu này không ở trạng thái có thể gửi.");

  const missing = ticket.scores.filter(v => v === null).length;
  if (missing > 0) return fail(`Còn ${missing} hạng mục chưa chấm điểm. Hãy điền đủ 15 hạng mục trước khi gửi.`);

  ticket.status = STATUS.WAITING;
  ticket.sendCount += 1;
  ticket.returnReason = "";
  addHistory(ticket, actor, "Gửi phiếu");
  save(all);
  return ok(ticket);
}

export function returnTicket(id, actor, reason) {
  const all = data();
  const ticket = all[id];
  if (!ticket) return fail("Phiếu không tồn tại.");
  if (!permissionsFor(ticket, actor).returnTicket) return fail("Bạn không có quyền trả phiếu này.");
  const text = String(reason || "").trim();
  if (!text) return fail("Phải nhập lý do khi trả phiếu.");

  ticket.status = STATUS.RETURNED;
  ticket.returnReason = text;
  addHistory(ticket, actor, "Trả về", text);
  save(all);
  return ok(ticket);
}

export function finalize(id, actor) {
  const all = data();
  const ticket = all[id];
  if (!ticket) return fail("Phiếu không tồn tại.");
  if (!permissionsFor(ticket, actor).finalize) return fail("Chỉ phiếu đang chờ xác nhận mới được chốt.");

  ticket.status = STATUS.FINALIZED;
  addHistory(ticket, actor, "Chốt phiếu");
  save(all);
  return ok(ticket);
}

// Thống kê theo README mục 7.2: chỉ "đã chốt" mới tính là hoàn tất
export function stats(list) {
  const finalized = list.filter(t => t.status === STATUS.FINALIZED).length;
  return {
    total: list.length,
    finalized,
    pending: list.length - finalized,
    waiting: list.filter(t => t.status === STATUS.WAITING).length,
    returned: list.filter(t => t.status === STATUS.RETURNED).length
  };
}

export function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

// Xóa dữ liệu demo và tạo lại từ seed
export function resetDemo() {
  cache = null;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    // bỏ qua
  }
}

export const DemoStore = {
  listTickets,
  getTicket,
  canView,
  permissionsFor,
  saveDraft,
  submit,
  returnTicket,
  finalize,
  stats,
  formatDateTime,
  resetDemo
};
