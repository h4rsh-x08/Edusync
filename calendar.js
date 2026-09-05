// ============================================================
// EduSync — My calendar
// Reads and merges three Firebase nodes under Student/{userKey}/:
//   calendarEvents/{id}: { title, date:"YYYY-MM-DD", type:"event"|"assignment"|"exam"|"holiday" }
//   assignments/{id}:    { title, dueDate:"YYYY-MM-DD" }   → shown as type "assignment"
//   exams/{id}:          { title, dueDate:"YYYY-MM-DD" }   → shown as type "exam"
// "Add to calendar" writes new entries into calendarEvents.
// ============================================================

import {
  requireSession,
  studentPath,
  onValue,
  push,
  remove,
  toArray
} from "./common/firebase-config.js";
import { renderSidebar, updateSidebarProfile } from "./common/sidebar.js";

renderSidebar("calendar");

const TYPE_DOT = { exam: "high", assignment: "medium", holiday: "low" }; // "event" handled separately (indigo)

let viewDate = new Date();
viewDate.setDate(1);
let selectedDate = toDateKey(new Date());
let allEvents = []; // merged, each: { id, title, date, type, source }
let calendarEventsRef = null;
let activeUserKey = null;

requireSession((data, userKey) => {
  updateSidebarProfile(data);
  activeUserKey = userKey;
  calendarEventsRef = studentPath(userKey, "calendarEvents");

  let customEvents = [];
  let assignmentEvents = [];
  let examEvents = [];

  onValue(calendarEventsRef, (snap) => {
    customEvents = toArray(snap.val()).map((e) => ({ ...e, source: "calendarEvents" }));
    merge();
  });

  onValue(studentPath(userKey, "assignments"), (snap) => {
    assignmentEvents = toArray(snap.val())
      .filter((a) => a.dueDate)
      .map((a) => ({ id: a.id, title: a.title, date: a.dueDate, type: "assignment", source: "assignments" }));
    merge();
  });

  onValue(studentPath(userKey, "exams"), (snap) => {
    examEvents = toArray(snap.val())
      .filter((x) => x.dueDate)
      .map((x) => ({ id: x.id, title: x.title, date: x.dueDate, type: "exam", source: "exams" }));
    merge();
  });

  function merge() {
    allEvents = [...customEvents, ...assignmentEvents, ...examEvents];
    renderCalendar();
    renderAgenda();
  }

  document.getElementById("event-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const title = document.getElementById("event-title").value.trim();
    const date = document.getElementById("event-date").value;
    const type = document.getElementById("event-type").value;
    if (!title || !date) return;

    push(calendarEventsRef, { title, date, type });
    e.target.reset();
    selectedDate = date;
    renderAgenda();
  });
});

document.getElementById("prev-month").addEventListener("click", () => {
  viewDate.setMonth(viewDate.getMonth() - 1);
  renderCalendar();
});
document.getElementById("next-month").addEventListener("click", () => {
  viewDate.setMonth(viewDate.getMonth() + 1);
  renderCalendar();
});

function toDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function renderCalendar() {
  document.getElementById("month-label").textContent = viewDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric"
  });

  const grid = document.getElementById("calendar-grid");
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1);
  // Monday-first offset
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const todayKey = toDateKey(new Date());
  const cells = [];

  for (let i = startOffset; i > 0; i--) {
    cells.push({ day: daysInPrevMonth - i + 1, outside: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, outside: false, key: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: cells.length, outside: true });
  }

  grid.innerHTML = cells
    .map((cell) => {
      if (cell.outside) {
        return `<div class="day-cell outside"><span class="day-num">${cell.day}</span></div>`;
      }
      const dayEvents = allEvents.filter((e) => e.date === cell.key);
      const isToday = cell.key === todayKey;
      const isSelected = cell.key === selectedDate;
      return `
        <button type="button" class="day-cell ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}" data-key="${cell.key}">
          <span class="day-num">${cell.day}</span>
          <span class="day-dots">${dayEvents
            .slice(0, 4)
            .map((e) => `<i class="priority-dot ${TYPE_DOT[e.type] || ""}" ${e.type === "event" ? 'style="background:var(--indigo)"' : ""}></i>`)
            .join("")}</span>
        </button>`;
    })
    .join("");

  grid.querySelectorAll(".day-cell:not(.outside)").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedDate = btn.dataset.key;
      renderCalendar();
      renderAgenda();
    });
  });
}

function renderAgenda() {
  const title = document.getElementById("agenda-title");
  const list = document.getElementById("agenda-list");

  const d = new Date(selectedDate + "T00:00:00");
  title.textContent = isNaN(d)
    ? "Selected day"
    : d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

  const dayEvents = allEvents.filter((e) => e.date === selectedDate);

  if (!dayEvents.length) {
    list.innerHTML = `<li class="empty-state"><strong>Nothing on this day</strong>Pick a date on the calendar to see it here.</li>`;
    return;
  }

  list.innerHTML = dayEvents
    .map(
      (e) => `
      <li class="agenda-row">
        <span class="priority-dot ${TYPE_DOT[e.type] || ""}" ${e.type === "event" ? 'style="background:var(--indigo)"' : ""}></span>
        <div>
          <div class="title">${escapeHtml(e.title || "Untitled")}</div>
          <div class="type">${escapeHtml(e.type)}</div>
        </div>
        ${
          e.source === "calendarEvents"
            ? `<button type="button" class="delete-event" data-id="${e.id}" aria-label="Remove">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
               </button>`
            : ""
        }
      </li>`
    )
    .join("");

  list.querySelectorAll(".delete-event").forEach((btn) => {
    btn.addEventListener("click", () => remove(studentPath(activeUserKey, "calendarEvents", btn.dataset.id)));
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
