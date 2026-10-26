// ============================================
// Database Module - Firestore Operations
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
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { COLLECTIONS } from "./firebase-config.js";

const db = getFirestore();

// ============================================
// TICKETS - Evaluation Forms
// ============================================

/**
 * Create evaluation ticket
 */
export async function createTicket(ticketData) {
  try {
    const data = {
      ...ticketData,
      status: "chua_bat_dau", // Draft status
      scores: Array(15).fill(null),
      sendCount: 0,
      returned: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.TICKETS), data);
    console.log("Ticket created:", docRef.id);
    return { id: docRef.id, ...data };
  } catch (error) {
    console.error("Error creating ticket:", error);
    throw error;
  }
}

/**
 * Get ticket by ID
 */
export async function getTicket(ticketId) {
  try {
    const docRef = doc(db, COLLECTIONS.TICKETS, ticketId);
    const docSnap = await getDocs(query(collection(db, COLLECTIONS.TICKETS), where("__name__", "==", ticketId)));

    if (docSnap.empty) return null;
    return { id: docSnap.docs[0].id, ...docSnap.docs[0].data() };
  } catch (error) {
    console.error("Error getting ticket:", error);
    return null;
  }
}

/**
 * Get tickets by evaluator
 */
export async function getTicketsByEvaluator(evaluatorId) {
  try {
    const q = query(
      collection(db, COLLECTIONS.TICKETS),
      where("evaluatorId", "==", evaluatorId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error getting tickets:", error);
    return [];
  }
}

/**
 * Get tickets by period
 */
export async function getTicketsByPeriod(periodId) {
  try {
    const q = query(
      collection(db, COLLECTIONS.TICKETS),
      where("periodId", "==", periodId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error getting tickets by period:", error);
    return [];
  }
}

/**
 * Get tickets by department
 */
export async function getTicketsByDepartment(departmentId) {
  try {
    const q = query(
      collection(db, COLLECTIONS.TICKETS),
      where("department", "==", departmentId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error getting tickets by department:", error);
    return [];
  }
}

/**
 * Update ticket scores
 */
export async function updateTicketScores(ticketId, scores) {
  try {
    if (!Array.isArray(scores) || scores.length !== 15) {
      throw new Error("Invalid scores: must be array of 15 numbers");
    }

    const ticketRef = doc(db, COLLECTIONS.TICKETS, ticketId);
    await updateDoc(ticketRef, {
      scores: scores,
      updatedAt: serverTimestamp()
    });

    console.log("Ticket scores updated:", ticketId);
    return true;
  } catch (error) {
    console.error("Error updating scores:", error);
    throw error;
  }
}

/**
 * Submit ticket
 */
export async function submitTicket(ticketId) {
  try {
    const ticketRef = doc(db, COLLECTIONS.TICKETS, ticketId);
    await updateDoc(ticketRef, {
      status: "cho_xac_nhan",
      sendCount: incrementCount(),
      updatedAt: serverTimestamp()
    });

    console.log("Ticket submitted:", ticketId);
    return true;
  } catch (error) {
    console.error("Error submitting ticket:", error);
    throw error;
  }
}

/**
 * Finalize ticket (Chốt)
 */
export async function finalizeTicket(ticketId, resultData) {
  try {
    const ticketRef = doc(db, COLLECTIONS.TICKETS, ticketId);
    await updateDoc(ticketRef, {
      status: "da_chot",
      result: {
        ...resultData,
        finalizedAt: serverTimestamp()
      },
      updatedAt: serverTimestamp()
    });

    console.log("Ticket finalized:", ticketId);
    return true;
  } catch (error) {
    console.error("Error finalizing ticket:", error);
    throw error;
  }
}

/**
 * Return ticket
 */
export async function returnTicket(ticketId, reason) {
  try {
    const ticketRef = doc(db, COLLECTIONS.TICKETS, ticketId);
    await updateDoc(ticketRef, {
      status: "chua_bat_dau",
      returned: true,
      returnReason: reason,
      updatedAt: serverTimestamp()
    });

    console.log("Ticket returned:", ticketId);
    return true;
  } catch (error) {
    console.error("Error returning ticket:", error);
    throw error;
  }
}

// ============================================
// PERIODS - Evaluation Cycles
// ============================================

/**
 * Create evaluation period
 */
export async function createPeriod(periodData) {
  try {
    const data = {
      ...periodData,
      status: "Nháp",
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.PERIODS), data);
    console.log("Period created:", docRef.id);
    return { id: docRef.id, ...data };
  } catch (error) {
    console.error("Error creating period:", error);
    throw error;
  }
}

/**
 * Get all periods
 */
export async function getAllPeriods() {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.PERIODS));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error getting periods:", error);
    return [];
  }
}

/**
 * Get active period
 */
export async function getActivePeriod() {
  try {
    const q = query(
      collection(db, COLLECTIONS.PERIODS),
      where("status", "==", "Đang mở")
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    return null;
  } catch (error) {
    console.error("Error getting active period:", error);
    return null;
  }
}

/**
 * Update period status
 */
export async function updatePeriodStatus(periodId, status) {
  try {
    const validStatuses = ["Nháp", "Đang mở", "Đang chốt", "Đã khóa"];
    if (!validStatuses.includes(status)) {
      throw new Error("Invalid status: " + status);
    }

    const periodRef = doc(db, COLLECTIONS.PERIODS, periodId);
    await updateDoc(periodRef, { status: status });

    console.log("Period status updated:", periodId, status);
    return true;
  } catch (error) {
    console.error("Error updating period status:", error);
    throw error;
  }
}

/**
 * Delete period
 */
export async function deletePeriod(periodId) {
  try {
    const periodRef = doc(db, COLLECTIONS.PERIODS, periodId);
    await deleteDoc(periodRef);

    console.log("Period deleted:", periodId);
    return true;
  } catch (error) {
    console.error("Error deleting period:", error);
    throw error;
  }
}

// ============================================
// DEPARTMENTS
// ============================================

/**
 * Get all departments
 */
export async function getAllDepartments() {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.DEPARTMENTS));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error getting departments:", error);
    return [];
  }
}

/**
 * Create department
 */
export async function createDepartment(deptData) {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.DEPARTMENTS), deptData);
    console.log("Department created:", docRef.id);
    return { id: docRef.id, ...deptData };
  } catch (error) {
    console.error("Error creating department:", error);
    throw error;
  }
}

/**
 * Update department
 */
export async function updateDepartment(deptId, deptData) {
  try {
    const deptRef = doc(db, COLLECTIONS.DEPARTMENTS, deptId);
    await updateDoc(deptRef, deptData);

    console.log("Department updated:", deptId);
    return true;
  } catch (error) {
    console.error("Error updating department:", error);
    throw error;
  }
}

// ============================================
// EVALUATION ITEMS (15 criteria)
// ============================================

/**
 * Get all evaluation items
 */
export async function getAllEvaluationItems() {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.ITEMS));
    const items = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    // Sort by index
    return items.sort((a, b) => a.index - b.index);
  } catch (error) {
    console.error("Error getting evaluation items:", error);
    return [];
  }
}

/**
 * Initialize evaluation items (call once)
 */
export async function initializeEvaluationItems() {
  const items = [
    { index: 0, part: 0, key: "I.1", label: "Tinh thần trách nhiệm", criteria: "..." },
    { index: 1, part: 0, key: "I.2", label: "Tuân thủ quy định", criteria: "..." },
    { index: 2, part: 0, key: "I.3", label: "Tinh thần hợp tác", criteria: "..." },
    { index: 3, part: 0, key: "I.4", label: "Kỹ năng giao tiếp", criteria: "..." },
    { index: 4, part: 0, key: "I.5", label: "Khả năng thích ứng", criteria: "..." },
    { index: 5, part: 1, key: "II.1", label: "Tính chính xác", criteria: "..." },
    { index: 6, part: 1, key: "II.2", label: "Năng suất", criteria: "..." },
    { index: 7, part: 1, key: "II.3", label: "Chất lượng công việc", criteria: "..." },
    { index: 8, part: 1, key: "II.4", label: "Kỹ năng kỹ thuật", criteria: "..." },
    { index: 9, part: 1, key: "II.5", label: "Khả năng tự chủ", criteria: "..." },
    { index: 10, part: 2, key: "III.1", label: "Nỗ lực phát triển", criteria: "..." },
    { index: 11, part: 2, key: "III.2", label: "Học hỏi từ sai lầm", criteria: "..." },
    { index: 12, part: 2, key: "III.3", label: "Sáng kiến", criteria: "..." },
    { index: 13, part: 2, key: "III.4", label: "Lãnh đạo/Ảnh hưởng", criteria: "..." },
    { index: 14, part: 2, key: "III.5", label: "Tiềm năng phát triển", criteria: "..." }
  ];

  try {
    for (const item of items) {
      await addDoc(collection(db, COLLECTIONS.ITEMS), item);
    }
    console.log("Evaluation items initialized");
    return true;
  } catch (error) {
    console.error("Error initializing items:", error);
    throw error;
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function incrementCount() {
  // For Firestore increment operation
  // In production, use FieldValue.increment(1)
  return null;
}

/**
 * Calculate ticket statistics
 */
export async function getTicketStats(periodId) {
  try {
    const tickets = await getTicketsByPeriod(periodId);

    const stats = {
      total: tickets.length,
      draft: tickets.filter(t => t.status === "chua_bat_dau").length,
      pending: tickets.filter(t => t.status === "dang_thuc_hien").length,
      review: tickets.filter(t => t.status === "cho_xac_nhan").length,
      finalized: tickets.filter(t => t.status === "da_chot").length
    };

    return stats;
  } catch (error) {
    console.error("Error getting ticket stats:", error);
    return null;
  }
}

/**
 * Export public API
 */
export const Database = {
  // Tickets
  createTicket,
  getTicket,
  getTicketsByEvaluator,
  getTicketsByPeriod,
  getTicketsByDepartment,
  updateTicketScores,
  submitTicket,
  finalizeTicket,
  returnTicket,

  // Periods
  createPeriod,
  getAllPeriods,
  getActivePeriod,
  updatePeriodStatus,
  deletePeriod,

  // Departments
  getAllDepartments,
  createDepartment,
  updateDepartment,

  // Items
  getAllEvaluationItems,
  initializeEvaluationItems,

  // Stats
  getTicketStats
};
