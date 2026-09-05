import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
    getDatabase,
    ref,
    get
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";


const firebaseConfig = {
    databaseURL: "https://edusync-c93a0-default-rtdb.asia-southeast1.firebasedatabase.app/"
};


const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const referenceInDB = ref(database, "Student");


const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");
const statusMsg = document.getElementById("statusMsg");


loginForm.addEventListener("submit", async function(event) {

    event.preventDefault();

    const identifier = document
        .getElementById("identifier")
        .value
        .trim();

    const password = document
        .getElementById("password")
        .value;

    const remember = document
        .getElementById("remember")
        .checked;


    statusMsg.classList.remove("error");


    // Check empty fields
    if (!identifier || !password) {

        statusMsg.textContent = "Please fill in both fields.";
        statusMsg.classList.add("error");

        return;
    }


    loginBtn.classList.add("loading");
    statusMsg.textContent = "Checking credentials...";


    try {

        // get() reads the node once and resolves — no listener left
        // hanging around after the login check is done.
        const snapshot = await get(referenceInDB);

        if (!snapshot.exists()) {

            statusMsg.textContent = "No student accounts found.";
            statusMsg.classList.add("error");

            return;
        }


        const snapshotValues = snapshot.val();

        // Object.entries (not Object.values) so we keep hold of the real
        // database key for this student — dashboard.html and the other
        // pages need that exact key, not a re-derived guess at it.
        const entries = Object.entries(snapshotValues);


        let authenticatedKey = null;


        for (let i = 0; i < entries.length; i++) {

            const [key, student] = entries[i];


            const identifierMatches =
                identifier === student.email ||
                identifier === student.rollNo;


            const passwordMatches =
                password === student.password;


            if (identifierMatches && passwordMatches) {

                authenticatedKey = key;

                break;
            }
        }


        if (authenticatedKey) {

            loginPage(identifier, password, remember);

        } else {

            statusMsg.textContent =
                "Invalid email/roll number or password.";

            statusMsg.classList.add("error");
        }

    } catch (error) {

        console.error("EduSync login error:", error);

        statusMsg.textContent =
            "Couldn't reach the database — check your connection and try again.";

        statusMsg.classList.add("error");

    } finally {

        loginBtn.classList.remove("loading");
    }

});


function loginPage(userId, password, remember) {

    // "Remember me" checked → survives closing the browser (localStorage).
    // Unchecked → cleared when the tab closes (sessionStorage).
    const storage = remember ? localStorage : sessionStorage;

    storage.setItem("currentId", userId);
    storage.setItem("currentUserPass", password);

    window.location.href = "dashboard.html";
}
