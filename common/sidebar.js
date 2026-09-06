
import { getCurrentId } from "./firebase-config.js";

const DEFAULT_AVATAR =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 42 42">
    <rect width="42" height="42" rx="21" fill="#e9edfb"/>
    <circle cx="21" cy="16.5" r="6.5" fill="#3454d1"/>
    <path d="M8 35c1.8-7.5 8-11 13-11s11.2 3.5 13 11" fill="#3454d1"/>
  </svg>`);



const NAV_ITEMS = [
  
  {
    id: "dashboard",
    label: "Dashboard",
    href: "dashboard.html",
    icon: `<path d="M3 12h7V3H3v9zm0 8h7v-6H3v6zm11 0h7V11h-7v9zm0-17v5h7V3h-7z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>`
  },
  {
    id: "calendar",
    label: "My calendar",
    href: "calendar.html",
    icon: `<rect x="3.5" y="4.5" width="17" height="16" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3.5 9.5h17M8 3v3M16 3v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`
  },
  {
    id: "assignments",
    label: "Assignments",
    href: "assignments.html",
    icon: `<path d="M7 3.5h7l4 4V20a1 1 0 01-1 1H7a1 1 0 01-1-1V4.5a1 1 0 011-1z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M14 3.5V8h4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 13l1.6 1.6L14 11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
  },
  {
    id: "study-material",
    label: "Study material",
    href: "study-material.html",
    icon: `<path d="M12 6.5c-1.8-1.4-4.2-2-7-2v13c2.8 0 5.2.6 7 2 1.8-1.4 4.2-2 7-2v-13c-2.8 0-5.2.6-7 2z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 6.5v13" stroke="currentColor" stroke-width="1.6"/>`
  },
  {
    id: "attendance",
    label: "Attendance",
    href: "attendance.html",
    icon: `<rect x="3.5" y="4.5" width="17" height="16" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3.5 9.5h17M8 3v3M16 3v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M8.5 14.7l2.1 2.1 4.7-4.7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
  },
  {
    id: "results",
    label: "Results",
    href: "results.html",
    icon: `<path d="M5.5 20V11.5M12 20V6.5M18.5 20v-7.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M3.5 20.5h17" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`
  },
  {
    id: "todo",
    label: "To-do list",
    href: "todo.html",
    icon: `<path d="M9 6.5h11M9 12h11M9 17.5h11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M4 6.5l1.2 1.2L7.5 5.3M4 17.5l1.2 1.2 2.3-2.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/><rect x="4" y="10.8" width="3.2" height="3.2" rx="0.6" stroke="currentColor" stroke-width="1.6" fill="none"/>`
  },
];


export function renderSidebar(activeId) {
  const root = document.getElementById("sidebar-root");
  if (!root) return;

  const cachedName = localStorage.getItem("cachedName") || getCurrentId() || "Student";

  root.innerHTML = `
    <aside class="sidebar">
      <div class="sidebar-brand">
        <div class="mark"></div>
        <span id="title">EduSync</span>
      </div>

      <a href="profile.html" class="sidebar-profile">
        <img id="sidebar-avatar" src="${DEFAULT_AVATAR}" alt="">
        <div class="sidebar-profile-text">
          <div class="name" id="sidebar-name">${escapeHtml(cachedName)}</div>
          <div class="meta" id="sidebar-meta"></div>
        </div>
      </a>

      <nav class="sidebar-nav">
        ${NAV_ITEMS.map(
          (item) => `
          <a href="${item.href}" class="${item.id === activeId ? "active" : ""}">
            <svg viewBox="0 0 24 24" fill="none">${item.icon}</svg>
            <span>${item.label}</span>
          </a>`
        ).join("")}
      </nav>

      <div class="sidebar-footer">
        <button id="sidebar-logout" type="button">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M9 5H6a2 2 0 00-2 2v10a2 2 0 002 2h3M16 16l4-4-4-4M20 12H9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  `;

  document.getElementById("sidebar-logout").addEventListener("click", () => {
    localStorage.removeItem("currentId");
    localStorage.removeItem("currentUserPass");
    localStorage.removeItem("cachedName");
    sessionStorage.removeItem("currentId");
    sessionStorage.removeItem("currentUserPass");
    window.location.href = "index.html";
  });
}


export function updateSidebarProfile(data) {
  const nameEl = document.getElementById("sidebar-name");
  const metaEl = document.getElementById("sidebar-meta");
  const avatarEl = document.getElementById("sidebar-avatar");
  if (!nameEl) return;

  const name = data.name || getCurrentId() || "Student";
  nameEl.textContent = name;
  localStorage.setItem("cachedName", name);

  const metaParts = [data.rollNo, data.course].filter(Boolean);
  

  if (data.photoURL) {
    avatarEl.src = data.photoURL;
  }
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
