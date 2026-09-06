// ============================================================
// EduSync — Assignments
// Firebase data under Student/{userKey}/assignments/{id}:
//   title, subject, dueDate, credits         — set by the teacher
//   status: "pending" | "submitted"          — student-controlled
//   driveLink                                — student-controlled
// The student never edits title/subject/dueDate/credits from here —
// only status + driveLink are ever written back.
// ============================================================

import {
  requireSession,
  studentPath,
  onValue,
  update,
  priorityFromDate,
  dueLabel,
  toArray
} from "./common/firebase-config.js";
import { renderSidebar, updateSidebarProfile } from "./common/sidebar.js";

renderSidebar("assignments");

let allAssignments = [];
let currentFilter = "all";
let currentSort = "deadline";
let activeUserKey = null;

requireSession((data, userKey) => {
  updateSidebarProfile(data);
  activeUserKey = userKey;

  onValue(studentPath(userKey, "assignments"), (snapshot) => {
    allAssignments = toArray(snapshot.val()).map((a) => ({
      ...a,
      status: a.status === "submitted" ? "submitted" : "pending",
      credits: Number(a.credits) || 0
    }));
    render();
  });
});

document.getElementById("filter-chips").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  currentFilter = chip.dataset.filter;
  document.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c === chip));
  render();
});

document.getElementById("sort-select").addEventListener("change", (e) => {
  currentSort = e.target.value;
  render();
});

function render() {
  renderSummary();

  const list = document.getElementById("assignment-list");
  let items = [...allAssignments];

  if (currentFilter !== "all") {
    items = items.filter((a) => a.status === currentFilter);
  }

  if (currentSort === "credits") {
    items.sort((a, b) => b.credits - a.credits);
  } else {
    items.sort((a, b) => new Date(a.dueDate || "9999-12-31") - new Date(b.dueDate || "9999-12-31"));
  }

  if (!items.length) {
    list.innerHTML = `<li class="empty-state"><strong>Nothing here</strong>${
      allAssignments.length
        ? "No assignments match this filter."
        : "Your teachers haven't posted anything here yet — check back soon."
    }</li>`;
    return;
  }

  list.innerHTML = items.map(rowHtml).join("");
  attachRowHandlers();
}

function renderSummary() {
  const pending = allAssignments.filter((a) => a.status !== "submitted");
  const submitted = allAssignments.filter((a) => a.status === "submitted");
  const openCredits = pending.reduce((sum, a) => sum + a.credits, 0);

  document.getElementById("stat-pending").textContent = pending.length;
  document.getElementById("stat-submitted").textContent = submitted.length;
  document.getElementById("stat-credits").textContent = openCredits;
}

function rowHtml(a) {
  const urgency = priorityFromDate(a.dueDate);
  const isSubmitted = a.status === "submitted";

  return `
    <li class="assignment-row ${urgency} ${isSubmitted ? "submitted" : ""}" data-id="${a.id}">
      <div class="assignment-main">
        <div class="assignment-top">
          <span class="assignment-title">${escapeHtml(a.title || "Untitled assignment")}</span>
        </div>
        <div class="assignment-subject">${escapeHtml(a.subject || "General")}</div>
        <div class="assignment-tags">
          <span class="pill ${urgency}">${dueLabel(a.dueDate)}</span>
          <span class="pill low">${a.credits} credit${a.credits === 1 ? "" : "s"}</span>
          <span class="pill ${isSubmitted ? "low" : "medium"}">${isSubmitted ? "Submitted" : "Pending"}</span>
        </div>
      </div>
      <div class="assignment-submit" data-mode="${isSubmitted ? "view" : "edit"}">
        ${
          isSubmitted
            ? `<div class="submitted-link">
                 <a href="${escapeAttr(a.driveLink || "#")}" target="_blank" rel="noopener">Open submission ↗</a>
                 <button type="button" class="link-edit-toggle" data-action="edit">Change link</button>
               </div>
               <div class="submit-form" hidden>
                 <input type="url" placeholder="Paste Google Drive link" value="${escapeAttr(a.driveLink || "")}">
                 <button type="button" class="btn primary" data-action="save">Save</button>
               </div>`
            : `<div class="submit-form">
                 <input type="url" placeholder="Paste Google Drive link" value="${escapeAttr(a.driveLink || "")}">
                 <button type="button" class="btn primary" data-action="save">Mark submitted</button>
               </div>`
        }
      </div>
    </li>`;
}

function attachRowHandlers() {
  document.querySelectorAll(".assignment-row").forEach((row) => {
    const id = row.dataset.id;

    const editToggle = row.querySelector('[data-action="edit"]');
    if (editToggle) {
      editToggle.addEventListener("click", () => {
        row.querySelector(".submitted-link").hidden = true;
        row.querySelector(".submit-form").hidden = false;
      });
    }

    const saveBtn = row.querySelector('[data-action="save"]');
    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        const input = row.querySelector(".submit-form input");
        const link = input.value.trim();
        if (!link) {
          input.focus();
          return;
        }
        update(studentPath(activeUserKey, "assignments", id), {
          driveLink: link,
          status: "submitted"
        });
      });
    }
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

function escapeAttr(str) {
  return escapeHtml(str);
}
