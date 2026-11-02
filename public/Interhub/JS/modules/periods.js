// ============================================
// modules/periods.js
// Kỳ đánh giá: danh sách ở app.html và quản lý kỳ ở admin.html.
// ============================================

import { DemoStore } from "../db.js";
import { fillTable } from "./evaluations.js";
import { admin } from "../state.js";
import { actorInfo, escapeHtml, html } from "../utils.js";

// Kỳ đánh giá: mọi vai trò đều xem được; số liệu theo phiếu mà người dùng được thấy
export function renderPeriods() {
  const actor = actorInfo();
  const periods = DemoStore.listPeriods();
  const hint = document.getElementById("periodsHint");
  if (hint) {
    hint.textContent = periods.length
      ? "Kỳ được tạo và đồng bộ phiếu bởi Phòng Nhân sự. Phiếu được tạo tự động theo ngày thực tập của SVTT."
      : "Chưa có kỳ đánh giá nào. Phòng Nhân sự sẽ tạo kỳ.";
  }

  const rows = periods.map(p => {
    const mine = DemoStore.listTickets(actor, p.id);
    const s = DemoStore.stats(mine);
    const open = p.status === "dang_mo";
    const badge = open
      ? `<span class="status-badge status-approved">Đang mở</span>`
      : `<span class="status-badge status-draft">Đã đóng</span>`;
    const progress = mine.length ? `${s.finalized}/${s.total}` : "—";
    return `
      <tr>
        <td>${escapeHtml(p.id)}</td>
        <td>${escapeHtml(p.name)}</td>
        <td>${badge}</td>
        <td>${mine.length}</td>
        <td>${progress}</td>
      </tr>`;
  });
  fillTable("periodsTable", rows, "Chưa có kỳ nào");
}

export function renderAdminPeriods() {
  return `
    <section class="ih-section">
      <div class="ih-section__heading">
        <div>
          <h2>Kỳ đánh giá</h2>
        </div>
      </div>

      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:16px;">
        <div class="ih-field" style="min-width:200px;">
          <label for="pMonth">Tháng</label>
          <input id="pMonth" class="ih-input" type="month" name="month" required>
        </div>
        <div class="ih-field" style="min-width:280px;flex:1;">
          <label for="pName">Tên kỳ (không bắt buộc)</label>
          <input id="pName" class="ih-input" type="text" name="name" placeholder="Ví dụ: Đánh giá tháng 11">
        </div>
        <button type="button" class="ih-btn ih-btn--primary" data-action="create-period">Tạo kỳ</button>
      </div>

      <div class="ih-table-wrap">
        <table class="ih-table">
          <thead>
            <tr>
              <th>Tên kỳ</th>
              <th>Trạng thái</th>
              <th>Tổng phiếu</th>
              <th>Chờ xác nhận</th>
              <th>Đã chốt</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            ${admin.periods.length
              ? admin.periods.map(period => {
                  const periodTickets = admin.tickets.filter(t => t.periodId === period.id);
                  const groups = DemoStore.classifyInterns(period.id);
                  const internCount = groups.eligible.length;
                  return `
                    <tr>
                      <td>
                        <strong>${html(period.name || period.id)}</strong>
                        <small>${html(period.id)}</small>
                      </td>
                      <td>${period.status === "dang_mo" ? "Đang mở" : html(period.status || "—")}</td>
                      <td>${periodTickets.length}</td>
                      <td>${periodTickets.filter(t => t.status === "cho_to_cong_tac").length}</td>
                      <td>${periodTickets.filter(t => t.status === "da_chot").length}</td>
                      <td>
                        <button type="button" class="ih-btn ih-btn--secondary"
                          data-action="generate-tickets"
                          data-period-id="${html(period.id)}">
                          Đồng bộ phiếu
                        </button>
                        <small>
                          ${internCount} SVTT thuộc kỳ · ${groups.early} kết thúc sớm · ${groups.startMid} bắt đầu giữa tháng<br>
                          ${groups.outside.length} ngoài tháng · ${groups.noDates.length} thiếu ngày
                        </small>
                      </td>
                    </tr>
                  `;
                }).join("")
              : `<tr><td colspan="6" class="ih-empty">
                   Chưa có kỳ đánh giá. Hãy tạo kỳ ở trên.
                 </td></tr>`
            }
          </tbody>
        </table>
      </div>
      ${DemoStore.listInterns().length ? "" : `<p class="ih-empty">Chưa có danh sách SVTT. Nhập ở tab "Sinh viên TT" trước khi tạo phiếu.</p>`}
    </section>
  `;
}
