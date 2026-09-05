// ============================================================
// EduSync — shared Firebase config + data helpers
// Imported by every section's JS file (dashboard, calendar, todo, profile)
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  push,
  set,
  update,
  remove,
  get,
  child
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";

const firebaseConfig = {
  databaseURL: "https://edusync-c93a0-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);

// Root reference — every student's data lives under Student/{userKey}
export const rootRef = ref(database, "Student");

// ------------------------------------------------------------
// Session
// ------------------------------------------------------------
// The login page stores two values once credentials check out:
//   localStorage.setItem("currentId", <email or roll number>)
//   localStorage.setItem("currentUserPass", <password entered at login>)
//
// Storage reads check localStorage first, then sessionStorage, so
// "remember me" can be honored by the login page without every other
// page needing to care which one was used.

function readStorage(key) {
  return localStorage.getItem(key) || sessionStorage.getItem(key) || "";
}

function clearSession() {
  localStorage.removeItem("currentId");
  localStorage.removeItem("currentUserPass");
  sessionStorage.removeItem("currentId");
  sessionStorage.removeItem("currentUserPass");
}

export function sanitizeKey(idString) {
  if (!idString) return "";
  return idString.trim().toLowerCase().replace(/[.#$/[\]]/g, "_");
}

export function getCurrentId() {
  return readStorage("currentId");
}

/**
 * Confirms there is a logged-in user and that a matching record still
 * exists in Firebase. Redirects to the login page if either check fails.
 * Call this once at the top of every section's JS entry point.
 *
 * Important: this does NOT assume the database key equals the sanitized
 * identifier. It looks the student up the same way the login page does —
 * by scanning every record under "Student" for a matching email or roll
 * number — so it works regardless of how the database keys are actually
 * named (auto-generated push IDs, roll numbers, anything). The real key
 * it finds is what gets passed to onData() and used for every read/write
 * afterwards.
 *
 * Pass a callback to receive the live student data + real database key
 * once it loads, and keep receiving it on every change (stays subscribed).
 */
export function requireSession(onData) {
  const currentId = getCurrentId();
  const storedPass = readStorage("currentUserPass");

  if (!currentId || !storedPass) {
    window.location.href = "login.html";
    return;
  }

  onValue(
    rootRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        clearSession();
        window.location.href = "login.html";
        return;
      }

      const students = snapshot.val();
      const match = Object.entries(students).find(
        ([, student]) =>
          (currentId === student.email || currentId === student.rollNo) &&
          storedPass === student.password
      );

      if (!match) {
        clearSession();
        window.location.href = "login.html";
        return;
      }

      const [userKey, data] = match;
      onData(data, userKey);
    },
    (error) => {
      console.error("EduSync: failed to read student records", error);
    }
  );
}


// ------------------------------------------------------------
// Path helpers — every section reads/writes through these so the
// data shape stays consistent across dashboard / calendar / todo / profile.
// ------------------------------------------------------------
export function studentPath(userKey, ...segments) {
  return ref(database, ["Student", userKey, ...segments].join("/"));
}

export { onValue, push, set, update, remove, get, child, ref };

// ------------------------------------------------------------
// Formatting + priority helpers shared by every section
// ------------------------------------------------------------

export const PRIORITY = {
  high: { label: "High priority", color: "var(--coral)", tint: "var(--coral-tint)" },
  medium: { label: "Medium priority", color: "var(--amber)", tint: "var(--amber-tint)" },
  low: { label: "Low priority", color: "var(--sage)", tint: "var(--sage-tint)" }
};

/** Normalizes any stored priority value down to high/medium/low. */
export function normalizePriority(priority) {
  const p = (priority || "").toString().toLowerCase();
  if (p.startsWith("h")) return "high";
  if (p.startsWith("m")) return "medium";
  if (p.startsWith("l")) return "low";
  return "medium";
}

/** Given a due date, decides an urgency color when no explicit priority is set. */
export function priorityFromDate(dateString) {
  if (!dateString) return "medium";
  const due = new Date(dateString);
  const now = new Date();
  const days = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  if (days <= 2) return "high";
  if (days <= 6) return "medium";
  return "low";
}

export function formatDate(dateString) {
  if (!dateString) return "No date set";
  const d = new Date(dateString);
  if (isNaN(d)) return dateString;
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function formatTime(timeString) {
  if (!timeString) return "";
  // Accepts "HH:MM" 24hr strings and renders them as "h:MM AM/PM"
  const [h, m] = timeString.split(":").map(Number);
  if (isNaN(h)) return timeString;
  const d = new Date();
  d.setHours(h, m || 0, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function daysUntil(dateString) {
  if (!dateString) return null;
  const due = new Date(dateString);
  const now = new Date();
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((due - now) / (1000 * 60 * 60 * 24));
}

export function dueLabel(dateString) {
  const days = daysUntil(dateString);
  if (days === null) return "No deadline";
  if (days < 0) return `Overdue by ${Math.abs(days)}d`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days}d`;
}

/** Turns an object keyed by push-id into an array of {id, ...value} */
export function toArray(obj) {
  if (!obj) return [];
  return Object.entries(obj).map(([id, value]) => ({ id, ...value }));
}
