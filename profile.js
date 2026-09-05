// ============================================================
// EduSync — My profile
// Reads Student/{userKey}/: name, rollNo, course, branch, semester,
// section, email, phone, bio, photoURL. Only phone + bio are editable
// here — the rest is treated as the institution's record of you.
// ============================================================

import { requireSession, studentPath, update } from "./common/firebase-config.js";
import { renderSidebar, updateSidebarProfile } from "./common/sidebar.js";

renderSidebar("profile");

const DEFAULT_AVATAR =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 76 76">
    <rect width="76" height="76" rx="38" fill="#e9edfb"/>
    <circle cx="38" cy="29" r="12" fill="#3454d1"/>
    <path d="M14 62c3-13 14-19 24-19s21 6 24 19" fill="#3454d1"/>
  </svg>`);

let activeUserKey = null;
let isEditing = false;

requireSession((data, userKey) => {
  updateSidebarProfile(data);
  activeUserKey = userKey;
  renderProfile(data);
});

function renderProfile(data) {
  document.getElementById("profile-avatar").src = data.photoURL || DEFAULT_AVATAR;
  document.getElementById("profile-name").textContent = data.name || "Unnamed student";
  document.getElementById("profile-course").textContent = [data.course, data.branch].filter(Boolean).join(", ") || "Course not set";

  setField("rollNo", data.rollNo);
  setField("course", data.course);
  setField("branch", data.branch);
  setField("semester", data.semester);
  setField("section", data.section);
  setField("email", data.email);
  setField("phone", data.phone);

  document.getElementById("bio-display").textContent = data.bio || "Nothing added yet.";

  // seed the (hidden) edit inputs so opening edit mode shows current values
  document.querySelector('.edit-input[data-field="phone"]').value = data.phone || "";
  document.querySelector('.edit-input[data-field="bio"]').value = data.bio || "";
}

function setField(name, value) {
  const el = document.querySelector(`dd[data-field="${name}"]`);
  if (el) el.textContent = value || "Not set";
}

document.getElementById("edit-toggle").addEventListener("click", () => {
  isEditing = !isEditing;
  document.querySelectorAll(".edit-input").forEach((el) => (el.hidden = !isEditing));
  document.querySelector('dd[data-field="phone"]').hidden = isEditing;
  document.getElementById("bio-display").hidden = isEditing;
  document.getElementById("save-profile").hidden = !isEditing;
  document.getElementById("edit-toggle").textContent = isEditing ? "Cancel" : "Edit contact & bio";
});

document.getElementById("save-profile").addEventListener("click", () => {
  const phone = document.querySelector('.edit-input[data-field="phone"]').value.trim();
  const bio = document.querySelector('.edit-input[data-field="bio"]').value.trim();

  update(studentPath(activeUserKey), { phone, bio }).then(() => {
    isEditing = false;
    document.querySelectorAll(".edit-input").forEach((el) => (el.hidden = true));
    document.querySelector('dd[data-field="phone"]').hidden = false;
    document.getElementById("bio-display").hidden = false;
    document.getElementById("save-profile").hidden = true;
    document.getElementById("edit-toggle").textContent = "Edit contact & bio";
  });
});
