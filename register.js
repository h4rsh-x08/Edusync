import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {getDatabase,push,ref} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";


const firebaseConfig = {
    databaseURL: "https://edusync-c93a0-default-rtdb.asia-southeast1.firebasedatabase.app/"
}



const app = initializeApp(firebaseConfig)
const database = getDatabase(app)
const referenceInDB = ref(database, "Student")


const registerForm = document.getElementById('registerForm');
const registerBtn = document.getElementById('registerBtn');
const statusMsg = document.getElementById('statusMsg');
const passwordField = document.getElementById('password');
const confirmField = document.getElementById('confirmPassword');

let registeredStudents = [];

registerForm.addEventListener('submit', function (event) {
  event.preventDefault();

  const fullName = document.getElementById('fullName').value.trim();
  const rollNo = document.getElementById('rollNo').value.trim();
  const semester = document.getElementById('semester').value;
  const department = document.getElementById('department').value;
  const phone = document.getElementById('phone').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = passwordField.value;
  const confirmPassword = confirmField.value;

  statusMsg.classList.remove('error');


  if (fullName!=""){
    if (password !== confirmPassword ) {
      statusMsg.textContent = 'Passwords do not match. Please check and try again.';
      statusMsg.classList.add('error');

      const confirmWrapper = confirmField.closest('.field');
      confirmWrapper.classList.add('shake');
      setTimeout(function () { confirmWrapper.classList.remove('shake'); }, 400);
      return;
    }}
  const newStudent = {
    fullName: fullName,
    rollNo: rollNo,
    semester: semester,
    department: department,
    phone: phone,
    email: email,
    password: password,
    registeredAt: new Date().toISOString()
  };

  push(referenceInDB,newStudent)

  setTimeout(function () {
    registerBtn.classList.remove('loading');
    const firstName = fullName.split(' ')[0] || 'there';
    statusMsg.textContent = 'Account created for ' + firstName + '! You can now log in.';
    registerForm.reset();
  }, 900);

});
