// ============================================
// modules/interns.js
// Thực tập sinh: danh sách ở app.html; SVTT, theo dõi sắp về, bộ phận và nhập CSV ở admin.html.
// ============================================

import { announce } from "../components/messages.js";
import { DemoStore, INTERN_COLUMNS } from "../db.js";
import { ensureAdmin, ensureBusiness, refreshData, renderView } from "../layout.js";
import { NO_DEPT_ROLES, admin, state } from "../state.js";
import { actorInfo, departmentLabel, escapeHtml, formatDate, html, isHR, parseViewDate, viewDate } from "../utils.js";

// ===== Mục "Thực tập sinh" trong app.html (xem danh sách SVTT trong phạm vi vai trò) =====
export function visibleInterns(actor) {
  const all = DemoStore.listInterns();
  if (actor.role === "hr") return all;
  if (actor.role === "supervisor") return all.filter(i => i.department === actor.department);
  const ids = new Set(DemoStore.listTickets(actor).map(t => t.internId));
  return all.filter(i => ids.has(i.internId));
}

export function daysUntil(iso, today) {
  return Math.round((Date.parse(iso) - Date.parse(today)) / 86400000);
}

export function internStatusBadge(intern, today) {
  if (!intern.endDate) return "—";
  const left = daysUntil(intern.endDate, today);
  if (left < 0) return `<span class="mentor-flag mentor-flag--ok">Đã kết thúc</span>`;
  if (left <= DemoStore.FOLLOW_UP_DAYS) return `<span class="mentor-flag">Còn ${left} ngày</span>`;
  return `<span class="mentor-flag mentor-flag--ok">Đang thực tập</span>`;
}

export function fillInternsRows() {
  const body = document.getElementById("internsBody");
  const count = document.getElementById("internsCount");
  if (!body) return;
  const today = DemoStore.todayIso();
  const q = state.interns.q.trim().toLowerCase();
  const list = visibleInterns(actorInfo()).filter(i =>
    !q || `${i.internId} ${i.fullName} ${i.school || ""}`.toLowerCase().includes(q));
  if (count) count.textContent = `${list.length} SVTT`;
  body.innerHTML = list.length
    ? list.map(i => `
      <tr>
        <td>${escapeHtml(i.internId)}</td>
        <td>${escapeHtml(i.fullName)}</td>
        <td>${escapeHtml(i.school || "—")}</td>
        <td>${escapeHtml(i.department)}<br><small>${escapeHtml(DemoStore.departmentName(i.department))}</small></td>
        <td>${formatDate(i.startDate)}</td>
        <td>${formatDate(i.endDate)}</td>
        <td>${internStatusBadge(i, today)}</td>
      </tr>`).join("")
    : `<tr class="empty-state"><td colspan="7">Chưa có thực tập sinh nào trong phạm vi của bạn</td></tr>`;
}

export function renderInternsView() {
  const root = document.getElementById("internsRoot");
  if (!root) return;
  if (!root.dataset.bound) {
    root.dataset.bound = "1";
    root.addEventListener("input", event => {
      if (!event.target.matches("[data-interns-q]")) return;
      state.interns.q = event.target.value;
      fillInternsRows();
    });
  }
  const scope = isHR() ? "Tất cả thực tập sinh." : "Thực tập sinh thuộc bộ phận của bạn.";
  root.innerHTML = `
    <h2 style="display:flex;justify-content:space-between;align-items:center;margin:0 0 6px;">
      <span>Thực tập sinh</span>
      <span class="count-badge" id="internsCount"></span>
    </h2>
    <p style="margin:0 0 16px;color:var(--text-muted);font-size:13px;">${scope} Cảnh báo hiện khi SVTT còn dưới ${DemoStore.FOLLOW_UP_DAYS} ngày là kết thúc thực tập.</p>
    <div class="assign-toolbar">
      <input type="search" class="search-input" data-interns-q placeholder="Tìm theo tên, mã SV hoặc trường" value="${escapeHtml(state.interns.q)}">
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Mã SV</th><th>Họ tên</th><th>Trường</th><th>Bộ phận</th><th>Bắt đầu</th><th>Kết thúc</th><th>Tình trạng</th></tr>
        </thead>
        <tbody id="internsBody"></tbody>
      </table>
    </div>`;
  fillInternsRows();
}

export function importResultHtml() {
  if (!admin.lastImport) return "";
  const errorItems = admin.lastImport.errors.slice(0, 20)
    .map(e => `<li>Dòng ${e.line}: ${html(e.message)}</li>`).join("");
  return `
    <div class="ih-notice" style="margin-top:12px;">
      Lần nhập gần nhất: ${admin.lastImport.added} SVTT mới, ${admin.lastImport.skipped} đã có (giữ nguyên),
      ${admin.lastImport.errors.length} dòng lỗi (không nhập).
      ${errorItems ? `<ul>${errorItems}</ul>` : ""}
    </div>`;
}

export function renderInterns() {
  const interns = DemoStore.listInterns();
  const edit = admin.editingInternId ? interns.find(i => i.internId === admin.editingInternId) : null;
  const v = field => html(field === "startDate" || field === "endDate" ? viewDate(edit?.[field]) : (edit?.[field] ?? ""));

  const deptOptions = admin.departments
    .map(d => `<option value="${html(d.code)}" ${edit?.department === d.code ? "selected" : ""}>${html(d.code)} — ${html(d.name)}</option>`)
    .join("");

  const followMap = new Map(DemoStore.followUp(admin.followDate || DemoStore.todayIso()).map(r => [r.internId, r]));
  const rows = interns.map(i => `
      <tr>
        <td>${html(i.internId)}</td>
        <td>${html(i.fullName)}</td>
        <td>${html(i.school || "—")}</td>
        <td>${html(departmentLabel(i.department))}</td>
        <td>${html(viewDate(i.startDate) || "—")} → ${html(viewDate(i.endDate) || "—")}</td>
        <td>${followMap.get(i.internId)?.leavingSoon ? `<span class="ih-status ih-status--pending">Sắp về</span>` : "—"}</td>
        <td class="ih-actions">
          <button type="button" class="ih-btn ih-btn--secondary"
            data-action="edit-intern" data-intern-id="${html(i.internId)}">Sửa</button>
          <button type="button" class="ih-btn ih-btn--danger"
            data-action="delete-intern" data-intern-id="${html(i.internId)}">Xóa</button>
        </td>
      </tr>`).join("");

  return `
    <section class="ih-section">
      <div class="ih-section__heading">
        <div>
          <h2>Sinh viên thực tập</h2>
        </div>
      </div>

      <p><strong>${interns.length}</strong> SVTT · ${admin.departments.length} bộ phận trong danh mục</p>

      <label class="ih-file">
        <input type="file" accept=".csv,text/csv" data-import-file>
        <span class="ih-file__btn">📄 Chọn file CSV</span>
        <span class="ih-file__hint">Định dạng .csv, mã hóa UTF-8</span>
      </label>
      ${importResultHtml()}

      <div style="display:flex;gap:8px;flex-wrap:wrap;margin:16px 0;">
        <button type="button" class="ih-btn ih-btn--secondary" data-action="load-sample">Nạp dữ liệu mẫu (520 SVTT)</button>
        <button type="button" class="ih-btn ih-btn--secondary" data-action="reset-demo">Xóa toàn bộ dữ liệu mô phỏng</button>
      </div>

      <div data-intern-form class="ih-form">
        <h3>${edit ? `Sửa SVTT ${html(edit.internId)}` : "Thêm SVTT thủ công"}</h3>
        <div class="ih-form-grid">
          <div class="ih-field">
            <label for="fMaSv">Mã SV</label>
            <input id="fMaSv" class="ih-input" type="text" name="internId" value="${v("internId")}"
              placeholder="Ví dụ: SV001" ${edit ? "readonly" : ""}>
          </div>
          <div class="ih-field">
            <label for="fHoTen">Họ tên</label>
            <input id="fHoTen" class="ih-input" type="text" name="fullName" value="${v("fullName")}"
              placeholder="Nguyễn Văn A">
          </div>
          <div class="ih-field">
            <label for="fTruong">Trường</label>
            <input id="fTruong" class="ih-input" type="text" name="school" value="${v("school")}"
              placeholder="Tên trường">
          </div>
          <div class="ih-field">
            <label for="fBoPhan">Bộ phận</label>
            <select id="fBoPhan" class="ih-select" name="department">
              <option value="">— Chọn bộ phận —</option>
              ${deptOptions}
            </select>
          </div>
          <div class="ih-field">
            <label for="fStart">Ngày bắt đầu</label>
            <input id="fStart" class="ih-input" type="text" name="startDate" value="${v("startDate")}"
              placeholder="dd/mm/yyyy" inputmode="numeric" maxlength="10">
          </div>
          <div class="ih-field">
            <label for="fEnd">Ngày kết thúc</label>
            <input id="fEnd" class="ih-input" type="text" name="endDate" value="${v("endDate")}"
              placeholder="dd/mm/yyyy" inputmode="numeric" maxlength="10">
          </div>
        </div>
        <div class="ih-form-actions">
          ${edit ? `<button type="button" class="ih-btn ih-btn--secondary" data-action="cancel-intern-edit">Hủy sửa</button>` : ""}
          <button type="button" class="ih-btn ih-btn--primary" data-action="submit-intern">
            ${edit ? "Lưu thay đổi" : "Thêm SVTT"}
          </button>
        </div>
      </div>

      ${interns.length ? `
      <div class="ih-table-wrap">
        <table class="ih-table">
          <thead>
            <tr><th>Mã SV</th><th>Họ tên</th><th>Trường</th><th>Bộ phận</th><th>Thời gian thực tập</th><th>Sắp về</th><th>Thao tác</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>` : `<p class="ih-empty">Chưa có SVTT nào.</p>`}
    </section>
  `;
}

export function renderFollowUp() {
  const date = admin.followDate || DemoStore.todayIso();
  const rows = DemoStore.followUp(date);
  const alerts = rows.filter(r => r.level === "alert");
  const soon = rows.filter(r => r.leavingSoon);

  const body = rows.length
    ? rows.map(r => `
        <tr>
          <td><strong>${html(r.internName)}</strong><small>${html(r.internId)}</small></td>
          <td>${html(departmentLabel(r.department))}</td>
          <td>${html(r.endDate.split("-").reverse().join("/"))}</td>
          <td>${r.daysLeft < 0 ? `Đã về ${-r.daysLeft} ngày trước` : `còn ${r.daysLeft} ngày`}</td>
          <td>${r.leavingSoon ? `<span class="ih-status ih-status--pending">Sắp về</span>` : "—"}</td>
          <td>${r.hasTicket ? "Đã có phiếu" : "Chưa có phiếu"}</td>
          <td class="${r.level === "alert" ? "ih-error" : ""}">${html(r.message)}</td>
        </tr>`).join("")
    : `<tr><td colspan="7" class="ih-empty">Không có SVTT cần theo dõi vào ngày này.</td></tr>`;

  return `
    <section class="ih-section">
      <div class="ih-section__heading">
        <div>
          <h2>Theo dõi SVTT sắp về</h2>
          <p>Cảnh báo bắt đầu trước ngày về ${DemoStore.FOLLOW_UP_DAYS} ngày theo lịch (kể cả thứ 7, chủ nhật) để kịp tạo phiếu đánh giá cho kỳ có ngày về.</p>
        </div>
      </div>

      <label>Ngày kiểm tra<br>
        <input id="followDate" class="ih-input" type="text" value="${html(viewDate(date))}" data-follow-date
          placeholder="dd/mm/yyyy" inputmode="numeric" maxlength="10" style="max-width:200px;">
      </label>

      <div class="ih-notice" style="margin:12px 0;">
        <strong>${alerts.length}</strong> cần làm ngay ·
        <strong>${soon.length}</strong> sắp về trong ${DemoStore.FOLLOW_UP_DAYS} ngày
      </div>

      <div class="ih-table-wrap">
        <table class="ih-table">
          <thead>
            <tr>
              <th>SVTT</th><th>Bộ phận</th><th>Ngày về</th><th>Thời gian</th>
              <th>Sắp về</th><th>Phiếu</th><th>Cảnh báo</th>
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    </section>`;
}

export function renderDepartments() {
  const interns = DemoStore.listInterns();
  const members = DemoStore.listMembers();
  const dEdit = admin.editingDeptCode ? admin.departments.find(d => d.code === admin.editingDeptCode) : null;

  const rows = admin.departments.map(d => {
    const internCount = interns.filter(i => i.department === d.code).length;
    const memberCount = members.filter(m => m.department === d.code).length;
    return `
      <tr>
        <td><strong>${html(d.code)}</strong></td>
        <td>${html(d.name)}</td>
        <td>${internCount}</td>
        <td>${memberCount}</td>
        <td class="ih-actions">
          <button type="button" class="ih-btn ih-btn--secondary"
            data-action="edit-department" data-code="${html(d.code)}">Sửa</button>
          <button type="button" class="ih-btn ih-btn--danger"
            data-action="delete-department" data-code="${html(d.code)}">Xóa</button>
        </td>
      </tr>`;
  }).join("");

  return `
    <section class="ih-section">
      <div class="ih-section__heading">
        <div>
          <h2>Danh mục bộ phận</h2>
          <p>Không xóa được bộ phận đang có SVTT hoặc tài khoản.</p>
        </div>
      </div>

      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:16px;">
        <div class="ih-field" style="min-width:160px;">
          <label for="dCode">Mã bộ phận</label>
          <input id="dCode" class="ih-input" type="text" name="deptCode" maxlength="12" placeholder="Ví dụ: LT"
            value="${html(dEdit?.code || "")}" ${dEdit ? "readonly" : ""} style="text-transform:uppercase;">
        </div>
        <div class="ih-field" style="min-width:320px;flex:1;">
          <label for="dName">Tên bộ phận</label>
          <input id="dName" class="ih-input" type="text" name="deptName" placeholder="Ví dụ: Bộ phận Lễ tân"
            value="${html(dEdit?.name || "")}">
        </div>
        ${dEdit ? `
          <button type="button" class="ih-btn ih-btn--primary" data-action="save-department">Lưu thay đổi</button>
          <button type="button" class="ih-btn ih-btn--secondary" data-action="cancel-department-edit">Hủy sửa</button>`
        : `<button type="button" class="ih-btn ih-btn--primary" data-action="create-department">Thêm bộ phận</button>`}
      </div>

      <div class="ih-table-wrap">
        <table class="ih-table">
          <thead>
            <tr><th>Mã</th><th>Tên bộ phận</th><th>SVTT</th><th>Tài khoản</th><th>Thao tác</th></tr>
          </thead>
          <tbody>
            ${rows || `<tr><td colspan="5" class="ih-empty">Chưa có bộ phận nào.</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

export async function handleDemoAction(action, button) {
  const demoActions = [
    "create-period", "generate-tickets", "load-sample", "reset-demo",
    "create-department", "delete-department", "save-department",
    "edit-department", "cancel-department-edit",
    "submit-intern", "edit-intern", "cancel-intern-edit", "delete-intern",
    "save-member"
  ];
  if (!demoActions.includes(action)) return false;

  try {
    ensureBusiness();
    // Nạp dữ liệu mẫu, reset và quản lý tài khoản chỉ dành cho Admin
    if (["load-sample", "reset-demo", "save-member"].includes(action)) ensureAdmin();
  } catch (error) {
    announce(error.message, "error");
    return true;
  }

  const report = (result, okText) => {
    announce(result.ok ? okText : result.error, result.ok ? "success" : "error");
  };

  if (action === "create-period") {
    const month = admin.mountNode.querySelector('[name="month"]')?.value;
    const name = admin.mountNode.querySelector('[name="name"]')?.value;
    const created = DemoStore.createPeriod({ month, name });
    const sync = created.sync;
    announce(
      created.ok
        ? `Đã tạo kỳ. Tự động tạo ${sync?.created ?? 0} phiếu cho ${sync?.eligible ?? 0} SVTT thuộc kỳ.`
        : created.error,
      created.ok ? "success" : "error"
    );

  } else if (action === "generate-tickets") {
    const result = DemoStore.generateTickets(button.dataset.periodId);
    announce(
      result.ok
        ? `Đồng bộ xong: thêm ${result.created} phiếu, gỡ ${result.removed} phiếu chưa làm của SVTT ngoài kỳ, giữ ${result.kept} phiếu đã có tiến độ.`
        : result.error,
      result.ok ? "success" : "error"
    );

  } else if (action === "load-sample") {
    if (!window.confirm("Nạp dữ liệu mẫu sẽ THAY THẾ toàn bộ bộ phận, kỳ, SVTT và phiếu hiện có. Tiếp tục?")) return true;
    DemoStore.loadSampleData();
    admin.lastImport = null;
    admin.editingInternId = null;
    announce("Đã nạp dữ liệu mẫu (dữ liệu giả lập).");

  } else if (action === "reset-demo") {
    if (!window.confirm("Xóa toàn bộ dữ liệu mô phỏng (bộ phận, SVTT, kỳ, phiếu, phân vai trò) trên trình duyệt này?")) return true;
    DemoStore.resetDemo();
    admin.lastImport = null;
    admin.editingInternId = null;
    announce("Đã xóa dữ liệu mô phỏng.");

  } else if (action === "create-department") {
    const code = admin.mountNode.querySelector('[name="deptCode"]')?.value;
    const name = admin.mountNode.querySelector('[name="deptName"]')?.value;
    report(DemoStore.createDepartment({ code, name }), "Đã thêm bộ phận.");

  } else if (action === "edit-department") {
    admin.editingDeptCode = button.dataset.code;

  } else if (action === "cancel-department-edit") {
    admin.editingDeptCode = null;

  } else if (action === "save-department") {
    const name = admin.mountNode.querySelector('[name="deptName"]')?.value;
    const result = DemoStore.updateDepartment(admin.editingDeptCode, name);
    if (result.ok) admin.editingDeptCode = null;
    report(result, "Đã cập nhật tên bộ phận.");

  } else if (action === "delete-department") {
    if (!window.confirm(`Xóa bộ phận ${button.dataset.code}?`)) return true;
    report(DemoStore.deleteDepartment(button.dataset.code), "Đã xóa bộ phận.");

  } else if (action === "submit-intern") {
    const form = admin.mountNode.querySelector("[data-intern-form]");
    const get = name => form?.querySelector(`[name="${name}"]`)?.value ?? "";
    const data = {
      internId: get("internId"),
      fullName: get("fullName"),
      school: get("school"),
      department: get("department"),
      startDate: get("startDate"),
      endDate: get("endDate")
    };
    const result = admin.editingInternId
      ? DemoStore.updateIntern(admin.editingInternId, data)
      : DemoStore.createIntern(data);
    if (result.ok) admin.editingInternId = null;
    report(result, "Đã lưu SVTT.");

  } else if (action === "edit-intern") {
    admin.editingInternId = button.dataset.internId;

  } else if (action === "cancel-intern-edit") {
    admin.editingInternId = null;

  } else if (action === "delete-intern") {
    if (!window.confirm(`Xóa SVTT ${button.dataset.internId}?`)) return true;
    if (admin.editingInternId === button.dataset.internId) admin.editingInternId = null;
    report(DemoStore.deleteIntern(button.dataset.internId), "Đã xóa SVTT.");

  } else if (action === "save-member") {
    const uid = button.dataset.userId;
    const role = admin.mountNode.querySelector(`[data-member-role-for="${CSS.escape(uid)}"]`)?.value;
    const department = admin.mountNode.querySelector(`[data-member-dept-for="${CSS.escape(uid)}"]`)?.value;
    if (!NO_DEPT_ROLES.includes(role) && !department) {
      announce("Người hướng dẫn và Trưởng bộ phận phải chọn bộ phận.", "error");
      return true;
    }
    report(DemoStore.updateMember(uid, { role, department }), "Đã cập nhật vai trò và bộ phận (mô phỏng).");
  }

  await refreshData();
  return true;
}

// Đọc file CSV của Admin, kiểm tra cột rồi nhập
export async function handleFileChange(event) {
  const input = event.target;

  // Phòng Nhân sự không thuộc bộ phận nào: ẩn ô bộ phận khi chọn vai trò HR
  if (input instanceof HTMLSelectElement && input.matches("[data-role-for], [data-member-role-for]")) {
    const uid = input.dataset.roleFor || input.dataset.memberRoleFor;
    const wrap = admin.mountNode.querySelector(`[data-dept-wrap-for="${CSS.escape(uid)}"]`);
    if (wrap) wrap.hidden = NO_DEPT_ROLES.includes(input.value);
    return;
  }

  if (input instanceof HTMLInputElement && input.matches("[data-follow-date]")) {
    const iso = parseViewDate(input.value);
    if (!iso) {
      announce("Ngày kiểm tra phải có dạng dd/mm/yyyy.", "error");
      return;
    }
    admin.followDate = iso;
    renderView();
    return;
  }
  if (!(input instanceof HTMLInputElement) || !input.matches("[data-import-file]")) return;
  const file = input.files?.[0];
  if (!file) return;

  try {
    ensureBusiness();
    const parsed = DemoStore.parseCsv(await file.text());
    const headers = parsed.headers.map(h => String(h).trim().toLowerCase());
    const columnIndex = INTERN_COLUMNS.map(name => headers.indexOf(name.toLowerCase()));
    const requiredIdx = [0, 1, 3]; // Mã SV, Họ tên, Bộ phận
    const missing = requiredIdx.filter(i => columnIndex[i] === -1).map(i => INTERN_COLUMNS[i]);

    if (missing.length) {
      announce(`File thiếu cột bắt buộc: ${missing.join(", ")}.`, "error");
      input.value = "";
      return;
    }

    const rows = parsed.rows.map(row => ({
      line: row.line,
      cells: columnIndex.map(idx => (idx === -1 ? "" : row.cells[idx] ?? ""))
    }));

    admin.lastImport = DemoStore.importInterns(rows);
    announce(
      `Đã nhập ${admin.lastImport.added} SVTT mới, ${admin.lastImport.skipped} đã có, ${admin.lastImport.errors.length} dòng lỗi.`,
      admin.lastImport.errors.length ? "error" : "success"
    );
  } catch (error) {
    console.error("[InternHub Admin] Import error", error);
    announce("Không đọc được file. Vui lòng dùng file CSV.", "error");
  }

  input.value = "";
  await refreshData();
}
