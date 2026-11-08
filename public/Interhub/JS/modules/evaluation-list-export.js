// ============================================
// modules/evaluation-list-export.js
// Xuất danh sách đánh giá SVTT theo biểu mẫu (.xlsx), giữ nguyên định dạng và công thức của mẫu.
// Dữ liệu: phiếu đã chốt. Điểm và số ngày đi làm được điền trực tiếp; công thức của mẫu được bọc để trống khi không có ngày đi làm.
// ============================================

import { DemoStore, STATUS } from "../db.js";
import {
  colName, colIndex, elements, findOrCreateCell, loadJSZip, pad, periodBounds, saveBlob,
  segmentOf, setRowNumber, splitRef, writeCell
} from "./attendance-export.js";

const TEMPLATE_URL = "data/bm03-danh-sach-danh-gia.xlsx";
const NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const FIRST_DATA_ROW = 6; // dòng mẫu 6–7
const TEMPLATE_DATA_ROWS = 2;
const SUMMARY_FIRST_ROW = 8; // dòng "TỔNG HỢP" trở xuống được dịch theo số SVTT
const TEMPLATE_LAST_ROW = 33;

// Xếp loại như công thức trong mẫu (TB = Trung bình)
export function ratingOfMonthly(y) {
  if (y >= 9.5) return "Xuất sắc 1";
  if (y >= 9) return "Xuất sắc 2";
  if (y >= 8) return "Giỏi";
  if (y >= 7) return "Khá";
  if (y >= 5) return "TB";
  return "Kém";
}

function shiftRowRef(ref, delta) {
  return ref.replace(/([A-Z]+)(\d+)/g, (_, col, row) => {
    const n = Number(row);
    return col + (n >= SUMMARY_FIRST_ROW ? n + delta : n);
  });
}

function writeFormula(rowEl, col, formula, cached) {
  const cell = findOrCreateCell(rowEl, col);
  while (cell.firstChild) cell.removeChild(cell.firstChild);
  cell.removeAttribute("t");
  const doc = cell.ownerDocument;
  const f = doc.createElementNS(NS, "f");
  f.textContent = formula;
  cell.appendChild(f);
  const v = doc.createElementNS(NS, "v");
  if (typeof cached === "number") v.textContent = String(cached);
  else {
    cell.setAttribute("t", "str");
    v.textContent = String(cached ?? "");
  }
  cell.appendChild(v);
}

// Số liệu một SVTT: điểm 3 phần (lặp lại cho cả 3 khối tuần), số ngày đi làm theo 3 nhóm, điểm Tổ CTSV
function rowData(ticket) {
  const { parts } = DemoStore.scoreSummary(ticket);
  const [p1, p2, p3] = parts.map(v => (typeof v === "number" ? v : 0));
  const blocks = [0, 0, 0];
  DemoStore.attendanceDays(ticket.id).forEach(d => {
    if (d.code) blocks[segmentOf(d.date)] += DemoStore.workDaysOf(d.code);
  });
  const [H, M, R] = blocks;
  const G = p1 + p2 + p3;
  const S = R + M + H > 0 ? (G * H + G * M + G * R) / (R + M + H) : "";
  const T = ticket.committeeParts ? ticket.committeeParts[0] : 0;
  const U = ticket.committeeParts ? ticket.committeeParts[1] : 0;
  const V = T + U;
  const W = S === "" ? "" : S + V;
  const X = H + M + R;
  const Y = W === "" ? "" : W / 4;
  const Z = Y === "" ? "" : ratingOfMonthly(Y);
  return { p: [p1, p2, p3], H, M, R, G, S, T, U, V, W, X, Y, Z };
}

function buildSheetXml(xml, { month, year, prevMonth, prevYear, deptLabel, tickets }) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("Biểu mẫu danh sách đánh giá không đọc được");

  const sheetData = doc.getElementsByTagNameNS(NS, "sheetData")[0];
  const rowMap = new Map([...sheetData.getElementsByTagNameNS(NS, "row")].map(r => [Number(r.getAttribute("r")), r]));
  const row = n => rowMap.get(n);
  const proto = row(FIRST_DATA_ROW).cloneNode(true);
  const rowsData = tickets.map(rowData);
  const N = tickets.length;
  const L = FIRST_DATA_ROW + N - 1; // dòng cuối của danh sách
  const delta = N - TEMPLATE_DATA_ROWS;

  // Tiêu đề và khoảng ngày (theo kỳ đã chọn)
  writeCell(row(1), "A", `PHIẾU ĐÁNH GIÁ CHẤT LƯỢNG SVTT\nTHÁNG ${pad(month)} NĂM ${year}`);
  writeCell(row(2), "A", `Bộ phận thực tập: ${deptLabel}`);
  const d = (day, mo, yr) => `${pad(day)}/${pad(mo)}/${yr}`;
  writeCell(row(4), "D", `Đánh giá của Bộ phận tiếp nhận SV\nTừ ngày ${d(26, prevMonth, prevYear)}  Đến ngày ${d(5, month, year)}`);
  writeCell(row(4), "I", `Đánh giá của Bộ phận tiếp nhận SV\nTừ ngày ${d(6, month, year)}  Đến ngày ${d(15, month, year)}`);
  writeCell(row(4), "N", `Đánh giá của Bộ phận tiếp nhận SV\nTừ ngày ${d(16, month, year)}  Đến ngày ${d(25, month, year)}`);
  writeCell(row(16), "S", `Đà Nẵng, ngày     tháng    năm ${year}`);

  // Dòng SVTT
  const dataRows = tickets.map((t, i) => {
    const r = rowsData[i];
    const el = proto.cloneNode(true);
    setRowNumber(el, FIRST_DATA_ROW + i);
    const n = FIRST_DATA_ROW + i;
    writeCell(el, "A", i + 1);
    writeCell(el, "B", t.internId);
    writeCell(el, "C", t.internName);
    // Khối tuần 1 (D–H), tuần 2 (I–M), tuần 3 (N–R): điểm 3 phần giống nhau, số ngày theo nhóm
    [["D", "E", "F", "G", "H", 0], ["I", "J", "K", "L", "M", 1], ["N", "O", "P", "Q", "R", 2]].forEach(([c1, c2, c3, cSum, cDays, idx]) => {
      writeCell(el, c1, r.p[0]);
      writeCell(el, c2, r.p[1]);
      writeCell(el, c3, r.p[2]);
      writeFormula(el, cSum, `SUM(${c1}${n}:${c3}${n})`, r.G);
      writeCell(el, cDays, [r.H, r.M, r.R][idx]);
    });
    writeFormula(el, "S", `IFERROR((G${n}*H${n}+L${n}*M${n}+Q${n}*R${n})/(R${n}+M${n}+H${n}),"")`, r.S);
    writeCell(el, "T", r.T);
    writeCell(el, "U", r.U);
    writeFormula(el, "V", `SUM(T${n}:U${n})`, r.V);
    writeFormula(el, "W", `IF(S${n}="","",S${n}+V${n})`, r.W);
    writeFormula(el, "X", `H${n}+M${n}+R${n}`, r.X);
    writeFormula(el, "Y", `IF(W${n}="","",W${n}/4)`, r.Y);
    writeFormula(el, "Z", `IF(Y${n}="","",IF(Y${n}>=9.5,"Xuất sắc 1",IF(Y${n}>=9,"Xuất sắc 2",IF(Y${n}>=8,"Giỏi",IF(Y${n}>=7,"Khá",IF(Y${n}>=5,"TB","Kém"))))))`, r.Z);
    writeCell(el, "AA", t.strengths || "");
    writeCell(el, "AB", t.improvements || "");
    return el;
  });

  // Bảng tổng hợp: viết lại công thức theo số dòng thực tế (ghi trước khi dịch dòng)
  const sumRow = r => r + delta;
  const counts = ["Xuất sắc 1", "Xuất sắc 2", "Giỏi", "Khá", "TB", "Kém"];
  const tally = counts.map(label => rowsData.filter(r => r.Z === label).length);
  writeFormula(row(9), "V", `SUM(V${sumRow(10)}:W${sumRow(15)})`, 1);
  writeFormula(row(9), "X", `SUM(X${sumRow(10)}:Y${sumRow(15)})`, 1);
  writeFormula(row(9), "Z", `COUNT(A${FIRST_DATA_ROW}:A${L})`, N);
  counts.forEach((label, i) => {
    const r0 = 10 + i;
    writeFormula(row(r0), "X", `Z${sumRow(r0)}/$Z$${sumRow(9)}`, N ? tally[i] / N : 0);
    writeFormula(row(r0), "Z", `COUNTIF($Z$${FIRST_DATA_ROW}:$Z$${L},"${label}")`, tally[i]);
  });

  // Ghép lại: dòng 1–5, dòng SVTT, rồi khối tổng hợp (dịch theo delta)
  const keys = [...rowMap.keys()].sort((a, b) => a - b);
  while (sheetData.firstChild) sheetData.removeChild(sheetData.firstChild);
  keys.filter(n => n < FIRST_DATA_ROW).forEach(n => sheetData.appendChild(row(n)));
  dataRows.forEach(el => sheetData.appendChild(el));
  keys.filter(n => n >= SUMMARY_FIRST_ROW).forEach(n => {
    const el = row(n);
    setRowNumber(el, n + delta);
    sheetData.appendChild(el);
  });

  doc.getElementsByTagNameNS(NS, "dimension")[0].setAttribute("ref", `A1:AB${TEMPLATE_LAST_ROW + delta}`);
  [...doc.getElementsByTagNameNS(NS, "mergeCell")].forEach(m => m.setAttribute("ref", shiftRowRef(m.getAttribute("ref"), delta)));

  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + new XMLSerializer().serializeToString(doc.documentElement);
}

// tickets: phiếu đã chốt đã được lọc theo bộ phận và trường
export async function exportEvaluationList({ periodMonth, tickets, deptLabel, filename }) {
  const [year, month] = periodMonth.split("-").map(Number);
  const bounds = periodBounds(periodMonth);
  const response = await fetch(TEMPLATE_URL);
  if (!response.ok) throw new Error("Không tải được biểu mẫu danh sách đánh giá.");
  const JSZip = await loadJSZip();
  const zip = await JSZip.loadAsync(await response.arrayBuffer());

  const xml = await zip.file("xl/worksheets/sheet1.xml").async("string");
  zip.file("xl/worksheets/sheet1.xml", buildSheetXml(xml, {
    month, year, prevMonth: bounds.prevMonth, prevYear: month === 1 ? year - 1 : year, deptLabel, tickets
  }));

  // Bỏ calcChain và yêu cầu Excel tính lại công thức khi mở
  zip.remove("xl/calcChain.xml");
  const contentTypes = await zip.file("[Content_Types].xml").async("string");
  zip.file("[Content_Types].xml", contentTypes.replace(/<Override PartName="\/xl\/calcChain\.xml"[^>]*\/>/, ""));
  const rels = await zip.file("xl/_rels/workbook.xml.rels").async("string");
  zip.file("xl/_rels/workbook.xml.rels", rels.replace(/<Relationship [^>]*calcChain[^>]*\/>/, ""));
  const workbook = await zip.file("xl/workbook.xml").async("string");
  zip.file("xl/workbook.xml", workbook.replace(/<calcPr ([^>]*?)\/>/, (m, attrs) => (attrs.includes("fullCalcOnLoad") ? m : `<calcPr ${attrs} fullCalcOnLoad="1"/>`)));

  const blob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  saveBlob(blob, filename);
}
