// ============================================
// state.js
// Trạng thái dùng chung (state, admin) và hằng số nghiệp vụ của giao diện.
// ============================================

import { ROLES, USER_STATUS } from "./firebase-config.js";

// Trạng thái dùng chung của trang ứng dụng (app.html). Dùng một đối tượng để mọi module cùng đọc/ghi.
export const state = {
  currentUser: null,
  userProfile: null,
  tickets: [],
  assignDept: "PNS", // bộ phận đang phân công của Phòng Nhân sự (mặc định = HR_DEPT)
  interns: { q: "", school: "", status: "", limit: 6 },
  assignLimit: 6,
  timesheet: { periodId: "", q: "", dept: "", limit: 5 },
  reports: { periodId: "", dept: "", limit: 5 }
};

// Trạng thái trang quản trị (admin.html)
export const admin = {
  mountNode: null,
  currentTab: "overview",
  users: [],
  periods: [],
  departments: [],
  tickets: [],
  loading: false,
  lastImport: null,
  editingInternId: null,
  editingDeptCode: null,
  followDate: "",
  loadError: "",
  currentRole: "admin", // "admin" (toàn quyền) hoặc "hr" (nghiệp vụ, không quản lý tài khoản)
  unwatchUsers: null
};

export const HR_PER_PAGE = 25;

export const HR_DEPT = "PNS"; // Bộ phận của Phòng Nhân sự (khớp HR_DEPARTMENT trong demo-store.js)

export const HR_ORDER = ["cho_to_cong_tac", "cho_truong_bo_phan", "dang_thuc_hien", "tra_ve", "chua_bat_dau", "da_chot"];

export const HR_COLOR = {
  cho_to_cong_tac: "#e0a526",
  cho_truong_bo_phan: "#8b5cf6",
  dang_thuc_hien: "#3b82f6",
  tra_ve: "#e05a4a",
  chua_bat_dau: "#cbd5e1",
  da_chot: "#2d8c7f"
};

export const hrState = { periodId: "", dept: "", status: "", evaluator: "", q: "", limits: {} };

// Số SVTT hiển thị trước trong mỗi nhóm trạng thái, và số thêm mỗi lần bấm "Xem thêm"
export const GROUP_PREVIEW = 3;
export const GROUP_MORE_STEP = 10;

// Bộ lọc danh sách phiếu cho Người hướng dẫn / Trưởng bộ phận
export const evState = { periodId: "", q: "", status: "", evaluator: "", limits: {} };

// Phiếu đã chọn để in hàng loạt (Phòng Nhân sự)
export const hrPrintSel = new Set();

// Nhóm hiển thị trên đầu danh sách phiếu của Phòng Nhân sự
export const HR_GROUPS = [
  { key: "pns", title: "Phòng Nhân sự đánh giá", hint: "" },
  { key: "waiting_committee", title: "Chờ Tổ Công tác sinh viên", hint: "Phiếu đã qua bộ phận. Cần phân công Tổ Công tác sinh viên chấm điểm và chốt." },
  { key: "waiting_dept", title: "Đang đợi Bộ phận đánh giá", hint: "Chưa gửi hoặc đã bị trả về, bộ phận đang xử lý." },
  { key: "finalized", title: "Đã chốt", hint: "" }
];

// Trạng thái chọn phiếu để gán hàng loạt (giữ qua các lần lọc)
export const assignSelected = new Set();

export const ADMIN_EMAIL = "dptbinh193@gmail.com";

// Vai trò không thuộc bộ phận nào
export const NO_DEPT_ROLES = [ROLES.HR, ROLES.COMMITTEE];

// Chỉ hai vai trò này được phép gán khi duyệt tài khoản.
export const ASSIGNABLE_ROLES = {
  [ROLES.HR]: "Phòng Nhân sự",
  [ROLES.SUPERVISOR]: "Trưởng bộ phận",
  [ROLES.MENTOR]: "Người hướng dẫn",
  [ROLES.COMMITTEE]: "Tổ Công tác sinh viên"
};

// Nhãn hiển thị, bao gồm cả các vai trò cũ nếu có trong dữ liệu.
export const ROLE_LABELS = {
  [ROLES.ADMIN]: "Quản trị hệ thống",
  [ROLES.HR]: "Phòng Nhân sự",
  [ROLES.SUPERVISOR]: "Trưởng bộ phận",
  [ROLES.MENTOR]: "Người hướng dẫn",
  [ROLES.COMMITTEE]: "Tổ Công tác sinh viên",
  [ROLES.INTERN]: "Sinh viên thực tập",
  [ROLES.USER]: "Người dùng"
};

export const STATUS_LABELS = {
  [USER_STATUS.PENDING]: "Chờ duyệt",
  [USER_STATUS.APPROVED]: "Đã duyệt",
  [USER_STATUS.REJECTED]: "Từ chối"
};

export const TICKET_STATUS_LABELS = {
  chua_bat_dau: "Chưa bắt đầu",
  dang_thuc_hien: "Đang thực hiện",
  cho_to_cong_tac: "Chờ Tổ Công tác sinh viên",
  da_chot: "Đã chốt"
};
