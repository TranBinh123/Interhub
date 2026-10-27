// ============================================
// DEMO STORE — DỮ LIỆU MÔ PHỎNG (prototype)
// ============================================
// Không ghi Firestore. Dữ liệu nằm trong localStorage của trình duyệt:
//  - dùng chung giữa các tab trên CÙNG một trình duyệt (admin.html ↔ app.html);
//  - KHÔNG dùng chung giữa các máy hoặc các trình duyệt khác nhau.
// Cấu trúc hạng mục, công thức điểm và luồng trạng thái theo README mục 2.3–2.5.
//
// CHỜ XÁC NHẬN (chưa đưa vào quyết định):
//  - Thang điểm: đang dùng 0–10, bước 0.5 (README ghi thang 10).
//  - Thang xếp loại: không hiển thị vì README chưa có quy định.
//  - Làm tròn: chỉ làm tròn 2 chữ số khi hiển thị.
//  - Sinh viên bắt đầu/kết thúc giữa tháng: hiện tạo phiếu cho mọi SVTT trong danh sách.
//  - Phân công: hiện theo bộ phận (Trưởng bộ phận của bộ phận đó đánh giá).

export const DEMO_BANNER =
  "DỮ LIỆU MÔ PHỎNG — chưa kết nối cơ sở dữ liệu. Dữ liệu chỉ lưu trên trình duyệt này và dùng chung giữa các tab của trình duyệt này.";

const STORAGE_KEY = "internhub-demo-v2";

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
// Lưu trữ (localStorage, đọc lại mỗi lần để các tab luôn thấy dữ liệu mới nhất)
// ============================================
function emptyState() {
  return { periods: {}, interns: {}, tickets: {} };
}

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        periods: parsed.periods || {},
        interns: parsed.interns || {},
        tickets: parsed.tickets || {}
      };
    }
  } catch (error) {
    // Dữ liệu hỏng hoặc storage bị chặn: coi như chưa có dữ liệu
  }
  return emptyState();
}

function write(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    // Storage bị chặn: thao tác vẫn trả về kết quả nhưng không lưu được
  }
}

function now() {
  return new Date().toISOString();
}

function ok(extra = {}) {
  return { ok: true, ...extra };
}

function fail(error) {
  return { ok: false, error };
}

function addHistory(ticket, actor, action, note = "") {
  ticket.history.push({ at: now(), by: actor.name || "—", action, note });
  ticket.updatedAt = now();
}

// ============================================
// Kỳ đánh giá
// ============================================
export function listPeriods() {
  return Object.values(read().periods).sort((a, b) => b.id.localeCompare(a.id));
}

// month dạng "YYYY-MM"
export function createPeriod({ month, name }) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(month || ""))) {
    return fail("Tháng không hợp lệ. Định dạng đúng: năm-tháng, ví dụ 2026-11.");
  }
  const state = read();
  const id = `EV-${month}`;
  if (state.periods[id]) return fail(`Kỳ ${id} đã tồn tại.`);

  const [y, m] = month.split("-");
  state.periods[id] = {
    id,
    month,
    name: String(name || "").trim() || `Tháng ${Number(m)}/${y}`,
    status: "dang_mo",
    createdAt: now()
  };
  write(state);
  return ok({ period: state.periods[id] });
}

// Tạo phiếu cho mọi SVTT trong danh sách. Phiếu đã có thì bỏ qua, không tạo trùng.
export function generateTickets(periodId) {
  const state = read();
  if (!state.periods[periodId]) return fail("Kỳ đánh giá không tồn tại.");

  const interns = Object.values(state.interns);
  if (interns.length === 0) return fail("Chưa có danh sách SVTT. Hãy nhập danh sách trước.");

  let created = 0;
  let existing = 0;
  for (const intern of interns) {
    const id = `${periodId}-${intern.internId}`;
    if (state.tickets[id]) {
      existing += 1;
      continue;
    }
    const stamp = now();
    state.tickets[id] = {
      id,
      periodId,
      internId: intern.internId,
      internName: intern.fullName,
      school: intern.school || "",
      department: intern.department,
      evaluatorName: `Trưởng bộ phận ${intern.department}`,
      status: STATUS.NOT_STARTED,
      scores: Array(ITEMS.length).fill(null),
      textPart4: "",
      textPart5: "",
      textCommittee: "",
      sendCount: 0,
      returnReason: "",
      history: [],
      createdAt: stamp,
      updatedAt: stamp
    };
    created += 1;
  }

  write(state);
  return ok({ created, existing });
}

// ============================================
// Danh sách SVTT: đọc CSV và kiểm tra
// ============================================
// Cột: Mã SV, Họ tên, Trường, Bộ phận, Ngày bắt đầu, Ngày kết thúc (ngày dạng YYYY-MM-DD hoặc DD/MM/YYYY)
export const INTERN_COLUMNS = ["Mã SV", "Họ tên", "Trường", "Bộ phận", "Ngày bắt đầu", "Ngày kết thúc"];

function splitCsvLine(line, delimiter) {
  const cells = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      cells.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur.trim());
  return cells;
}

// Trả về { headers, rows: [{ line, cells }] }. Dòng trống bị bỏ qua.
export function parseCsv(text) {
  const lines = String(text || "").replace(/^﻿/, "").split(/\r?\n/);
  const first = lines.find(l => l.trim() !== "") || "";
  const delimiter = first.split(";").length > first.split(",").length ? ";" : ",";
  const all = [];
  lines.forEach((raw, idx) => {
    if (raw.trim() === "") return;
    all.push({ line: idx + 1, cells: splitCsvLine(raw, delimiter) });
  });
  if (all.length === 0) return { headers: [], rows: [] };
  return { headers: all[0].cells, rows: all.slice(1) };
}

function normalizeDate(value) {
  const v = String(value || "").trim();
  if (!v) return "";
  let m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return v;
  m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null; // không hợp lệ
}

// rows: kết quả của parseCsv().rows. Không ghi đè SVTT đã có.
export function importInterns(rows) {
  const state = read();
  const seenInFile = new Set();
  const errors = [];
  let added = 0;
  let skipped = 0;

  for (const row of rows) {
    const [internId, fullName, school, department, start, end] = row.cells;
    const problems = [];
    if (!internId) problems.push("thiếu Mã SV");
    if (!fullName) problems.push("thiếu Họ tên");
    if (!department) problems.push("thiếu Bộ phận");
    const startDate = normalizeDate(start);
    const endDate = normalizeDate(end);
    if (startDate === null) problems.push("Ngày bắt đầu không đúng định dạng");
    if (endDate === null) problems.push("Ngày kết thúc không đúng định dạng");

    if (problems.length) {
      errors.push({ line: row.line, message: problems.join("; ") });
      continue;
    }
    if (seenInFile.has(internId)) {
      errors.push({ line: row.line, message: `Mã SV ${internId} bị trùng trong file` });
      continue;
    }
    seenInFile.add(internId);

    if (state.interns[internId]) {
      skipped += 1;
      continue;
    }

    state.interns[internId] = {
      internId,
      fullName,
      school: school || "",
      department,
      startDate: startDate || "",
      endDate: endDate || "",
      importedAt: now()
    };
    added += 1;
  }

  write(state);
  return { added, skipped, errors, total: rows.length };
}

export function listInterns() {
  return Object.values(read().interns).sort((a, b) => a.internId.localeCompare(b.internId));
}

// ============================================
// Dữ liệu mẫu (chỉ khi Admin chủ động nạp)
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

export function loadSampleData() {
  const rnd = mulberry32(20261027);
  const pick = list => list[Math.floor(rnd() * list.length)];
  const departments = ["Lễ tân", "Nhà hàng", "Buồng phòng", "Kỹ thuật", "Kinh doanh", "Marketing", "Tài chính", "Vui chơi"];
  const surnames = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ"];
  const middle = ["Văn", "Thị", "Minh", "Thu", "Hoàng", "Quốc", "Ngọc", "Anh"];
  const given = ["An", "Bình", "Châu", "Dũng", "Hà", "Khang", "Linh", "Nam", "Phương", "Quân", "Trang", "Uyên", "Việt"];
  const schools = ["Trường ĐH Demo A", "Trường ĐH Demo B", "Trường CĐ Demo C", "Trường ĐH Demo D"];

  const state = emptyState();
  const period = { id: "EV-2026-10", month: "2026-10", name: "Tháng 10/2026 (dữ liệu mẫu)", status: "dang_mo", createdAt: now() };
  state.periods[period.id] = period;

  for (let i = 1; i <= 520; i++) {
    const internId = `SV${String(i).padStart(4, "0")}`;
    const department = pick(departments);
    state.interns[internId] = {
      internId,
      fullName: `${pick(surnames)} ${pick(middle)} ${pick(given)}`,
      school: pick(schools),
      department,
      startDate: "2026-10-01",
      endDate: "2026-12-31",
      importedAt: now()
    };

    const r = rnd();
    const status =
      r < 0.3 ? STATUS.NOT_STARTED :
      r < 0.5 ? STATUS.IN_PROGRESS :
      r < 0.75 ? STATUS.WAITING :
      r < 0.85 ? STATUS.RETURNED : STATUS.FINALIZED;

    const scores = Array(ITEMS.length).fill(null);
    const filled =
      status === STATUS.NOT_STARTED ? 0 :
      status === STATUS.IN_PROGRESS ? Math.floor(rnd() * ITEMS.length) : ITEMS.length;
    for (let k = 0; k < filled; k++) scores[k] = Math.round((rnd() * 9 + 1) * 2) / 2;

    const stamp = new Date(Date.UTC(2026, 9, 1, 8, 0, 0) + i * 600000).toISOString();
    const id = `${period.id}-${internId}`;
    const sent = [STATUS.WAITING, STATUS.FINALIZED, STATUS.RETURNED].includes(status);
    state.tickets[id] = {
      id,
      periodId: period.id,
      internId,
      internName: state.interns[internId].fullName,
      school: state.interns[internId].school,
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
      createdAt: stamp,
      updatedAt: stamp
    };
  }

  write(state);
  return ok({ interns: 520, tickets: 520 });
}

export function resetDemo() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    // bỏ qua
  }
}

// ============================================
// Phân quyền (mô phỏng — quy tắc thật phải nằm ở máy chủ/Firestore Rules)
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
// Truy vấn phiếu
// ============================================
export function listTickets(actor, periodId = null) {
  return Object.values(read().tickets)
    .filter(t => canView(t, actor))
    .filter(t => !periodId || t.periodId === periodId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(t => ({ ...t }));
}

export function listAllTickets(periodId = null) {
  return Object.values(read().tickets)
    .filter(t => !periodId || t.periodId === periodId)
    .map(t => ({ ...t }));
}

export function getTicket(id) {
  const t = read().tickets[id];
  return t ? { ...t } : null;
}

// Kỳ mới nhất đang mở, dùng làm kỳ hiện hành trên giao diện người dùng
export function activePeriod() {
  return listPeriods().find(p => p.status === "dang_mo") || null;
}

// Việc cần làm của người dùng hiện tại
export function todoFor(actor, periodId = null) {
  const tickets = listTickets(actor, periodId);
  let items;
  if (actor.role === "supervisor") {
    items = tickets.filter(t =>
      [STATUS.NOT_STARTED, STATUS.IN_PROGRESS, STATUS.RETURNED].includes(t.status));
  } else if (actor.role === "hr") {
    items = tickets.filter(t => t.status === STATUS.WAITING);
  } else {
    items = [];
  }
  return items;
}

// ============================================
// Thao tác (mô phỏng)
// ============================================
// Lưu nháp: điểm và nhận xét. Chỉ ghi phần người dùng được phép sửa.
export function saveDraft(id, actor, { scores, notes = {} }) {
  const all = read();
  const ticket = all.tickets[id];
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

  write(all);
  return ok({ ticket: { ...ticket } });
}

export function submit(id, actor) {
  const all = read();
  const ticket = all.tickets[id];
  if (!ticket) return fail("Phiếu không tồn tại.");
  if (!permissionsFor(ticket, actor).submit) return fail("Phiếu này không ở trạng thái có thể gửi.");

  const missing = ticket.scores.filter(v => v === null).length;
  if (missing > 0) return fail(`Còn ${missing} hạng mục chưa chấm điểm. Hãy điền đủ 15 hạng mục trước khi gửi.`);

  ticket.status = STATUS.WAITING;
  ticket.sendCount += 1;
  ticket.returnReason = "";
  addHistory(ticket, actor, "Gửi phiếu");
  write(all);
  return ok({ ticket: { ...ticket } });
}

export function returnTicket(id, actor, reason) {
  const all = read();
  const ticket = all.tickets[id];
  if (!ticket) return fail("Phiếu không tồn tại.");
  if (!permissionsFor(ticket, actor).returnTicket) return fail("Bạn không có quyền trả phiếu này.");
  const text = String(reason || "").trim();
  if (!text) return fail("Phải nhập lý do khi trả phiếu.");

  ticket.status = STATUS.RETURNED;
  ticket.returnReason = text;
  addHistory(ticket, actor, "Trả về", text);
  write(all);
  return ok({ ticket: { ...ticket } });
}

export function finalize(id, actor) {
  const all = read();
  const ticket = all.tickets[id];
  if (!ticket) return fail("Phiếu không tồn tại.");
  if (!permissionsFor(ticket, actor).finalize) return fail("Chỉ phiếu đang chờ xác nhận mới được chốt.");

  ticket.status = STATUS.FINALIZED;
  addHistory(ticket, actor, "Chốt phiếu");
  write(all);
  return ok({ ticket: { ...ticket } });
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

export const DemoStore = {
  listPeriods,
  createPeriod,
  generateTickets,
  parseCsv,
  importInterns,
  listInterns,
  loadSampleData,
  resetDemo,
  listTickets,
  listAllTickets,
  getTicket,
  activePeriod,
  todoFor,
  canView,
  permissionsFor,
  saveDraft,
  submit,
  returnTicket,
  finalize,
  stats,
  formatDateTime
};
