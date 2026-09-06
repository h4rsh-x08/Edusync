// ============================================================
// EduSync — Dashboard
// Firebase data expected under Student/{userKey}/:
//   name, rollNo, course, photoURL, password
//   timetable/{monday..sunday}: [{ start:"09:00", end:"09:50", subject, room, faculty }]
//   assignments/{id}: { title, subject, dueDate, priority, status: "pending"|"completed" }
//   exams/{id}:       { title, subject, dueDate, priority }
//   alerts/{id}:      { message, type: "urgent"|"warning"|"info", timestamp }
//   notes/{id}:       { text, timestamp }
// ============================================================

import {
  requireSession,
  studentPath,
  onValue,
  push,
  set,
  remove,
  normalizePriority,
  priorityFromDate,
  dueLabel,
  formatTime,
  toArray
} from "./common/firebase-config.js";
import { renderSidebar, updateSidebarProfile } from "./common/sidebar.js";

renderSidebar("dashboard");

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

document.getElementById("today-date").textContent = new Date().toLocaleDateString(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric"
});

requireSession((data, userKey) => {
  updateSidebarProfile(data);
  greet(data.name);
  watchTimetable(userKey);
  watchAssignmentsAndExams(userKey);
  watchAlerts(userKey);
  watchNotes(userKey);
});

function greet(name) {
  const hour = new Date().getHours();
  const time = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  document.getElementById("greeting").textContent = `${time}${name ? ", " + name.split(" ")[0] : ""}`;
}

// ------------------------------------------------------------
// Today's timetable → current class, next class, schedule strip
// ------------------------------------------------------------
function watchTimetable(userKey) {
  const today = DAY_NAMES[new Date().getDay()];
  const timetableRef = studentPath(userKey, "timetable", today);

  onValue(timetableRef, (snapshot) => {
    const raw = snapshot.val();
    const classes = Array.isArray(raw) ? raw.filter(Boolean) : toArray(raw);
    classes.sort((a, b) => toMinutes(a.start) - toMinutes(b.start));

    renderNowNext(classes);
    renderScheduleStrip(classes);
  });
}

function toMinutes(hhmm) {
  if (!hhmm) return -1;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

function renderNowNext(classes) {
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const current = classes.find((c) => toMinutes(c.start) <= nowMin && nowMin < toMinutes(c.end));
  const upcoming = classes
    .filter((c) => toMinutes(c.start) > nowMin)
    .sort((a, b) => toMinutes(a.start) - toMinutes(b.start))[0];

  const nowBlock = document.getElementById("now-block");
  const nextBlock = document.getElementById("next-block");

  nowBlock.innerHTML = current
    ? classBlockHtml(current, true)
    : `<p class="hero-empty">No class in session right now</p>`;

  nextBlock.innerHTML = upcoming
    ? classBlockHtml(upcoming, false)
    : `<p class="hero-empty">Nothing else scheduled today</p>`;
}

function classBlockHtml(cls, isCurrent) {
  return `
    <div class="hero-subject">${escapeHtml(cls.subject || "Untitled class")}</div>
    <div class="hero-meta">
      <span>${formatTime(cls.start)}${cls.end ? " – " + formatTime(cls.end) : ""}</span>
      ${cls.room ? `<span>Room ${escapeHtml(cls.room)}</span>` : ""}
      ${cls.faculty ? `<span>${escapeHtml(cls.faculty)}</span>` : ""}
    </div>
  `;
}

function renderScheduleStrip(classes) {
  const el = document.getElementById("schedule-strip");
  if (!classes.length) {
    el.innerHTML = `<p class="empty-state"><strong>Nothing on the timetable</strong>No classes have been added for today yet.</p>`;
    return;
  }
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  el.innerHTML = classes
    .map((c) => {
      const isCurrent = toMinutes(c.start) <= nowMin && nowMin < toMinutes(c.end);
      return `
        <div class="schedule-item ${isCurrent ? "is-current" : ""}">
          <div class="time">${formatTime(c.start)}</div>
          <div class="subject">${escapeHtml(c.subject || "Untitled")}</div>
          <div class="room">${escapeHtml(c.room || "")}</div>
        </div>`;
    })
    .join("");
}

// ------------------------------------------------------------
// Deadlines (assignments + exams merged) + completed progress
// ------------------------------------------------------------
function watchAssignmentsAndExams(userKey) {
  let assignments = [];
  let exams = [];

  onValue(studentPath(userKey, "assignments"), (snap) => {
    assignments = toArray(snap.val()).map((a) => ({ ...a, kind: "Assignment" }));
    renderDeadlines(assignments, exams);
    renderProgress(assignments);
  });

  onValue(studentPath(userKey, "exams"), (snap) => {
    exams = toArray(snap.val()).map((e) => ({ ...e, kind: "Exam" }));
    renderDeadlines(assignments, exams);
  });
}

function renderDeadlines(assignments, exams) {
  const list = document.getElementById("deadline-list");
  const merged = [...assignments, ...exams]
    .filter((item) => item.status !== "completed")
    .sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0))
    .slice(0, 6);

  if (!merged.length) {
    list.innerHTML = `<li class="empty-state"><strong>All clear</strong>No upcoming assignments or exams on record.</li>`;
    return;
  }

  list.innerHTML = merged
    .map((item) => {
      const priority = normalizePriority(item.priority || priorityFromDate(item.dueDate));
      return `
        <li class="deadline-row">
          <span class="priority-dot ${priority}"></span>
          <div class="deadline-info">
            <div class="title">${escapeHtml(item.title || "Untitled")}</div>
            <div class="subject">${escapeHtml(item.kind)}${item.subject ? " · " + escapeHtml(item.subject) : ""}</div>
          </div>
          <span class="pill ${priority}">${dueLabel(item.dueDate)}</span>
        </li>`;
    })
    .join("");
}

function renderProgress(assignments) {
  const total = assignments.length;
  const done = assignments.filter((a) => a.status === "completed").length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  document.getElementById("progress-fill").style.width = pct + "%";
  document.getElementById("progress-label").textContent = `${done} of ${total}`;
}

// ------------------------------------------------------------
// Alerts
// ------------------------------------------------------------
function watchAlerts(userKey) {
  onValue(studentPath(userKey, "alerts"), (snap) => {
    const alerts = toArray(snap.val()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    const list = document.getElementById("alert-list");
    const countEl = document.getElementById("alert-count");

    if (!alerts.length) {
      list.innerHTML = `<li class="empty-state"><strong>No alerts</strong>Important messages will show up here.</li>`;
      countEl.hidden = true;
      return;
    }

    countEl.hidden = false;
    countEl.textContent = alerts.length;

    list.innerHTML = alerts
      .map(
        (a) => `
        <li class="alert-row ${a.type || "info"}">
          <span class="msg">${escapeHtml(a.message || "")}</span>
          <span class="when">${a.timestamp ? timeAgo(a.timestamp) : ""}</span>
        </li>`
      )
      .join("");
  });
}

function timeAgo(timestamp) {
  
  if (timestamp < 100000000000) {
    timestamp *= 1000;
  }

  const diff = Date.now() - timestamp;

  // Future timestamp
  if (diff < 0) return "just now";

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(days / 365);
  return `${years}y ago`;
}
// ------------------------------------------------------------
// Quick notes
// ------------------------------------------------------------
function watchNotes(userKey) {
  const notesRef = studentPath(userKey, "notes");

  onValue(notesRef, (snap) => {
    const notes = toArray(snap.val()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    const list = document.getElementById("note-list");

    if (!notes.length) {
      list.innerHTML = `<li class="empty-state"><strong>No notes yet</strong>Quick notes you add will stay pinned here.</li>`;
      return;
    }

    list.innerHTML = notes
      .map(
        (n) => `
        <li class="note-row" data-id="${n.id}">
          <span class="text">${escapeHtml(n.text || "")}</span>
          <button type="button" class="delete-note" data-id="${n.id}" aria-label="Delete note">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          </button>
        </li>`
      )
      .join("");

    list.querySelectorAll(".delete-note").forEach((btn) => {
      btn.addEventListener("click", () => remove(studentPath(userKey, "notes", btn.dataset.id)));
    });
  });

  document.getElementById("note-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("note-input");
    const text = input.value.trim();
    if (!text) return;
    push(notesRef, { text, timestamp: Date.now() });
    input.value = "";
  });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
}
