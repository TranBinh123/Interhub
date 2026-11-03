// ============================================
// modules/dashboard.js
// Tổng quan (app.html) và tổng quan quản trị + quản lý tài khoản (admin.html).
// ============================================

import { applyHrLayout } from "../components/sidebar.js";
import { DemoStore, MEMBER_ROLES, STATUS, STATUS_LABEL } from "../db.js";
import { USER_STATUS } from "../firebase-config.js";
import { switchView } from "../layout.js";
import { displayAllTickets, hrAllTickets, hrEnsurePeriod, renderHrAll } from "./evaluations.js";
import { renderPeriods } from "./periods.js";
import { ASSIGNABLE_ROLES, HR_COLOR, HR_ORDER, NO_DEPT_ROLES, ROLE_LABELS, STATUS_LABELS, admin, hrState, state } from "../state.js";
import { actorInfo, dateText, departmentLabel, escapeHtml, html, isHR } from "../utils.js";

export function hrCounts(list) {
  const c = Object.fromEntries(HR_ORDER.map(k => [k, 0]));
  list.forEach(t => { if (t.status in c) c[t.status] += 1; });
  return c;
}

export function hrBar(counts, total) {
  if (!total) return `<div class="hr-bar"></div>`;
  const segs = HR_ORDER.filter(k => counts[k])
    .map(k => `<i style="flex-grow:${counts[k]};background:${HR_COLOR[k]}" title="${escapeHtml(STATUS_LABEL[k])}: ${counts[k]}"></i>`)
    .join("");
  const label = HR_ORDER.map(k => `${STATUS_LABEL[k]} ${counts[k]}`).join(", ");
  return `<div class="hr-bar" role="img" aria-label="${escapeHtml(label)}">${segs}</div>`;
}

// Biểu đồ tròn (donut) cho tiến độ kỳ
export function hrDonut(counts, total) {
  if (!total) {
    return `<div class="donut" style="background:conic-gradient(var(--border) 0 100%)"><div class="donut__hole"></div></div>`;
  }
  let acc = 0;
  const stops = HR_ORDER.filter(k => counts[k]).map(k => {
    const start = acc;
    acc += (counts[k] / total) * 100;
    return `${HR_COLOR[k]} ${start}% ${acc}%`;
  }).join(", ");
  return `<div class="donut" style="background:conic-gradient(${stops})"><div class="donut__hole"></div></div>`;
}

// Thanh tiến độ 1 màu cho bảng theo bộ phận
export function hrDeptBar(pct) {
  return `<div class="hr-progress-cell">
    <div class="hr-bar hr-bar--single"><i style="width:${pct}%"></i></div>
    <span class="hr-progress-pct">${pct}%</span>
  </div>`;
}

export function hrDeptOptions(selected) {
  return [
    `<option value="">Tất cả bộ phận</option>`,
    ...DemoStore.listDepartments().map(d =>
      `<option value="${escapeHtml(d.code)}" ${selected === d.code ? "selected" : ""}>${escapeHtml(d.code)} — ${escapeHtml(d.name)}</option>`)
  ].join("");
}

export function renderHrDashboard() {
  const box = document.getElementById("hrDashboard");
  if (!box) return;

  const periods = DemoStore.listPeriods();
  const period = hrEnsurePeriod();
  const all = hrAllTickets();
  const inDept = t => !hrState.dept || t.department === hrState.dept;
  const list = all.filter(inDept);
  const c = hrCounts(list);
  const total = list.length;
  const pct = total ? Math.round((c.da_chot / total) * 100) : 0;

  const cards = periods.map(p => {
    const pl = DemoStore.listTickets(actorInfo(), p.id).filter(inDept);
    const pc = hrCounts(pl);
    const open = p.status === "dang_mo";
    return `
      <button type="button" class="hr-pcard${p.id === hrState.periodId ? " is-selected" : ""}" data-hr-period="${escapeHtml(p.id)}">
        <span class="hr-pcard__icon">📅</span>
        <span class="hr-pcard__body">
          <span class="hr-pcard__top">
            <span class="hr-code">${escapeHtml(p.id)}</span>
            <span class="hr-chip${open ? " is-open" : ""}">${open ? "Đang mở" : "Đã đóng"}</span>
          </span>
          <span class="hr-meta">Đã chốt ${pc.da_chot}/${pl.length}</span>
          ${hrBar(pc, pl.length)}
        </span>
        <span class="hr-pcard__chevron">›</span>
      </button>`;
  }).join("");

  const queue = list.filter(t => t.status === STATUS.COMMITTEE);
  const bySchool = new Map();
  queue.forEach(t => {
    const key = t.school || "";
    bySchool.set(key, (bySchool.get(key) || 0) + 1);
  });
  const schoolInfo = new Map(DemoStore.listCommitteeSchools(period?.id).map(g => [g.school, g]));
  const queueHtml = bySchool.size
    ? `<ul class="hr-queue">${[...bySchool.entries()].sort((a, b) => b[1] - a[1]).map(([school, count]) => `
        <li>
          <div>
            <strong>${escapeHtml(school || "Chưa có trường")}</strong>
            <small>${count} phiếu chờ chấm · Tổ CTSV: ${escapeHtml(schoolInfo.get(school)?.committeeName || "chưa phân công")}</small>
          </div>
          <button type="button" class="hr-btn-sm" data-hr-go-committee>Phân công</button>
        </li>`).join("")}</ul>`
    : `<div class="hr-empty-icon-wrap"><div class="hr-empty-icon">✅</div><p class="hr-empty">Không có phiếu nào đang chờ Tổ Công tác sinh viên.</p></div>`;

  const deptRows = DemoStore.listDepartments()
    .filter(d => !hrState.dept || d.code === hrState.dept)
    .map(d => {
      const dl = all.filter(t => t.department === d.code);
      return { d, dc: hrCounts(dl), n: dl.length };
    })
    .filter(r => r.n)
    .sort((a, b) => (a.dc.da_chot / a.n) - (b.dc.da_chot / b.n));

  box.innerHTML = `
    <div class="hr-head">
      <div>
        <h1><span class="hr-head__icon">📊</span>Tổng quan</h1>
        <p class="hr-sub">Theo dõi tiến độ từng kỳ. Chi tiết được cập nhật theo thời gian thực.</p>
      </div>
      <div class="hr-field">
        <label for="hrDeptDash">Bộ phận</label>
        <select id="hrDeptDash" class="hr-select" data-hr-dept-filter>${hrDeptOptions(hrState.dept)}</select>
      </div>
    </div>

    <div class="hr-periods">
      ${cards || `<p class="hr-empty">Chưa có kỳ đánh giá. Tạo kỳ ở mục "Quản lý SVTT & kỳ".</p>`}
    </div>

    <div class="hr-cols">
      <section class="hr-panel">
        <div class="hr-panel__head">
          <h2>Tiến độ kỳ ${escapeHtml(period?.id || "—")}</h2>
          <span class="hr-meta">${total} phiếu</span>
        </div>
        <div class="hr-big">${pct}%</div>
        <p class="hr-meta">Hoàn tất – đã chốt ${c.da_chot}/${total} phiếu</p>
        <div class="hr-progress-row">
          ${hrDonut(c, total)}
          <ul class="hr-legend">
            ${HR_ORDER.map(k => `
              <li>
                <button type="button" data-hr-open-status="${k}">
                  <span class="hr-sw" style="background:${HR_COLOR[k]}"></span>
                  ${escapeHtml(STATUS_LABEL[k])}
                  <b>${c[k]}</b>
                </button>
              </li>`).join("")}
          </ul>
        </div>
      </section>

      <section class="hr-panel">
        <div class="hr-panel__head">
          <h2>Chờ Tổ Công tác sinh viên</h2>
          <span class="hr-meta">${queue.length} phiếu</span>
        </div>
        ${queueHtml}
      </section>

    </div>

    <section class="hr-panel">
      <div class="hr-panel__head">
        <h2>Tiến độ theo bộ phận</h2>
        <span class="hr-meta">Sắp xếp từ bộ phận chậm nhất · bấm dòng để xem phiếu</span>
      </div>
      ${deptRows.length ? `
        <div class="hr-table-wrap">
          <table class="hr-table">
            <thead>
              <tr>
                <th>Bộ phận</th>
                <th>Tiến độ</th>
                <th class="r">Tổng</th>
                <th class="r">Chờ Tổ CTSV</th>
                <th class="r">Đã chốt</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${deptRows.map(r => {
                const dp = r.n ? Math.round((r.dc.da_chot / r.n) * 100) : 0;
                return `
                <tr data-hr-open-dept="${escapeHtml(r.d.code)}">
                  <td>${escapeHtml(r.d.name)}</td>
                  <td class="hr-w">${hrDeptBar(dp)}</td>
                  <td class="r">${r.n}</td>
                  <td class="r">${r.dc.cho_to_cong_tac}</td>
                  <td class="r">${r.dc.da_chot}</td>
                  <td class="hr-chev">›</td>
                </tr>`;
              }).join("")}
            </tbody>
          </table>
        </div>` : `<p class="hr-empty">Chưa có phiếu trong kỳ này.</p>`}
    </section>`;
}

export function loadDashboardData() {
  if (isHR()) {
    applyHrLayout();
    renderHrAll();
    return;
  }
  const actor = actorInfo();
  const period = DemoStore.activePeriod();
  state.tickets = period ? DemoStore.listTickets(actor, period.id) : [];
  updateDashboardStats();
  renderFollow(actor);
  renderMentorProgress(actor, period);
  renderTodo(period, actor);
  displayAllTickets();
  renderPeriods();
}

// Cảnh báo SVTT sắp về: Phòng Nhân sự thấy tất cả, Trưởng bộ phận thấy bộ phận mình
export function renderFollow(actor) {
  const box = document.getElementById("followBox");
  if (!box) return;
  const rows = DemoStore.followUpFor(actor, DemoStore.todayIso());
  if (!rows.length) {
    box.classList.add("hidden");
    box.innerHTML = "";
    return;
  }
  const alerts = rows.filter(r => r.level === "alert");
  const items = rows.slice(0, 10).map(r => `
    <tr>
      <td>${escapeHtml(r.internName)}<br><small>${escapeHtml(r.internId)} · ${escapeHtml(r.department)}</small></td>
      <td>${escapeHtml(r.endDate.split("-").reverse().join("/"))}</td>
      <td>${r.leavingSoon ? "Sắp về" : ""}</td>
      <td class="${r.level === "alert" ? "ih-error" : ""}">${escapeHtml(r.message)}</td>
    </tr>`).join("");
  box.classList.remove("hidden");
  box.innerHTML = `
    <h2>Cảnh báo SVTT sắp về</h2>
    <p>Cảnh báo trước ${DemoStore.FOLLOW_UP_DAYS} ngày theo lịch (kể cả thứ 7, chủ nhật). <strong>${alerts.length}</strong> cần làm ngay.</p>
    <div class="table-wrap"><table>
      <thead><tr><th>SVTT</th><th>Ngày về</th><th></th><th>Cảnh báo</th></tr></thead>
      <tbody>${items}</tbody>
    </table></div>
    ${rows.length > 10 ? `<p>Hiển thị 10 trên tổng ${rows.length}.</p>` : ""}`;
}

// Lý do cụ thể khi người dùng chưa thấy SVTT/phiếu nào
export function todoHint(actor, period, todo) {
  if (actor.role !== "supervisor" && actor.role !== "mentor") return "";
  if (!DemoStore.departmentKnown(actor.department)) {
    return `Bộ phận của bạn (${actor.department || "chưa có"}) chưa có trong danh mục bộ phận. Liên hệ Admin để gán đúng bộ phận.`;
  }
  if (todo.length) return "";
  const total = DemoStore.listTickets(actor, period.id).length;
  if (total) return "";
  if (actor.role === "mentor") {
    return `Chưa có phiếu nào được giao cho bạn. Trưởng bộ phận ${actor.department} cần giao phiếu ở mục "Phân công đánh giá".`;
  }
  return `Chưa có SVTT nào thuộc bộ phận ${actor.department} trong kỳ này. Admin cần nhập SVTT và tạo phiếu cho kỳ.`;
}

// Trưởng bộ phận: tổng hợp tiến độ từng người hướng dẫn trong bộ phận
export function renderMentorProgress(actor, period) {
  const box = document.getElementById("mentorBox");
  if (!box) return;
  if (actor.role !== "supervisor" || !period) {
    box.classList.add("hidden");
    box.innerHTML = "";
    return;
  }

  const rows = DemoStore.mentorProgress(actor, period.id);
  box.classList.remove("hidden");
  const groups = [
    { label: "Chưa đánh giá", key: "todo", color: "#e05a4a" },
    { label: "Cần TBP duyệt", key: "review", color: "#8b5cf6" },
    { label: "Chờ Tổ CTSV", key: "committee", color: "#e0a526" },
    { label: "Đã chốt", key: "finalized", color: "#2d8c7f" }
  ];
  const sum = key => rows.reduce((n, r) => n + r[key], 0);
  const chips = groups.map(g => `<span class="mentor-chip"><i style="background:${g.color}"></i>${escapeHtml(g.label)}: <b>${sum(g.key)}</b></span>`).join("");
  const bar = r => {
    if (!r.total) return `<div class="mentor-bar"></div>`;
    const segs = groups.filter(g => r[g.key])
      .map(g => `<i style="flex-grow:${r[g.key]};background:${g.color}" title="${escapeHtml(g.label)}: ${r[g.key]}"></i>`).join("");
    return `<div class="mentor-bar" role="img" aria-label="Đã chốt ${r.finalized} trên ${r.total} phiếu">${segs}</div>`;
  };
  const body = rows.map(r => `
    <tr>
      <td data-label="Người đánh giá">${escapeHtml(r.name)}</td>
      <td class="r" data-label="Tổng">${r.total}</td>
      <td class="r" data-label="Chưa đánh giá"><span class="mentor-flag${r.todo ? "" : " mentor-flag--ok"}">${r.todo}</span></td>
      <td class="r" data-label="Cần TBP duyệt">${r.review}</td>
      <td class="r" data-label="Chờ Tổ CTSV">${r.committee}</td>
      <td class="r" data-label="Đã chốt">${r.finalized}</td>
      <td data-label="Tiến độ">${bar(r)}</td>
    </tr>`).join("");

  box.innerHTML = `
    <h2>Tiến độ đánh giá theo người hướng dẫn</h2>
    <p>Bộ phận <strong>${escapeHtml(actor.department || "—")}</strong> · ${sum("total")} phiếu. Chưa đánh giá là phiếu chưa gửi, đang thực hiện hoặc bị trả về.</p>
    <div class="mentor-chips">${chips}</div>
    ${rows.length ? `
    <div class="table-wrap">
      <table class="mentor-table table-cards">
        <thead>
          <tr>
            <th>Người đánh giá</th>
            <th class="r">Tổng</th>
            <th class="r">Chưa đánh giá</th>
            <th class="r">Cần TBP duyệt</th>
            <th class="r">Chờ Tổ CTSV</th>
            <th class="r">Đã chốt</th>
            <th>Tiến độ</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    </div>` : `<p>Chưa có phiếu nào trong kỳ này.</p>`}
    <p><button type="button" class="btn btn-secondary btn-sm" data-go-assign>Mở phân công đánh giá</button></p>`;
  box.querySelector("[data-go-assign]")?.addEventListener("click", () => switchView("assignments"));
}

// Việc cần làm theo vai trò (README mục 6, 7.2)
// Trạng thái mở rộng danh sách "Việc cần làm" (giữ qua các lần vẽ lại)
let todoExpanded = false;
const TODO_PREVIEW = 4;

export function renderTodo(period, actor) {
  const box = document.getElementById("todoBox");
  if (!box) return;

  if (!period) {
    box.innerHTML = `
      <h2>Việc cần làm</h2>
      <p>Chưa có kỳ đánh giá đang mở. Admin cần tạo kỳ và nhập danh sách sinh viên thực tập.</p>`;
    return;
  }

  const roleText = {
    supervisor: "Duyệt các phiếu người hướng dẫn gửi lên (gửi Tổ Công tác sinh viên) hoặc trả về người hướng dẫn. Phiếu chưa giao người hướng dẫn: giao ở mục Phân công đánh giá, hoặc tự đánh giá.",
    mentor: "Các phiếu được Trưởng bộ phận giao cho bạn: nhập 15 hạng mục, lưu nháp, rồi gửi phiếu. Phiếu bị trả về cần được bổ sung và gửi lại.",
    hr: "Phân công người hướng dẫn và Tổ Công tác sinh viên cho các phiếu. Theo dõi các phiếu đang chờ Tổ Công tác sinh viên chấm điểm.",
    committee: "Chấm điểm 15 hạng mục (điểm Tổ CTSV) cho các phiếu Phòng Nhân sự đã giao, rồi xác nhận chốt. Phiếu chưa đủ điểm sẽ không chốt được."
  }[actor.role] || "Tài khoản này chưa có việc cần làm trong kỳ này.";

  const todo = DemoStore.todoFor(actor, period.id);
  const hint = todoHint(actor, period, todo);
  const shown = todoExpanded ? todo : todo.slice(0, TODO_PREVIEW);
  const rows = shown.map(t => `
    <tr>
      <td data-label="Sinh viên">${escapeHtml(t.internName)}<br><small>${escapeHtml(t.internId)}</small>${t.evaluationNote ? `<br><small style="color:#9a3412;">${escapeHtml(t.evaluationNote)}</small>` : ""}</td>
      <td data-label="Trạng thái">${escapeHtml(STATUS_LABEL[t.status] || t.status)}</td>
      <td data-label="Hành động"><a class="btn btn-secondary btn-sm" href="./evaluation-form.html?id=${encodeURIComponent(t.id)}">Mở phiếu</a></td>
    </tr>`).join("");

  box.innerHTML = `
    <h2>Việc cần làm · ${escapeHtml(period.name)}</h2>
    <p>${escapeHtml(roleText)}</p>
    ${hint ? `<div class="message show" style="background:#fff7ed;color:#9a3412;">${escapeHtml(hint)}</div>` : ""}
    ${actor.role === "supervisor" ? `
    <p>Bộ phận <strong>${escapeHtml(actor.department || "—")}</strong>:
       <strong>${DemoStore.listTickets(actor, period.id).length}</strong> phiếu ·
       <strong>${DemoStore.mentorsOf(actor.department).length}</strong> người hướng dẫn ·
       <button type="button" class="btn btn-secondary btn-sm" data-go-assign>Mở phân công đánh giá</button></p>` : ""}
    <p><strong>${todo.length}</strong> phiếu cần xử lý.</p>
    ${todo.length ? `
    <div class="table-wrap">
      <table class="table-cards">
        <thead><tr><th>Sinh viên</th><th>Trạng thái</th><th>Hành động</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${todo.length > TODO_PREVIEW ? `
    <div class="more-row">
      <button type="button" class="btn btn-secondary btn-sm" data-todo-toggle>
        ${todoExpanded ? "Thu gọn" : `Xem thêm (${todo.length - TODO_PREVIEW})`}
      </button>
    </div>` : ""}` : ""}`;

  box.querySelector("[data-go-assign]")?.addEventListener("click", () => switchView("assignments"));
  if (!box.dataset.bound) {
    box.dataset.bound = "1";
    box.addEventListener("click", event => {
      if (!event.target.closest("[data-todo-toggle]")) return;
      todoExpanded = !todoExpanded;
      renderTodo(DemoStore.activePeriod(), actorInfo());
    });
  }
}

export function updateDashboardStats() {
  const s = DemoStore.stats(state.tickets);
  document.getElementById("statPending").textContent = s.pending;
  document.getElementById("statFinalized").textContent = s.finalized;
  document.getElementById("statTotal").textContent = s.total;
}

export function statCard(title, count, caption) {
  return `
    <article class="ih-stat">
      <span>${html(title)}</span>
      <strong>${Number(count) || 0}</strong>
      <small>${html(caption)}</small>
    </article>
  `;
}

export function renderOverview() {
  const pendingUsers = admin.users.filter(
    user => user.status === USER_STATUS.PENDING
  ).length;

  const activePeriods = admin.periods.filter(
    period => period.status === "Đang mở"
  ).length;

  const pendingTickets = admin.tickets.filter(
    ticket => ticket.status === "cho_to_cong_tac"
  ).length;

  const finalizedTickets = admin.tickets.filter(
    ticket => ticket.status === "da_chot"
  ).length;

  return `
    <section class="ih-section">
      <div class="ih-stats">
        ${statCard("Tài khoản", admin.users.length, "Tổng người dùng")}
        ${statCard("Chờ duyệt", pendingUsers, "Tài khoản cần xử lý")}
        ${statCard("Kỳ đang mở", activePeriods, "Kỳ đánh giá")}
        ${statCard("Chờ xác nhận", pendingTickets, "Phiếu gửi Phòng Nhân sự")}
        ${statCard("Đã chốt", finalizedTickets, "Phiếu hoàn tất")}
      </div>

      <section class="ih-panel">
        <h2>Việc cần theo dõi</h2>
        <button class="ih-link-row" data-tab="users">
          <span>${pendingUsers} tài khoản chờ duyệt</span><b>›</b>
        </button>
        <button class="ih-link-row" data-tab="periods">
          <span>${activePeriods} kỳ đang mở</span><b>›</b>
        </button>
        <div class="ih-link-row">
          <span>${pendingTickets} phiếu chờ Phòng Nhân sự xác nhận</span>
        </div>
      </section>
    </section>
  `;
}

export function renderUsers() {
  const selected =
    admin.mountNode.querySelector("[data-user-status-filter]")?.value || "all";

  const rows = admin.users.filter(user =>
    selected === "all" ||
    (user.status || USER_STATUS.PENDING) === selected
  );

  return `
    <section class="ih-section">
      <div class="ih-section__heading">
        <div>
          <h2>Tài khoản người dùng</h2>
          <p>Duyệt tài khoản và phân vai trò.</p>
        </div>

        <label>
          Trạng thái
          <select data-user-status-filter>
            ${[
              ["all", "Tất cả"],
              [USER_STATUS.PENDING, "Chờ duyệt"],
              [USER_STATUS.APPROVED, "Đã duyệt"],
              [USER_STATUS.REJECTED, "Từ chối"]
            ].map(([value, label]) => `
              <option value="${html(value)}"
                ${selected === value ? "selected" : ""}>
                ${html(label)}
              </option>
            `).join("")}
          </select>
        </label>
      </div>

      <div class="ih-table-wrap">
        <table class="ih-table">
          <thead>
            <tr>
              <th>Họ tên / Email</th>
              <th>Bộ phận</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length
              ? rows.map(userRow).join("")
              : `<tr><td colspan="6" class="ih-empty">
                   Không có tài khoản phù hợp.
                 </td></tr>`
            }
          </tbody>
        </table>
      </div>
    </section>
  `;
}

// Ô chọn bộ phận: chỉ liệt kê bộ phận có trong danh mục Admin đã tạo
export function deptSelectHtml(selectedCode, attrs, allowEmpty) {
  const options = admin.departments
    .map(d => `<option value="${html(d.code)}" ${selectedCode === d.code ? "selected" : ""}>${html(d.code)} — ${html(d.name)}</option>`)
    .join("");
  return `
    <select ${attrs}>
      <option value="">${allowEmpty ? "— Không thuộc bộ phận —" : "— Chọn bộ phận —"}</option>
      ${options}
    </select>`;
}

export function userRow(user) {
  const status = user.status || USER_STATUS.PENDING;
  const deleteButton = `
        <button type="button" class="ih-btn ih-btn--danger"
          data-action="delete-user" data-user-id="${html(user.id)}">Xóa tài khoản</button>`;
  const id = html(user.id);
  const member = DemoStore.getMember(user.id);
  const role = member?.role || user.role;
  const deptCode = member ? member.department : user.department;
  const noDepartments = admin.departments.length === 0
    ? `<small>Chưa có bộ phận nào. Hãy tạo ở tab "Bộ phận" trước.</small>`
    : "";

  let controls = "—";

  if (status === USER_STATUS.PENDING) {
    const roleOptions = Object.entries(ASSIGNABLE_ROLES)
      .map(([value, label]) => `<option value="${html(value)}">${html(label)}</option>`)
      .join("");
    controls = `
      <div class="ih-actions">
        <select aria-label="Vai trò cần gán" data-role-for="${id}">
          <option value="">Chọn vai trò</option>
          ${roleOptions}
        </select>
        <span data-dept-wrap-for="${id}">${deptSelectHtml("", `aria-label="Bộ phận" data-dept-for="${id}"`, true)}</span>
        <button type="button" class="ih-btn ih-btn--primary"
          data-action="approve" data-user-id="${id}">Duyệt</button>
        <button type="button" class="ih-btn ih-btn--danger"
          data-action="reject" data-user-id="${id}">Từ chối</button>
        ${deleteButton}
      </div>
      ${noDepartments}`;
  } else if (status === USER_STATUS.APPROVED && member) {
    const roleOptions = Object.entries(MEMBER_ROLES)
      .map(([value, label]) => `<option value="${html(value)}" ${role === value ? "selected" : ""}>${html(label)}</option>`)
      .join("");
    controls = `
      <div class="ih-actions">
        <select aria-label="Vai trò" data-member-role-for="${id}">${roleOptions}</select>
        <span data-dept-wrap-for="${id}" ${NO_DEPT_ROLES.includes(role) ? "hidden" : ""}>${deptSelectHtml(deptCode, `aria-label="Bộ phận" data-member-dept-for="${id}"`, true)}</span>
        <button type="button" class="ih-btn ih-btn--secondary"
          data-action="save-member" data-user-id="${id}">Lưu</button>
        ${deleteButton}
      </div>
      ${noDepartments}`;
  }

  return `
    <tr>
      <td>
        <strong>${html(user.fullName || "Chưa cập nhật")}</strong>
        <small>${html(user.email || "")}</small>
      </td>
      <td>${NO_DEPT_ROLES.includes(role) ? "—" : html(departmentLabel(deptCode))}</td>
      <td>${html(ROLE_LABELS[role] || "Chưa gán")}</td>
      <td>
        <span class="ih-status ih-status--${html(status)}">
          ${html(STATUS_LABELS[status] || status)}
        </span>
      </td>
      <td>${dateText(user.createdAt)}</td>
      <td>${controls}</td>
    </tr>
  `;
}

export function followBanner() {
  const alerts = DemoStore.followUp(DemoStore.todayIso()).filter(r => r.level === "alert");
  if (!alerts.length) return "";
  return `
    <div class="ih-error" style="margin-bottom:16px;">
      Có <strong>${alerts.length}</strong> SVTT cần tạo phiếu hoặc đã về chưa có phiếu.
      <button type="button" data-tab="followup">Xem theo dõi</button>
    </div>`;
}
