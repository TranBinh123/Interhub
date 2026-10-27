// ============================================
// Ticket Manager - Evaluation Form Operations
// ============================================

import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
  serverTimestamp,
  increment
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

import { COLLECTIONS, ROLES } from "./firebase-config.js";

const db = getFirestore();

// ============================================
// 15 Evaluation Criteria (Tiêu chí đánh giá)
// ============================================
export const EVALUATION_ITEMS = [
  // Part I: Attitude & Conduct (Thái độ & Hành động)
  { index: 0, part: 0, key: "I.1", label: "Tinh thần trách nhiệm" },
  { index: 1, part: 0, key: "I.2", label: "Tuân thủ quy định, nội quy" },
  { index: 2, part: 0, key: "I.3", label: "Tinh thần hợp tác, làm việc nhóm" },
  { index: 3, part: 0, key: "I.4", label: "Kỹ năng giao tiếp, ứng xử" },
  { index: 4, part: 0, key: "I.5", label: "Khả năng thích ứng với môi trường" },

  // Part II: Competency & Performance (Năng lực & Hiệu năng)
  { index: 5, part: 1, key: "II.1", label: "Tính chính xác, cẩn thận" },
  { index: 6, part: 1, key: "II.2", label: "Năng suất lao động" },
  { index: 7, part: 1, key: "II.3", label: "Chất lượng công việc" },
  { index: 8, part: 1, key: "II.4", label: "Kỹ năng kỹ thuật, chuyên môn" },
  { index: 9, part: 1, key: "II.5", label: "Khả năng tự chủ, độc lập" },

  // Part III: Development & Potential (Phát triển & Tiềm năng)
  { index: 10, part: 2, key: "III.1", label: "Nỗ lực phát triển bản thân" },
  { index: 11, part: 2, key: "III.2", label: "Học hỏi từ sai lầm" },
  { index: 12, part: 2, key: "III.3", label: "Sáng kiến, cải tiến công việc" },
  { index: 13, part: 2, key: "III.4", label: "Tác động lãnh đạo, ảnh hưởng" },
  { index: 14, part: 2, key: "III.5", label: "Tiềm năng phát triển" }
];

// ============================================
// Grading Scale (Thang điểm)
// ============================================
export const GRADES = {
  EXCELLENT: "Xuất sắc",
  GOOD: "Giỏi",
  ACCEPTABLE: "Khá",
  NOT_ACCEPTABLE: "Chưa đạt Khá"
};

// ============================================
// Calculate Scores
// ============================================
function calculatePartScore(scores, startIdx, endIdx) {
  const partScores = scores.slice(startIdx, endIdx + 1).filter(s => s !== null && s !== undefined);
  if (partScores.length === 0) return null;
  return parseFloat((partScores.reduce((a, b) => a + b, 0) / partScores.length).toFixed(2));
}

function calculateFinalScore(scores) {
  const scoreA = calculatePartScore(scores, 0, 4);  // I.1-I.5
  const scoreB = calculatePartScore(scores, 5, 9);  // II.1-II.5
  const scoreC = calculatePartScore(scores, 10, 14); // III.1-III.5

  if (!scoreA || !scoreB || !scoreC) return null;

  const finalRaw = (scoreA + scoreB + scoreC) / 3;
  const finalRounded = parseFloat(finalRaw.toFixed(2));

  return {
    A: scoreA,
    B: scoreB,
    C: scoreC,
    finalRaw: finalRaw,
    final: finalRounded,
    grade: getGrade(finalRounded)
  };
}

function getGrade(score) {
  if (score >= 3.5) return GRADES.EXCELLENT;
  if (score >= 3.0) return GRADES.GOOD;
  if (score >= 2.5) return GRADES.ACCEPTABLE;
  return GRADES.NOT_ACCEPTABLE;
}

// ============================================
// Create Ticket
// ============================================
export async function createTicket(data) {
  try {
    const ticketData = {
      internId: data.internId,
      internName: data.internName,
      periodId: data.periodId,
      evaluatorId: data.evaluatorId,
      department: data.department,
      position: data.position,
      status: "chua_bat_dau", // Not started
      scores: Array(15).fill(null),
      textPart4: "", // Part IV notes (Supervisor)
      textPart5: "", // Part V notes
      textCommittee: "", // Committee notes
      result: null,
      sendCount: 0,
      returned: false,
      returnReason: "",
      history: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.TICKETS), ticketData);
    console.log("Ticket created:", docRef.id);
    return { id: docRef.id, ...ticketData };
  } catch (error) {
    console.error("Error creating ticket:", error);
    throw error;
  }
}

// ============================================
// Get Tickets
// ============================================
export async function getTicketsByEvaluator(evaluatorId) {
  try {
    const q = query(
      collection(db, COLLECTIONS.TICKETS),
      where("evaluatorId", "==", evaluatorId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting tickets:", error);
    return [];
  }
}

export async function getTicketsByDepartment(department) {
  try {
    const q = query(
      collection(db, COLLECTIONS.TICKETS),
      where("department", "==", department)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting tickets:", error);
    return [];
  }
}

export async function getTicketsByPeriod(periodId) {
  try {
    const q = query(
      collection(db, COLLECTIONS.TICKETS),
      where("periodId", "==", periodId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting tickets:", error);
    return [];
  }
}

export async function getTicket(ticketId) {
  try {
    const docRef = doc(db, COLLECTIONS.TICKETS, ticketId);
    const snapshot = await doc(db, COLLECTIONS.TICKETS, ticketId);
    // Simple way to get a single document
    const q = query(
      collection(db, COLLECTIONS.TICKETS),
      where("__name__", "==", ticketId)
    );
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
  } catch (error) {
    console.error("Error getting ticket:", error);
    return null;
  }
}

// ============================================
// Update Scores
// ============================================
export async function updateTicketScores(ticketId, scores) {
  try {
    if (!Array.isArray(scores) || scores.length !== 15) {
      throw new Error("Scores must be array of 15 numbers");
    }

    const result = calculateFinalScore(scores);

    const ticketRef = doc(db, COLLECTIONS.TICKETS, ticketId);
    await updateDoc(ticketRef, {
      scores: scores,
      status: "dang_thuc_hien", // In progress
      updatedAt: serverTimestamp()
    });

    console.log("Scores updated:", ticketId);
    return result;
  } catch (error) {
    console.error("Error updating scores:", error);
    throw error;
  }
}

// ============================================
// Update Notes
// ============================================
export async function updateTicketNotes(ticketId, part, text) {
  try {
    const updateData = {};

    if (part === 4) {
      updateData.textPart4 = text;
    } else if (part === 5) {
      updateData.textPart5 = text;
    } else if (part === "committee") {
      updateData.textCommittee = text;
    }

    updateData.updatedAt = serverTimestamp();

    const ticketRef = doc(db, COLLECTIONS.TICKETS, ticketId);
    await updateDoc(ticketRef, updateData);

    console.log("Notes updated:", ticketId, "Part:", part);
    return true;
  } catch (error) {
    console.error("Error updating notes:", error);
    throw error;
  }
}

// ============================================
// Submit Ticket (for HR/Supervisor review)
// ============================================
export async function submitTicket(ticketId) {
  try {
    const ticketRef = doc(db, COLLECTIONS.TICKETS, ticketId);
    await updateDoc(ticketRef, {
      status: "cho_xac_nhan", // Pending confirmation
      sendCount: increment(1),
      updatedAt: serverTimestamp()
    });

    console.log("Ticket submitted:", ticketId);
    return true;
  } catch (error) {
    console.error("Error submitting ticket:", error);
    throw error;
  }
}

// ============================================
// Finalize Ticket (Chốt - by HR)
// ============================================
export async function finalizeTicket(ticketId) {
  try {
    const ticketRef = doc(db, COLLECTIONS.TICKETS, ticketId);
    await updateDoc(ticketRef, {
      status: "da_chot", // Finalized
      "result.finalizedAt": serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    console.log("Ticket finalized:", ticketId);
    return true;
  } catch (error) {
    console.error("Error finalizing ticket:", error);
    throw error;
  }
}

// ============================================
// Return Ticket (for revision)
// ============================================
export async function returnTicket(ticketId, reason) {
  try {
    const ticketRef = doc(db, COLLECTIONS.TICKETS, ticketId);
    await updateDoc(ticketRef, {
      status: "chua_bat_dau", // Reset to not started
      returned: true,
      returnReason: reason,
      updatedAt: serverTimestamp()
    });

    console.log("Ticket returned:", ticketId, "Reason:", reason);
    return true;
  } catch (error) {
    console.error("Error returning ticket:", error);
    throw error;
  }
}

// ============================================
// Delete Ticket (Admin/HR only)
// ============================================
export async function deleteTicket(ticketId) {
  try {
    const ticketRef = doc(db, COLLECTIONS.TICKETS, ticketId);
    await deleteDoc(ticketRef);

    console.log("Ticket deleted:", ticketId);
    return true;
  } catch (error) {
    console.error("Error deleting ticket:", error);
    throw error;
  }
}

// ============================================
// Get Ticket Statistics
// ============================================
export async function getTicketStats(filter = {}) {
  try {
    let queryRef = collection(db, COLLECTIONS.TICKETS);
    let conditions = [];

    if (filter.periodId) {
      conditions.push(where("periodId", "==", filter.periodId));
    }
    if (filter.evaluatorId) {
      conditions.push(where("evaluatorId", "==", filter.evaluatorId));
    }
    if (filter.department) {
      conditions.push(where("department", "==", filter.department));
    }

    const q = conditions.length > 0
      ? query(queryRef, ...conditions)
      : queryRef;

    const snapshot = await getDocs(q);
    const tickets = snapshot.docs.map(doc => doc.data());

    const stats = {
      total: tickets.length,
      draft: tickets.filter(t => t.status === "chua_bat_dau").length,
      inProgress: tickets.filter(t => t.status === "dang_thuc_hien").length,
      pending: tickets.filter(t => t.status === "cho_xac_nhan").length,
      finalized: tickets.filter(t => t.status === "da_chot").length,
      returned: tickets.filter(t => t.returned).length
    };

    return stats;
  } catch (error) {
    console.error("Error getting stats:", error);
    return null;
  }
}

// ============================================
// Helper: Format Date
// ============================================
export function formatDate(timestamp) {
  if (!timestamp) return "—";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString("vi-VN");
}

// ============================================
// Helper: Format Time
// ============================================
export function formatTime(timestamp) {
  if (!timestamp) return "—";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// ============================================
// Export Public API
// ============================================
export const TicketManager = {
  // Items
  items: EVALUATION_ITEMS,
  grades: GRADES,

  // Calculate
  calculatePartScore,
  calculateFinalScore,
  getGrade,

  // CRUD
  create: createTicket,
  get: getTicket,
  getByEvaluator: getTicketsByEvaluator,
  getByDepartment: getTicketsByDepartment,
  getByPeriod: getTicketsByPeriod,

  // Update
  updateScores: updateTicketScores,
  updateNotes: updateTicketNotes,
  submit: submitTicket,
  finalize: finalizeTicket,
  return: returnTicket,
  delete: deleteTicket,

  // Stats
  getStats: getTicketStats,

  // Format
  formatDate,
  formatTime
};
