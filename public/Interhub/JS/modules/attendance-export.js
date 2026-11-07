// ============================================
// modules/attendance-export.js
// Xuất báo cáo ngày công theo biểu mẫu BM 07 (.xlsx).
// Giữ nguyên định dạng của biểu mẫu gốc, chỉ điền tiêu đề, ngày, ký hiệu và số công.
// ============================================

import { DemoStore } from "../db.js";

const TEMPLATE_URL = "data/bm07-cham-cong.xlsx";
const JSZIP_URL = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
const NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const FIRST_DAY_COL = 3; // cột C
const DAY_COUNT = 31; // cột C..AG
const FIRST_DATA_ROW = 10; // dòng mẫu 10..12 trong biểu mẫu
const TEMPLATE_DATA_ROWS = 3;
const SIGNATURE_FIRST_ROW = 13; // dòng trống ngay sau khối dữ liệu mẫu
const TEMPLATE_LAST_ROW = 840;
const WEEKDAY = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

const pad = n => String(n).padStart(2, "0");
const isoOf = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

function addDaysIso(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return isoOf(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

function weekdayOf(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

// Kỳ "tháng M": từ ngày 26 tháng M-1 đến ngày 25 tháng M (khớp với kỳ đánh giá)
export function periodBounds(month) {
  const [y, m] = month.split("-").map(Number);
  const prevY = m === 1 ? y - 1 : y;
  const prevM = m === 1 ? 12 : m - 1;
  return { start: isoOf(prevY, prevM, 26), end: isoOf(y, m, 25), year: y, month: m, prevMonth: prevM };
}

// Nhóm công: 0 = 26→05 (cột AH), 1 = 06→15 (AI), 2 = 16→25 (AJ)
function segmentOf(iso) {
  const d = Number(iso.slice(8));
  if (d >= 6 && d <= 15) return 1;
  if (d >= 16 && d <= 25) return 2;
  return 0;
}

function colName(n) {
  let s = "";
  while (n > 0) {
    s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function colIndex(name) {
  let n = 0;
  for (const ch of name) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

function splitRef(ref) {
  const m = ref.match(/^([A-Z]+)(\d+)$/);
  return { col: m[1], row: Number(m[2]) };
}

// ----- Thao tác XML của sheet -----
function elements(parent) {
  return [...parent.childNodes].filter(n => n.nodeType === 1);
}

function setRowNumber(rowEl, n) {
  rowEl.setAttribute("r", String(n));
  elements(rowEl).forEach(c => c.setAttribute("r", splitRef(c.getAttribute("r")).col + n));
}

function findOrCreateCell(rowEl, col) {
  const rowNo = rowEl.getAttribute("r");
  const ref = col + rowNo;
  const cells = elements(rowEl);
  const found = cells.find(c => c.getAttribute("r") === ref);
  if (found) return found;
  const cell = rowEl.ownerDocument.createElementNS(NS, "c");
  cell.setAttribute("r", ref);
  const idx = colIndex(col);
  const after = cells.find(c => colIndex(splitRef(c.getAttribute("r")).col) > idx);
  rowEl.insertBefore(cell, after || null);
  return cell;
}

// value: số (ghi số), chuỗi (ghi chữ), null/"" (để trống). Xóa công thức cũ nếu có.
function writeCell(rowEl, col, value) {
  const cell = findOrCreateCell(rowEl, col);
  while (cell.firstChild) cell.removeChild(cell.firstChild);
  cell.removeAttribute("t");
  if (value === null || value === undefined || value === "") return;
  const doc = cell.ownerDocument;
  if (typeof value === "number") {
    const v = doc.createElementNS(NS, "v");
    v.textContent = String(value);
    cell.appendChild(v);
    return;
  }
  cell.setAttribute("t", "inlineStr");
  const is = doc.createElementNS(NS, "is");
  const t = doc.createElementNS(NS, "t");
  t.textContent = value;
  is.appendChild(t);
  cell.appendChild(is);
}

function shiftRef(ref, delta) {
  return ref.replace(/([A-Z]+)(\d+)/g, (_, col, row) => {
    const n = Number(row);
    return col + (n >= SIGNATURE_FIRST_ROW ? n + delta : n);
  });
}

function buildSheetXml(xml, { bounds, dates, rows }) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("Biểu mẫu BM 07 không đọc được");

  const sheetData = doc.getElementsByTagNameNS(NS, "sheetData")[0];
  const rowMap = new Map([...sheetData.getElementsByTagNameNS(NS, "row")].map(r => [Number(r.getAttribute("r")), r]));
  const row = n => rowMap.get(n);
  const proto = row(FIRST_DATA_ROW).cloneNode(true);
  const delta = rows.length - TEMPLATE_DATA_ROWS; // khối chữ ký dịch theo số SVTT

  // Tiêu đề theo kỳ
  writeCell(row(4), "A", `LỊCH THỰC TẬP CỦA SVTT - KỲ THÁNG ${pad(bounds.month)}/${bounds.year}`);
  writeCell(row(7), "C", `THÁNG ${pad(bounds.month)}.${bounds.year}`);
  writeCell(row(7), "AH", `Ngày thực tập từ 26/${pad(bounds.prevMonth)}-05/${pad(bounds.month)}`);
  writeCell(row(7), "AI", `Ngày thực tập từ 06/${pad(bounds.month)}-15/${pad(bounds.month)}`);
  writeCell(row(7), "AJ", `Ngày thực tập từ 16/${pad(bounds.month)}-25/${pad(bounds.month)}`);

  // Dòng ngày và thứ
  dates.forEach((iso, k) => {
    const col = colName(FIRST_DAY_COL + k);
    writeCell(row(8), col, iso ? Number(iso.slice(8)) : null);
    writeCell(row(9), col, iso ? WEEKDAY[weekdayOf(iso)] : null);
  });

  // Năm trong dòng ký ngày (khối chữ ký để trống)
  writeCell(row(14), "AF", `Đà Nẵng, ngày     tháng    năm ${bounds.year}`);

  // Dòng dữ liệu SVTT
  const dataRows = rows.map((item, i) => {
    const el = proto.cloneNode(true);
    setRowNumber(el, FIRST_DATA_ROW + i);
    writeCell(el, "A", i + 1);
    writeCell(el, "B", item.name);
    const codeByDate = new Map(item.days.map(d => [d.date, d.code]));
    const sums = [0, 0, 0];
    item.days.forEach(d => {
      if (d.code) sums[segmentOf(d.date)] += DemoStore.workDaysOf(d.code);
    });
    dates.forEach((iso, k) => {
      writeCell(el, colName(FIRST_DAY_COL + k), iso ? codeByDate.get(iso) || null : null);
    });
    writeCell(el, "AH", sums[0]);
    writeCell(el, "AI", sums[1]);
    writeCell(el, "AJ", sums[2]);
    writeCell(el, "AK", sums[0] + sums[1] + sums[2]);
    return el;
  });

  // Ghép lại: dòng tiêu đề (1-9), dòng dữ liệu, rồi khối còn lại (dịch theo số dòng)
  const rowNumbers = [...rowMap.keys()].sort((a, b) => a - b);
  while (sheetData.firstChild) sheetData.removeChild(sheetData.firstChild);
  rowNumbers.filter(n => n < FIRST_DATA_ROW).forEach(n => sheetData.appendChild(row(n)));
  dataRows.forEach(el => sheetData.appendChild(el));
  rowNumbers.filter(n => n >= SIGNATURE_FIRST_ROW).forEach(n => {
    const el = row(n);
    setRowNumber(el, n + delta);
    sheetData.appendChild(el);
  });

  doc.getElementsByTagNameNS(NS, "dimension")[0].setAttribute("ref", `A1:AK${TEMPLATE_LAST_ROW + delta}`);
  [...doc.getElementsByTagNameNS(NS, "mergeCell")].forEach(m => m.setAttribute("ref", shiftRef(m.getAttribute("ref"), delta)));

  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + new XMLSerializer().serializeToString(doc.documentElement);
}

// ----- Thư viện nén (tải khi cần) -----
let jszipPromise = null;
function loadJSZip() {
  if (window.JSZip) return Promise.resolve(window.JSZip);
  if (!jszipPromise) {
    jszipPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = JSZIP_URL;
      script.onload = () => resolve(window.JSZip);
      script.onerror = () => {
        jszipPromise = null;
        reject(new Error("Không tải được thư viện xuất file. Kiểm tra kết nối mạng rồi thử lại."));
      };
      document.head.appendChild(script);
    });
  }
  return jszipPromise;
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// rows: [{ name, days: DemoStore.attendanceDays(ticketId) }]
export async function exportAttendanceXlsx({ periodMonth, rows, filename }) {
  const bounds = periodBounds(periodMonth);
  const dates = [];
  for (let k = 0; k < DAY_COUNT; k++) {
    const d = addDaysIso(bounds.start, k);
    dates.push(d <= bounds.end ? d : null);
  }

  const response = await fetch(TEMPLATE_URL);
  if (!response.ok) throw new Error("Không tải được biểu mẫu BM 07.");
  const JSZip = await loadJSZip();
  const zip = await JSZip.loadAsync(await response.arrayBuffer());

  const xml = await zip.file("xl/worksheets/sheet1.xml").async("string");
  zip.file("xl/worksheets/sheet1.xml", buildSheetXml(xml, { bounds, dates, rows }));

  // Bỏ calcChain vì các ô công thức đã được thay bằng số liệu
  zip.remove("xl/calcChain.xml");
  const contentTypes = await zip.file("[Content_Types].xml").async("string");
  zip.file("[Content_Types].xml", contentTypes.replace(/<Override PartName="\/xl\/calcChain\.xml"[^>]*\/>/, ""));
  const rels = await zip.file("xl/_rels/workbook.xml.rels").async("string");
  zip.file("xl/_rels/workbook.xml.rels", rels.replace(/<Relationship [^>]*calcChain[^>]*\/>/, ""));

  const blob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  saveBlob(blob, filename);
}
