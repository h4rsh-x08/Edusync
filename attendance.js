// ============================================================
// EduSync — Attendance tracker
// Firebase data under Student/{userKey}/attendanceCourses/{id}:
//   courseName, totalClasses, attendedClasses
// Minimum required attendance is fixed at 75%. All the math below
// (how many classes can be missed / must be attended) is derived
// from totalClasses + attendedClasses — nothing else is stored.
// ============================================================

import {
  requireSession,
  studentPath,
  onValue,
  push,
  update,
  remove,
  toArray
} from "./common/firebase-config.js";
import { renderSidebar, updateSidebarProfile } from "./common/sidebar.js";

renderSidebar("attendance");

const THRESHOLD = 0.75;
const RING_CIRCUMFERENCE = 2 * Math.PI * 50;

let allCourses = [];
let coursesRef = null;
let activeUserKey = null;

requireSession((data, userKey) => {
  updateSidebarProfile(data);
  activeUserKey = userKey;
  coursesRef = studentPath(userKey, "attendanceCourses");

  onValue(coursesRef, (snapshot) => {
    allCourses = toArray(snapshot.val()).map((c) => ({
      ...c,
      totalClasses: Math.max(0, Number(c.totalClasses) || 0),
      attendedClasses: Math.max(0, Number(c.attendedClasses) || 0)
    })).map((c) => ({
      ...c,
      attendedClasses: Math.min(c.attendedClasses, c.totalClasses)
    }));
    render();
  });

  document.getElementById("course-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const courseName = document.getElementById("course-name").value.trim();
    const totalClasses = Math.max(0, Number(document.getElementById("course-total").value) || 0);
    const attendedRaw = Math.max(0, Number(document.getElementById("course-attended").value) || 0);
    if (!courseName) return;

    push(coursesRef, {
      courseName,
      totalClasses,
      attendedClasses: Math.min(attendedRaw, totalClasses)
    });
    e.target.reset();
  });
});

function computeStats(course) {
  const { totalClasses: total, attendedClasses: attended } = course;
  const pct = total > 0 ? (attended / total) * 100 : 0;

  let status = "safe";
  if (total > 0 && pct < 65) status = "danger";
  else if (total > 0 && pct < 75) status = "warning";

  let message;
  if (total === 0) {
    message = "Add today's classes to start tracking this course.";
  } else if (pct >= 75) {
    const bunkable = Math.floor(attended / THRESHOLD - total);
    message =
      bunkable > 0
        ? `You can miss up to ${bunkable} more class${bunkable === 1 ? "" : "es"} and stay at 75%.`
        : "You're exactly on the line — missing a class next will drop you below 75%.";
  } else {
    const needed = Math.max(1, Math.ceil((THRESHOLD * total - attended) / (1 - THRESHOLD)));
    message = `Attend the next ${needed} class${needed === 1 ? "" : "es"} in a row to get back to 75%.`;
  }

  return { pct, status, message };
}

function render() {
  renderOverview();

  const grid = document.getElementById("course-grid");
  if (!allCourses.length) {
    grid.innerHTML = `<p class="empty-state"><strong>No courses tracked yet</strong>Add your first course above to start tracking attendance.</p>`;
    return;
  }

  grid.innerHTML = allCourses.map(courseHtml).join("");
  attachCardHandlers();
}

function renderOverview() {
  const totalAll = allCourses.reduce((sum, c) => sum + c.totalClasses, 0);
  const attendedAll = allCourses.reduce((sum, c) => sum + c.attendedClasses, 0);
  const pct = totalAll > 0 ? (attendedAll / totalAll) * 100 : 0;

  const ring = document.getElementById("overview-ring-fill");
  const pctLabel = document.getElementById("overview-pct");
  const headline = document.getElementById("overview-headline");
  const sub = document.getElementById("overview-sub");

  if (!allCourses.length) {
    ring.style.stroke = "var(--surface-sunken)";
    ring.style.strokeDashoffset = RING_CIRCUMFERENCE;
    pctLabel.textContent = "—";
    headline.textContent = "Add a course to get started";
    sub.textContent = "Attendance across all your courses combined, weighted by classes held.";
    return;
  }

  const status = totalAll === 0 ? "safe" : pct < 65 ? "danger" : pct < 75 ? "warning" : "safe";
  const color = { safe: "var(--sage)", warning: "var(--amber)", danger: "var(--coral)" }[status];

  ring.style.stroke = color;
  ring.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - pct / 100));
  pctLabel.textContent = `${Math.round(pct)}%`;

  const atRisk = allCourses.filter((c) => c.totalClasses > 0 && (c.attendedClasses / c.totalClasses) * 100 < 75).length;

  headline.textContent = pct >= 75 ? "You're above the 75% requirement" : "You're below the 75% requirement";
  sub.textContent = atRisk
    ? `${atRisk} course${atRisk === 1 ? " needs" : "s need"} attention — check the cards below.`
    : "Every course is currently clear of the 75% line.";
}

function courseHtml(course) {
  const { pct, status, message } = computeStats(course);
  const barWidth = Math.min(100, pct);

  return `
    <article class="course-card ${status}" data-id="${course.id}">
      <div class="course-head">
        <div class="course-name">${escapeHtml(course.courseName || "Untitled course")}</div>
        <button type="button" class="course-delete" data-action="delete" aria-label="Remove course">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        </button>
      </div>

      <div class="course-stats-row">
        <span class="course-pct ${status}">${course.totalClasses ? Math.round(pct) + "%" : "—"}</span>
        <span class="course-count">${course.attendedClasses} / ${course.totalClasses} attended</span>
      </div>

      <div class="course-track"><div class="course-fill ${status}" style="width:${barWidth}%"></div></div>

      <p class="course-message">${message}</p>

      <div class="course-actions" data-view="actions">
        <button type="button" class="btn" data-action="present">+1 Present</button>
        <button type="button" class="btn" data-action="absent">+1 Absent</button>
        <button type="button" class="course-edit-toggle" data-action="edit">Edit numbers</button>
      </div>

      <div class="course-edit" data-view="edit" hidden>
        <input type="number" min="0" class="edit-total" value="${course.totalClasses}" aria-label="Total classes">
        <span>/</span>
        <input type="number" min="0" class="edit-attended" value="${course.attendedClasses}" aria-label="Attended classes">
        <button type="button" class="btn primary" data-action="save-edit">Save</button>
      </div>
    </article>`;
}

function attachCardHandlers() {
  document.querySelectorAll(".course-card").forEach((card) => {
    const id = card.dataset.id;
    const course = allCourses.find((c) => c.id === id);
    if (!course) return;

    card.querySelector('[data-action="delete"]').addEventListener("click", () => {
      remove(studentPath(activeUserKey, "attendanceCourses", id));
    });

    card.querySelector('[data-action="present"]').addEventListener("click", () => {
      update(studentPath(activeUserKey, "attendanceCourses", id), {
        totalClasses: course.totalClasses + 1,
        attendedClasses: course.attendedClasses + 1
      });
    });

    card.querySelector('[data-action="absent"]').addEventListener("click", () => {
      update(studentPath(activeUserKey, "attendanceCourses", id), {
        totalClasses: course.totalClasses + 1
      });
    });

    card.querySelector('[data-action="edit"]').addEventListener("click", () => {
      card.querySelector('[data-view="actions"]').hidden = true;
      card.querySelector('[data-view="edit"]').hidden = false;
    });

    card.querySelector('[data-action="save-edit"]').addEventListener("click", () => {
      const total = Math.max(0, Number(card.querySelector(".edit-total").value) || 0);
      const attended = Math.min(total, Math.max(0, Number(card.querySelector(".edit-attended").value) || 0));
      update(studentPath(activeUserKey, "attendanceCourses", id), {
        totalClasses: total,
        attendedClasses: attended
      });
    });
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
