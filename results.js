// ============================================================
// EduSync — Results
// Firebase data under Student/{userKey}/results/:
//   cgpa: number
//   semesters/{semId}: { label, sgpa, courses/{cid}: { name, credits,
//                          quiz, midSem, endSem, grade } }
// Entirely posted by the institution — this page only reads and
// renders. No writes happen anywhere in this file.
// ============================================================

import { requireSession, studentPath, onValue, toArray } from "./common/firebase-config.js";
import { renderSidebar, updateSidebarProfile } from "./common/sidebar.js";

renderSidebar("results");

requireSession((data, userKey) => {
  updateSidebarProfile(data);

  onValue(studentPath(userKey, "results"), (snapshot) => {
    const results = snapshot.val() || {};
    const semesters = toArray(results.semesters);
    renderCgpaStrip(results.cgpa, semesters);
    renderSemesters(semesters);
  });
});

function renderCgpaStrip(cgpa, semesters) {
  document.getElementById("cgpa-value").textContent = cgpa != null && cgpa !== "" ? Number(cgpa).toFixed(2) : "—";

  const scroll = document.getElementById("sgpa-scroll");
  if (!semesters.length) {
    scroll.innerHTML = "";
    return;
  }

  scroll.innerHTML = semesters
    .map(
      (s) => `
      <div class="sgpa-chip" data-target="sem-${s.id}">
        <div class="val">${s.sgpa != null && s.sgpa !== "" ? Number(s.sgpa).toFixed(2) : "—"}</div>
        <div class="lbl">${escapeHtml(shortLabel(s.label, s.id))}</div>
      </div>`
    )
    .join("");

  scroll.querySelectorAll(".sgpa-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const target = document.getElementById(chip.dataset.target);
      if (!target) return;
      target.open = true;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function renderSemesters(semesters) {
  const list = document.getElementById("semester-list");

  if (!semesters.length) {
    list.innerHTML = `<p class="empty-state"><strong>No results posted yet</strong>Once your institution publishes results, they'll show up here.</p>`;
    return;
  }

  list.innerHTML = semesters
    .map((s, i) => {
      const courses = toArray(s.courses);
      const isLast = i === semesters.length - 1;
      return `
        <details class="semester-card" id="sem-${s.id}" ${isLast ? "open" : ""}>
          <summary class="semester-summary">
            <div class="semester-summary-left">
              <h3>${escapeHtml(s.label || "Semester")}</h3>
              <span class="course-count">${courses.length} course${courses.length === 1 ? "" : "s"}</span>
            </div>
            <div class="semester-sgpa">
              <span class="val">${s.sgpa != null && s.sgpa !== "" ? Number(s.sgpa).toFixed(2) : "—"}</span>
              <svg class="chevron" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
          </summary>
          <div class="semester-body">
            ${courses.length ? courseTable(courses) : `<p class="empty-state"><strong>No courses posted for this semester</strong></p>`}
          </div>
        </details>`;
    })
    .join("");
}

function courseTable(courses) {
  return `
    <table class="result-table">
      <thead>
        <tr>
          <th>Course</th>
          <th class="num">Credits</th>
          <th class="num">Quiz</th>
          <th class="num">Mid-sem</th>
          <th class="num">End-sem</th>
          <th class="num">Grade</th>
        </tr>
      </thead>
      <tbody>
        ${courses
          .map(
            (c) => `
          <tr>
            <td>${escapeHtml(c.name || "Untitled course")}</td>
            <td class="num">${blankDash(c.credits)}</td>
            <td class="num">${blankDash(c.quiz)}</td>
            <td class="num">${blankDash(c.midSem)}</td>
            <td class="num">${blankDash(c.endSem)}</td>
            <td class="num">${c.grade ? `<span class="grade-pill">${escapeHtml(c.grade)}</span>` : "—"}</td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>`;
}

function blankDash(v) {
  return v === undefined || v === null || v === "" ? "—" : escapeHtml(String(v));
}

function shortLabel(label, id) {
  return label || id;
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
