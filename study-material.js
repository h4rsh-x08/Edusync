// ============================================================
// EduSync — Study material
// Firebase data under Student/{userKey}/studyMaterial/{id}:
//   title, subject, type: "book" | "pdf" | "link", url,
//   addedBy: "student" | "faculty"
// Faculty-added entries are pushed straight into Firebase and are
// read-only here; only entries with addedBy === "student" show a
// delete button.
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

renderSidebar("study-material");

const ICONS = {
  book: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 6.5c-1.8-1.4-4.2-2-7-2v13c2.8 0 5.2.6 7 2 1.8-1.4 4.2-2 7-2v-13c-2.8 0-5.2.6-7 2z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 6.5v13" stroke="currentColor" stroke-width="1.6"/></svg>`,
  pdf: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M7 3.5h7l4 4V20a1 1 0 01-1 1H7a1 1 0 01-1-1V4.5a1 1 0 011-1z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M14 3.5V8h4" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  link: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9.5 14.5l5-5M10 8.5l1-1a3 3 0 014.2 4.2l-1 1M14 15.5l-1 1a3 3 0 01-4.2-4.2l1-1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`
};

let allMaterial = [];
let currentFilter = "all";
let materialRef = null;
let activeUserKey = null;

requireSession((data, userKey) => {
  updateSidebarProfile(data);
  activeUserKey = userKey;
  materialRef = studentPath(userKey, "studyMaterial");

  onValue(materialRef, (snapshot) => {
    allMaterial = toArray(snapshot.val()).map((m) => ({
      ...m,
      type: ["book", "pdf", "link"].includes(m.type) ? m.type : "link",
      addedBy: m.addedBy === "faculty" ? "faculty" : "student"
    }));
    render();
  });

  document.getElementById("material-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const title = document.getElementById("material-title").value.trim();
    const subject = document.getElementById("material-subject").value.trim();
    const type = document.getElementById("material-type").value;
    const url = document.getElementById("material-url").value.trim();
    if (!title || !url) return;

    push(materialRef, { title, subject, type, url, addedBy: "student" });
    e.target.reset();
    document.getElementById("material-type").value = "pdf";
  });
});

document.getElementById("filter-chips").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  currentFilter = chip.dataset.filter;
  document.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c === chip));
  render();
});

function render() {
  const grid = document.getElementById("material-grid");
  let items = [...allMaterial];

  if (currentFilter !== "all") {
    items = items.filter((m) => m.type === currentFilter);
  }

  if (!items.length) {
    grid.innerHTML = `<p class="empty-state"><strong>Shelf's empty</strong>${
      allMaterial.length
        ? "Nothing matches this filter."
        : "Add a reference above, or check back once your faculty has posted something."
    }</p>`;
    return;
  }

  grid.innerHTML = items.map(cardHtml).join("");

  grid.querySelectorAll(".material-delete").forEach((btn) => {
    btn.addEventListener("click", () => {
      remove(studentPath(activeUserKey, "studyMaterial", btn.dataset.id));
    });
  });
}

function cardHtml(m) {
  return `
    <article class="material-card">
      <div class="material-head">
        <div class="material-icon">${ICONS[m.type]}</div>
        <span class="material-badge ${m.addedBy}">${m.addedBy === "faculty" ? "From faculty" : "Added by you"}</span>
      </div>
      <div>
        <div class="material-title">${escapeHtml(m.title || "Untitled")}</div>
        <div class="material-subject">${escapeHtml(m.subject || "General")}</div>
      </div>
      <div class="material-footer">
        <a href="${escapeAttr(m.url || "#")}" target="_blank" rel="noopener">Open ↗</a>
        ${
          m.addedBy === "student"
            ? `<button type="button" class="material-delete" data-id="${m.id}" aria-label="Delete">
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
               </button>`
            : ""
        }
      </div>
    </article>`;
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
