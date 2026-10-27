// ============================================
// DEMO STORE — DỮ LIỆU MÔ PHỎNG (prototype)
// ============================================
// Không ghi Firestore. Toàn bộ dữ liệu nằm trong localStorage của trình duyệt:
//  - dùng chung giữa các tab trên CÙNG một trình duyệt (admin.html ↔ app.html);
//  - KHÔNG dùng chung giữa các máy hoặc trình duyệt khác nhau.
// Vai trò và bộ phận của user do Admin chỉnh ở đây; hồ sơ thật trên Firestore không đổi.
// Cấu trúc hạng mục, công thức điểm và luồng trạng thái theo README mục 2.3–2.5.
//
// CHỜ XÁC NHẬN (chưa đưa vào quyết định):
//  - Thang điểm: đang dùng 0–10, bước 0.5 (README ghi thang 10).
//  - Thang xếp loại: không hiển thị vì README chưa có quy định.
//  - Làm tròn: chỉ làm tròn 2 chữ số khi hiển thị.
//  - SVTT bắt đầu/kết thúc giữa tháng: hiện tạo phiếu cho mọi SVTT trong danh sách.
//  - Phân công: mỗi phiếu một người hướng dẫn; chưa giao thì Trưởng bộ phận tự chấm.

export const DEMO_BANNER =
  "DỮ LIỆU MÔ PHỎNG — chưa kết nối cơ sở dữ liệu. Dữ liệu chỉ lưu trên trình duyệt này và dùng chung giữa các tab của trình duyệt này.";

const STORAGE_KEY = "internhub-demo-v3";

// Bộ phận mẫu, CHỈ dùng khi Admin chủ động nạp dữ liệu mẫu. Không tự thêm vào danh mục.
export const DEFAULT_DEPARTMENTS = [
  { code: "HR", name: "Nhân sự & Đào tạo" },
  { code: "IT", name: "Công nghệ Thông tin" },
  { code: "ENG", name: "Kỹ thuật & Bảo trì" },
  { code: "SEC", name: "An ninh & An toàn" },
  { code: "MK", name: "Truyền thông & Quan hệ Công chúng" },
  { code: "FB", name: "Tiền sảnh & Bar" },
  { code: "KT", name: "Kế toán" },
  { code: "MKT", name: "Marketing" }
];
const LEGACY_KEY = "internhub-demo-v2";

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

// Trạng thái mà người chấm còn được sửa phiếu
const EDITABLE = [STATUS.NOT_STARTED, STATUS.IN_PROGRESS, STATUS.RETURNED];

// Vai trò có thể gán cho tài khoản đã duyệt (Admin không nằm trong danh sách này)
export const MEMBER_ROLES = {
  hr: "Phòng Nhân sự",
  supervisor: "Trưởng bộ phận",
  mentor: "Người hướng dẫn"
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

// Cột CSV nhập SVTT
export const INTERN_COLUMNS = ["Mã SV", "Họ tên", "Trường", "Bộ phận", "Ngày bắt đầu", "Ngày kết thúc"];

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
  return { periods: {}, interns: {}, tickets: {}, departments: {}, members: {}, catalogV4: true };
}

function read() {
  try {
    const legacy = !localStorage.getItem(STORAGE_KEY);
    const raw = localStorage.getItem(legacy ? LEGACY_KEY : STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      const state = {
        periods: p.periods || {},
        interns: p.interns || {},
        tickets: p.tickets || {},
        departments: p.departments || {},
        members: p.members || {},
        catalogV4: p.catalogV4 === true
      };
      if (!state.catalogV4) {
        // Không xóa bộ phận nào khi nâng cấp dữ liệu; chỉ đánh dấu đã xử lý.
        state.catalogV4 = true;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (error) {
          // storage bị chặn
        }
      }
      // Chuyển từ bản cũ: tạo danh mục bộ phận từ dữ liệu SVTT đã nhập
      if (legacy && Object.keys(state.departments).length === 0) {
        for (const intern of Object.values(state.interns)) {
          state.departments[intern.department] = { code: intern.department, name: intern.department };
        }
      }
      return state;
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
  ticket.history.push({ at: now(), by: actor?.name || "—", action, note });
  ticket.updatedAt = now();
}

function defaultEvaluatorName(department) {
  return `Trưởng bộ phận ${department}`;
}

function normalizeDate(value) {
  const v = String(value || "").trim();
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null; // không hợp lệ
}

// ============================================
// Danh mục bộ phận
// ============================================
export function listDepartments() {
  return Object.values(read().departments).sort((a, b) => a.code.localeCompare(b.code));
}

// Nhận mã hoặc tên bộ phận, trả về mã đã chuẩn hóa hoặc null
function findDepartmentIn(state, value) {
  const v = String(value || "").trim().toLowerCase();
  if (!v) return null;
  const hit = Object.values(state.departments)
    .find(d => d.code.toLowerCase() === v || d.name.toLowerCase() === v);
  return hit ? hit.code : null;
}

// Kiểm tra mã bộ phận của một người có nằm trong danh mục không
export function departmentKnown(code) {
  return !!code && !!read().departments[code];
}

export function departmentName(code) {
  return read().departments[code]?.name || code || "—";
}

export function createDepartment({ code, name }) {
  const state = read();
  const c = String(code || "").trim().toUpperCase();
  const n = String(name || "").trim();
  if (!c) return fail("Mã bộ phận không được để trống.");
  if (!n) return fail("Tên bộ phận không được để trống.");
  if (!/^[A-Z0-9_-]{1,12}$/.test(c)) {
    return fail("Mã bộ phận chỉ gồm chữ không dấu, số, gạch ngang hoặc gạch dưới (tối đa 12 ký tự).");
  }
  if (state.departments[c]) return fail(`Mã bộ phận ${c} đã tồn tại.`);
  if (Object.values(state.departments).some(d => d.name.toLowerCase() === n.toLowerCase())) {
    return fail(`Tên bộ phận "${n}" đã tồn tại.`);
  }
  state.departments[c] = { code: c, name: n };
  write(state);
  return ok({ department: state.departments[c] });
}

export function deleteDepartment(code) {
  const state = read();
  if (!state.departments[code]) return fail("Bộ phận không tồn tại.");
  const internCount = Object.values(state.interns).filter(i => i.department === code).length;
  const memberCount = Object.values(state.members).filter(m => m.department === code).length;
  if (internCount || memberCount) {
    return fail(`Không thể xóa: còn ${internCount} SVTT và ${memberCount} tài khoản thuộc bộ phận này.`);
  }
  delete state.departments[code];
  write(state);
  return ok();
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
  const sync = syncPeriodTickets(id);
  return ok({ period: state.periods[id], sync: sync.ok ? sync : null });
}

// Tạo phiếu cho mọi SVTT trong danh sách. Phiếu đã có thì giữ nguyên, không tạo trùng.
// ============================================
// Phiếu theo kỳ — tự động, không chọn từng SVTT
// ============================================
// Giả định (chờ xác nhận README mục 13.4):
//  - Một SVTT thuộc kỳ tháng M nếu có ít nhất 1 ngày thực tập trong tháng M.
//  - Kết thúc sớm: ngày về rơi trong tháng M nhưng trước ngày cuối tháng → phiếu được đánh dấu để ưu tiên.
//  - Về đúng ngày cuối tháng hoặc thực tập tiếp sang tháng sau → phiếu thường.
//  - Bắt đầu giữa tháng: vẫn tính vào tháng đó, được đánh dấu để tham khảo.

function monthBounds(month) {
  const [y, m] = month.split("-").map(Number);
  const pad = n => String(n).padStart(2, "0");
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return {
    start: `${y}-${pad(m)}-01`,
    end: `${y}-${pad(m)}-${pad(lastDay)}`
  };
}

function fmtDate(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// true = thuộc kỳ, false = ngoài kỳ, null = thiếu ngày
export function internshipInPeriod(intern, month) {
  if (!intern.startDate || !intern.endDate) return null;
  const { start, end } = monthBounds(month);
  return intern.startDate <= end && intern.endDate >= start;
}

// Loại phiếu cho SVTT trong một tháng
export function evaluationReason(intern, month) {
  const { start, end } = monthBounds(month);
  const monthPrefix = month;
  if (intern.endDate && intern.endDate.startsWith(monthPrefix) && intern.endDate < end) {
    return { type: "early_leave", note: `Kết thúc thực tập sớm, ngày về ${fmtDate(intern.endDate)}` };
  }
  if (intern.startDate && intern.startDate.startsWith(monthPrefix) && intern.startDate > start) {
    return { type: "start_mid_month", note: `Bắt đầu thực tập ngày ${fmtDate(intern.startDate)}` };
  }
  return { type: "regular", note: "" };
}

// Phân loại toàn bộ SVTT theo kỳ
export function classifyInterns(periodId) {
  const state = read();
  const period = state.periods[periodId];
  const result = { eligible: [], outside: [], noDates: [], early: 0, startMid: 0 };
  if (!period) return result;
  for (const intern of Object.values(state.interns)) {
    const inside = internshipInPeriod(intern, period.month);
    if (inside === null) { result.noDates.push(intern); continue; }
    if (!inside) { result.outside.push(intern); continue; }
    result.eligible.push(intern);
    const reason = evaluationReason(intern, period.month);
    if (reason.type === "early_leave") result.early += 1;
    if (reason.type === "start_mid_month") result.startMid += 1;
  }
  return result;
}

// Đồng bộ phiếu của một kỳ với danh sách SVTT hiện tại:
//  - tạo phiếu còn thiếu cho SVTT thuộc kỳ;
//  - gỡ phiếu chưa được làm gì (chưa chấm, chưa gửi) của SVTT không còn thuộc kỳ.
// Phiếu đã có tiến độ không bị xóa.
export function syncPeriodTickets(periodId) {
  const state = read();
  const period = state.periods[periodId];
  if (!period) return fail("Kỳ đánh giá không tồn tại.");

  const groups = classifyInterns(periodId);
  const eligibleIds = new Set(groups.eligible.map(i => i.internId));
  let created = 0;
  let existing = 0;
  let removed = 0;
  let kept = 0;

  for (const intern of groups.eligible) {
    const id = `${periodId}-${intern.internId}`;
    if (state.tickets[id]) { existing += 1; continue; }
    const reason = evaluationReason(intern, period.month);
    const stamp = now();
    state.tickets[id] = {
      id,
      periodId,
      internId: intern.internId,
      internName: intern.fullName,
      school: intern.school || "",
      department: intern.department,
      evaluatorUid: null,
      evaluatorName: defaultEvaluatorName(intern.department),
      evaluationType: reason.type,
      evaluationNote: reason.note,
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

  for (const [id, t] of Object.entries(state.tickets)) {
    if (t.periodId !== periodId || eligibleIds.has(t.internId)) continue;
    const untouched = t.status === STATUS.NOT_STARTED && t.scores.every(v => v === null) && t.history.length === 0;
    if (untouched) {
      delete state.tickets[id];
      removed += 1;
    } else {
      kept += 1;
    }
  }

  write(state);
  return ok({
    created,
    existing,
    removed,
    kept,
    eligible: groups.eligible.length,
    early: groups.early,
    startMid: groups.startMid,
    outside: groups.outside.length,
    noDates: groups.noDates.length
  });
}

// Chỉ tạo thêm phiếu còn thiếu (giữ tương thích với nút cũ)
export function generateTickets(periodId) {
  const state = read();
  if (!state.periods[periodId]) return fail("Kỳ đánh giá không tồn tại.");
  if (Object.keys(state.interns).length === 0) return fail("Chưa có danh sách SVTT. Hãy nhập hoặc thêm SVTT trước.");
  const result = syncPeriodTickets(periodId);
  if (result.ok && result.eligible === 0) return fail("Không có SVTT nào thực tập trong tháng của kỳ này.");
  return result;
}

// ============================================
// Theo dõi SVTT sắp về và cảnh báo tạo phiếu
// ============================================
// Cảnh báo bắt đầu trước ngày về 14 ngày (README mục 13.4 chờ xác nhận thời hạn chính thức).
export const FOLLOW_UP_DAYS = 14;

export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}

// Số ngày từ fromIso đến toIso (âm nếu toIso đã qua)
function diffDays(fromIso, toIso) {
  const [y1, m1, d1] = fromIso.split("-").map(Number);
  const [y2, m2, d2] = toIso.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

// Theo dõi từng SVTT có ngày về, tính theo ngày kiểm tra today
// level: "alert" (cần làm ngay), "info" (chưa đến hạn), null (đã có phiếu)
export function followUp(today = todayIso()) {
  const state = read();
  const rows = [];
  for (const intern of Object.values(state.interns)) {
    if (!intern.endDate) continue;

    const daysLeft = diffDays(today, intern.endDate);
    const month = intern.endDate.slice(0, 7);
    const periodId = `EV-${month}`;
    const periodExists = !!state.periods[periodId];
    const hasTicket = !!state.tickets[`${periodId}-${intern.internId}`];
    const dueDate = addDays(intern.endDate, -FOLLOW_UP_DAYS);
    const leavingSoon = daysLeft >= 0 && daysLeft <= FOLLOW_UP_DAYS;

    // Đã về rồi mà vẫn chưa có phiếu: bỏ qua nếu phiếu đã có
    if (daysLeft < 0 && hasTicket) continue;
    // Chưa đến hạn và còn xa: không cần theo dõi ở đây
    if (daysLeft > FOLLOW_UP_DAYS + 30 && !hasTicket) continue;

    const monthLabel = `${month.slice(5)}/${month.slice(0, 4)}`;
    let level = null;
    let message = "";
    if (hasTicket) {
      message = "Đã có phiếu";
    } else if (daysLeft < 0) {
      level = "alert";
      message = `Đã về ngày ${fmtDate(intern.endDate)} nhưng chưa có phiếu tháng ${monthLabel}`;
    } else if (today >= dueDate) {
      level = "alert";
      message = `Đến hạn tạo phiếu tháng ${monthLabel} (về ngày ${fmtDate(intern.endDate)})`;
    } else {
      level = "info";
      message = `Đến hạn tạo phiếu ngày ${fmtDate(dueDate)}`;
    }
    if (level === "alert" && !periodExists) {
      message += ` — chưa có kỳ tháng ${monthLabel}, cần tạo kỳ`;
    }

    rows.push({
      internId: intern.internId,
      internName: intern.fullName,
      department: intern.department,
      endDate: intern.endDate,
      daysLeft,
      leavingSoon,
      dueDate,
      periodId,
      periodExists,
      hasTicket,
      level,
      message
    });
  }
  return rows.sort((a, b) => a.endDate.localeCompare(b.endDate));
}

// Cảnh báo hiển thị theo vai trò: Phòng Nhân sự và Admin xem tất cả; Trưởng bộ phận chỉ xem bộ phận mình
export function followUpFor(actor, today = todayIso()) {
  if (!actor) return [];
  const rows = followUp(today);
  if (actor.role === "hr" || actor.role === "admin") return rows;
  if (actor.role === "supervisor") return rows.filter(r => r.department === actor.department);
  return [];
}

// Đồng bộ mọi kỳ đang mở; gọi khi SVTT thay đổi
export function syncOpenPeriods() {
  for (const period of Object.values(read().periods)) {
    if (period.status === "dang_mo") syncPeriodTickets(period.id);
  }
}

// ============================================
// Sinh viên thực tập (SVTT)
// ============================================
// Kiểm tra và chuẩn hóa một SVTT. Bộ phận phải đã có trong danh mục.
function cleanIntern(input, state) {
  const internId = String(input.internId || "").trim().toUpperCase();
  const fullName = String(input.fullName || "").trim();
  const school = String(input.school || "").trim();
  const rawDept = String(input.department || "").trim();
  const department = findDepartmentIn(state, rawDept);
  const startDate = normalizeDate(input.startDate);
  const endDate = normalizeDate(input.endDate);

  const problems = [];
  if (!internId) problems.push("thiếu Mã SV");
  if (!fullName) problems.push("thiếu Họ tên");
  if (!rawDept) problems.push("thiếu Bộ phận");
  else if (!department) problems.push(`Bộ phận "${rawDept}" chưa có trong danh mục`);
  if (startDate === null) problems.push("Ngày bắt đầu không đúng định dạng");
  if (endDate === null) problems.push("Ngày kết thúc không đúng định dạng");

  if (problems.length) return { error: problems.join("; ") };
  return {
    value: { internId, fullName, school, department, startDate: startDate || "", endDate: endDate || "" }
  };
}

export function listInterns() {
  return Object.values(read().interns).sort((a, b) => a.internId.localeCompare(b.internId));
}

export function createIntern(input) {
  const state = read();
  const cleaned = cleanIntern(input, state);
  if (cleaned.error) return fail(cleaned.error);
  const { value } = cleaned;
  if (state.interns[value.internId]) return fail(`Mã SV ${value.internId} đã tồn tại.`);

  state.interns[value.internId] = { ...value, importedAt: now(), updatedAt: now() };
  write(state);
  syncOpenPeriods();
  return ok({ intern: state.interns[value.internId] });
}

// Sửa SVTT. Mã SV không đổi. Phiếu chưa gửi được cập nhật theo; phiếu đã chốt giữ nguyên snapshot.
export function updateIntern(internId, input) {
  const state = read();
  const existing = state.interns[internId];
  if (!existing) return fail("SVTT không tồn tại.");

  const cleaned = cleanIntern({ ...input, internId }, state);
  if (cleaned.error) return fail(cleaned.error);
  const next = cleaned.value;

  const ticketList = Object.values(state.tickets).filter(t => t.internId === internId);
  const deptChanged = next.department !== existing.department;
  if (deptChanged && ticketList.some(t => ![STATUS.NOT_STARTED, STATUS.IN_PROGRESS].includes(t.status))) {
    return fail("Không đổi bộ phận: SVTT này đã có phiếu được gửi, trả về hoặc chốt.");
  }

  for (const t of ticketList) {
    if (t.status === STATUS.FINALIZED) continue;
    t.internName = next.fullName;
    t.school = next.school;
    if (deptChanged) {
      t.department = next.department;
      t.evaluatorUid = null;
      t.evaluatorName = defaultEvaluatorName(next.department);
      t.updatedAt = now();
      t.history.push({ at: now(), by: "Admin", action: "Đổi bộ phận", note: `Chuyển sang ${next.department}` });
    }
  }

  state.interns[internId] = { ...existing, ...next, updatedAt: now() };
  write(state);
  syncOpenPeriods();
  return ok({ intern: state.interns[internId] });
}

export function deleteIntern(internId) {
  const state = read();
  if (!state.interns[internId]) return fail("SVTT không tồn tại.");
  const hasTickets = Object.values(state.tickets).some(t => t.internId === internId);
  if (hasTickets) return fail("Không xóa được: SVTT đã có phiếu đánh giá. Cần giữ lại để lưu lịch sử.");
  delete state.interns[internId];
  write(state);
  return ok();
}

// rows: kết quả của parseCsv().rows. Không ghi đè SVTT đã có.
export function importInterns(rows) {
  const state = read();
  const seenInFile = new Set();
  const errors = [];
  let added = 0;
  let skipped = 0;

  for (const row of rows) {
    const [internId, fullName, school, department, startDate, endDate] = row.cells;
    const cleaned = cleanIntern({ internId, fullName, school, department, startDate, endDate }, state);
    if (cleaned.error) {
      errors.push({ line: row.line, message: cleaned.error });
      continue;
    }
    const id = cleaned.value.internId;
    if (seenInFile.has(id)) {
      errors.push({ line: row.line, message: `Mã SV ${id} bị trùng trong file` });
      continue;
    }
    seenInFile.add(id);

    if (state.interns[id]) {
      skipped += 1;
      continue;
    }
    state.interns[id] = { ...cleaned.value, importedAt: now(), updatedAt: now() };
    added += 1;
  }

  write(state);
  syncOpenPeriods();
  return { added, skipped, errors, total: rows.length };
}

// ============================================
// CSV
// ============================================
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

// ============================================
// Tài khoản: vai trò và bộ phận do Admin chỉnh (mô phỏng)
// ============================================
// users: danh sách hồ sơ từ Firestore. Chỉ đồng bộ tài khoản đã duyệt có vai trò nội bộ.
// Giữ nguyên vai trò/bộ phận Admin đã chỉnh trước đó.
export function syncMembers(users) {
  const state = read();
  const approved = new Set();

  for (const u of users) {
    const uid = u.id || u.uid;
    if (!uid) continue;
    if (u.status !== "approved" || u.isActive !== true) continue;
    if (!Object.keys(MEMBER_ROLES).includes(u.role)) continue;

    approved.add(uid);
    const existing = state.members[uid];
    if (existing) {
      existing.email = u.email || existing.email;
      existing.fullName = u.fullName || existing.fullName;
    } else {
      state.members[uid] = {
        uid,
        email: u.email || "",
        fullName: u.fullName || u.email || "",
        role: u.role,
        department: u.department || ""
      };
    }
  }

  for (const uid of Object.keys(state.members)) {
    if (!approved.has(uid)) delete state.members[uid];
  }

  write(state);
  return Object.keys(state.members).length;
}

// Gỡ tài khoản khỏi danh bạ và bỏ phân công của người đó ở các phiếu chưa chốt
export function removeMember(uid) {
  const state = read();
  delete state.members[uid];
  for (const t of Object.values(state.tickets)) {
    if (t.evaluatorUid === uid && EDITABLE.includes(t.status)) {
      t.evaluatorUid = null;
      t.evaluatorName = defaultEvaluatorName(t.department);
      addHistory(t, { name: "Admin" }, "Bỏ phân công", "Người đánh giá đã bị xóa khỏi hệ thống");
    }
  }
  write(state);
  return ok();
}

export function listMembers() {
  return Object.values(read().members).sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export function getMember(uid) {
  return read().members[uid] || null;
}

// Người hướng dẫn thuộc một bộ phận
export function mentorsOf(department) {
  return listMembers().filter(m => m.role === "mentor" && m.department === department);
}

// Ghi đè vai trò/bộ phận cho tài khoản đã đồng bộ
export function updateMember(uid, { role, department }) {
  const state = read();
  const member = state.members[uid];
  if (!member) return fail("Tài khoản không tồn tại hoặc chưa được duyệt.");
  if (!Object.keys(MEMBER_ROLES).includes(role)) return fail("Vai trò không hợp lệ.");

  let dept = "";
  if (role !== "hr") {
    dept = findDepartmentIn(state, department);
    if (!dept) return fail("Trưởng bộ phận và người hướng dẫn phải thuộc một bộ phận có trong danh mục.");
  }

  const changed = member.role !== role || member.department !== dept;
  if (changed) {
    // Bỏ phân công của tài khoản này ở các phiếu chưa gửi
    for (const t of Object.values(state.tickets)) {
      if (t.evaluatorUid === uid && EDITABLE.includes(t.status)) {
        t.evaluatorUid = null;
        t.evaluatorName = defaultEvaluatorName(t.department);
        addHistory(t, { name: "Admin" }, "Bỏ phân công", "Vai trò hoặc bộ phận của người đánh giá đã thay đổi");
      }
    }
  }

  member.role = role;
  member.department = dept;
  write(state);
  return ok({ member: { ...member } });
}

// Hồ sơ hiệu lực: áp dụng vai trò/bộ phận Admin đã chỉnh lên hồ sơ Firestore
export function effectiveProfile(uid, profile) {
  const member = read().members[uid];
  if (!member) return profile;
  return {
    ...profile,
    role: member.role,
    department: member.department,
    fullName: member.fullName || profile.fullName
  };
}

// ============================================
// Phân quyền (mô phỏng — quy tắc thật phải nằm ở máy chủ/Firestore Rules)
// ============================================
function isEvaluatorOf(ticket, actor) {
  if (ticket.evaluatorUid) return ticket.evaluatorUid === actor.uid;
  return actor.role === "supervisor" && actor.department === ticket.department;
}

export function canView(ticket, actor) {
  if (!ticket || !actor) return false;
  if (actor.role === "hr") return true;
  if (actor.role === "supervisor") return actor.department === ticket.department;
  if (actor.role === "mentor") return ticket.evaluatorUid === actor.uid;
  return false;
}

export function permissionsFor(ticket, actor) {
  const none = {
    scores: false, part4: false, part5: false, committee: false,
    submit: false, returnTicket: false, finalize: false, assign: false
  };
  if (!ticket || !actor) return none;

  if (actor.role === "hr") {
    const waiting = ticket.status === STATUS.WAITING;
    return { ...none, part5: waiting, committee: waiting, returnTicket: waiting, finalize: waiting };
  }

  if (!canView(ticket, actor)) return none;

  const editable = EDITABLE.includes(ticket.status);
  const base = { ...none, assign: actor.role === "supervisor" && editable };
  if (isEvaluatorOf(ticket, actor)) {
    return { ...base, scores: editable, part4: editable, submit: editable };
  }
  return base;
}

// Trưởng bộ phận giao phiếu cho người hướng dẫn cùng bộ phận (mentorUid = null: tự chấm)
export function assignEvaluator(ticketId, actor, mentorUid) {
  const state = read();
  const ticket = state.tickets[ticketId];
  if (!ticket) return fail("Phiếu không tồn tại.");
  if (!permissionsFor(ticket, actor).assign) {
    return fail("Chỉ Trưởng bộ phận của bộ phận này mới được phân công, và chỉ khi phiếu chưa gửi.");
  }

  if (mentorUid) {
    const mentor = state.members[mentorUid];
    if (!mentor || mentor.role !== "mentor" || mentor.department !== ticket.department) {
      return fail("Người hướng dẫn phải là tài khoản thuộc đúng bộ phận của phiếu.");
    }
    ticket.evaluatorUid = mentorUid;
    ticket.evaluatorName = mentor.fullName;
    addHistory(ticket, actor, "Phân công", `Giao cho ${mentor.fullName}`);
  } else {
    ticket.evaluatorUid = null;
    ticket.evaluatorName = defaultEvaluatorName(ticket.department);
    addHistory(ticket, actor, "Phân công", "Trưởng bộ phận tự đánh giá");
  }

  write(state);
  return ok({ ticket: { ...ticket } });
}

// ============================================
// Kỳ hiện hành và truy vấn phiếu
// ============================================
export function activePeriod() {
  return listPeriods().find(p => p.status === "dang_mo") || null;
}

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

// Việc cần làm theo vai trò
export function todoFor(actor, periodId = null) {
  const tickets = listTickets(actor, periodId);
  if (actor.role === "supervisor") {
    // Phiếu của bộ phận chưa giao người hướng dẫn và còn mở
    return tickets.filter(t => !t.evaluatorUid && EDITABLE.includes(t.status));
  }
  if (actor.role === "mentor") {
    return tickets.filter(t => EDITABLE.includes(t.status));
  }
  if (actor.role === "hr") {
    return tickets.filter(t => t.status === STATUS.WAITING);
  }
  return [];
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
  const departments = DEFAULT_DEPARTMENTS;
  const surnames = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ"];
  const middle = ["Văn", "Thị", "Minh", "Thu", "Hoàng", "Quốc", "Ngọc", "Anh"];
  const given = ["An", "Bình", "Châu", "Dũng", "Hà", "Khang", "Linh", "Nam", "Phương", "Quân", "Trang", "Uyên", "Việt"];
  const schools = ["Trường ĐH Demo A", "Trường ĐH Demo B", "Trường CĐ Demo C", "Trường ĐH Demo D"];

  const state = emptyState();
  for (const d of departments) state.departments[d.code] = d;

  const period = { id: "EV-2026-10", month: "2026-10", name: "Tháng 10/2026 (dữ liệu mẫu)", status: "dang_mo", createdAt: now() };
  state.periods[period.id] = period;

  for (let i = 1; i <= 520; i++) {
    const internId = `SV${String(i).padStart(4, "0")}`;
    const dept = pick(departments).code;
    state.interns[internId] = {
      internId,
      fullName: `${pick(surnames)} ${pick(middle)} ${pick(given)}`,
      school: pick(schools),
      department: dept,
      startDate: "2026-10-01",
      endDate: "2026-12-31",
      importedAt: now(),
      updatedAt: now()
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
      department: dept,
      evaluatorUid: null,
      evaluatorName: defaultEvaluatorName(dept),
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
    localStorage.removeItem(LEGACY_KEY);
  } catch (error) {
    // bỏ qua
  }
}

// ============================================
// Thống kê và định dạng
// ============================================
// Theo README mục 7.2: chỉ "đã chốt" mới tính là hoàn tất
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
  listDepartments,
  createDepartment,
  deleteDepartment,
  departmentName,
  departmentKnown,
  listPeriods,
  createPeriod,
  generateTickets,
  syncPeriodTickets,
  syncOpenPeriods,
  classifyInterns,
  evaluationReason,
  followUp,
  followUpFor,
  todayIso,
  FOLLOW_UP_DAYS,
  internshipInPeriod,
  listInterns,
  createIntern,
  updateIntern,
  deleteIntern,
  parseCsv,
  importInterns,
  syncMembers,
  listMembers,
  getMember,
  mentorsOf,
  updateMember,
  removeMember,
  effectiveProfile,
  loadSampleData,
  resetDemo,
  listTickets,
  listAllTickets,
  getTicket,
  activePeriod,
  todoFor,
  canView,
  permissionsFor,
  assignEvaluator,
  saveDraft,
  submit,
  returnTicket,
  finalize,
  stats,
  formatDateTime
};
