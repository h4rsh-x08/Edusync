// ============================================================
// EduSync — To-do list
// Firebase data under Student/{userKey}/todos/{id}:
//   { text, deadline: "YYYY-MM-DD", priority: "high"|"medium"|"low",
//     completed: bool, createdAt }
// ============================================================

import {
  requireSession,
  studentPath,
  onValue,
  push,
  update,
  remove,
  normalizePriority,
  dueLabel,
  toArray
} from "./common/firebase-config.js";
import { renderSidebar, updateSidebarProfile } from "./common/sidebar.js";

renderSidebar("todo");

let currentFilter = "all";
let hideDone = false;
let allTodos = [];
let todosRef = null;
let activeUserKey = null;

requireSession((data, userKey) => {
  updateSidebarProfile(data);
  activeUserKey = userKey;
  todosRef = studentPath(userKey, "todos");

  onValue(todosRef, (snapshot) => {
    allTodos = toArray(snapshot.val());
    render();
  });

  document.getElementById("todo-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const text = document.getElementById("task-text").value.trim();
    const deadline = document.getElementById("task-deadline").value;
    const priority = document.getElementById("task-priority").value;
    if (!text) return;

    push(todosRef, {
      text,
      deadline: deadline || null,
      priority,
      completed: false,
      createdAt: Date.now()
    });

    e.target.reset();
    document.getElementById("task-priority").value = "medium";
  });
});

document.getElementById("filter-chips").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  currentFilter = chip.dataset.filter;
  document.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c === chip));
  render();
});

document.getElementById("hide-done").addEventListener("change", (e) => {
  hideDone = e.target.checked;
  render();
});

function render() {
  const list = document.getElementById("todo-list");

  let items = allTodos.map((t) => ({ ...t, priority: normalizePriority(t.priority) }));

  if (currentFilter !== "all") {
    items = items.filter((t) => t.priority === currentFilter);
  }
  if (hideDone) {
    items = items.filter((t) => !t.completed);
  }

  const priorityRank = { high: 0, medium: 1, low: 2 };
  items.sort((a, b) => {
    if (!!a.completed !== !!b.completed) return a.completed ? 1 : -1;
    if (priorityRank[a.priority] !== priorityRank[b.priority]) {
      return priorityRank[a.priority] - priorityRank[b.priority];
    }
    return new Date(a.deadline || "9999-12-31") - new Date(b.deadline || "9999-12-31");
  });

  if (!items.length) {
    list.innerHTML = `<li class="empty-state"><strong>Nothing here yet</strong>Add your first task above, or it'll show up here once it's in the database.</li>`;
    return;
  }

  list.innerHTML = items
    .map(
      (t) => `
      <li class="todo-row ${t.priority} ${t.completed ? "done" : ""}" data-id="${t.id}">
        <button class="todo-check" type="button" data-id="${t.id}" aria-label="Mark complete">
          ${t.completed ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4 10-10" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ""}
        </button>
        <div class="todo-info">
          <div class="task-text">${escapeHtml(t.text || "")}</div>
          <div class="task-meta">
            <span class="pill ${t.priority}">${t.priority.charAt(0).toUpperCase() + t.priority.slice(1)}</span>
            <span class="deadline">${t.deadline ? dueLabel(t.deadline) : "No deadline"}</span>
          </div>
        </div>
        <button class="todo-delete" type="button" data-id="${t.id}" aria-label="Delete task">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        </button>
      </li>`
    )
    .join("");

  list.querySelectorAll(".todo-check").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = allTodos.find((t) => t.id === btn.dataset.id);
      update(studentPath(activeUserKey, "todos", btn.dataset.id), { completed: !item.completed });
    });
  });

  list.querySelectorAll(".todo-delete").forEach((btn) => {
    btn.addEventListener("click", () => {
      remove(studentPath(activeUserKey, "todos", btn.dataset.id));
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
