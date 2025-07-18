// main.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyAZh-tXWVRaoYIuQ9BH6z0upIuExZ8rAGs",
  authDomain: "my-daily-tasks-5a313.firebaseapp.com",
  projectId: "my-daily-tasks-5a313",
  storageBucket: "my-daily-tasks-5a313.firebasestorage.app",
  messagingSenderId: "676679892031",
  appId: "1:676679892031:web:4746c594d8415697394c8a",
  measurementId: "G-7DEQC4CWQH"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const userId = 'djUVi4KmRVfQohInCiM6oVmbYx92';
initializeAllDays();

async function saveTasksForDay(day, tasks) {
  await setDoc(doc(db, 'users', userId, day, 'default'), { tasks });
}

async function initializeAllDays() {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  for (const day of days) {
    const docRef = doc(db, 'users', userId, day, 'default');
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      const defaultTasks = getDefaultTasksForDay(day).map(text => ({ text, done: false, manual: false }));
      await saveTasksForDay(day, defaultTasks);
    }
  }
  initTaskApp();
}

async function saveTasks(tasks) {
  const day = getCurrentDay();
  await saveTasksForDay(day, tasks);
}

async function loadTasks() {
  const day = getCurrentDay();
  const docRef = doc(db, 'users', userId, day, 'default');
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data().tasks : [];
}

function getCurrentDay() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('day') || new Date().toLocaleDateString('en-US', { weekday: 'long' });
}

async function initTaskApp() {
  const pageTitle = document.getElementById('page-title');
  const taskList = document.getElementById('task-list');
  const newTaskInput = document.getElementById('new-task');
  const day = getCurrentDay();
  pageTitle.textContent = `Tasks for ${day}`;

  let tasks = await loadTasks();

  function renderTasks() {
    taskList.innerHTML = '';
    tasks.forEach((task, index) => {
      const h2 = document.createElement('h2');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.done;
      checkbox.onchange = () => {
        tasks[index].done = checkbox.checked;
        saveTasks(tasks);
      };
      const span = document.createElement('span');
      span.textContent = task.text;
      h2.appendChild(checkbox);
      h2.appendChild(span);
      if (task.manual) {
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '❌';
        deleteBtn.className = 'delete-btn';
        deleteBtn.onclick = () => {
          tasks.splice(index, 1);
          saveTasks(tasks);
          renderTasks();
        };
        h2.appendChild(deleteBtn);
      }
      taskList.appendChild(h2);
    });
  }

  window.addTask = function () {
    const text = newTaskInput.value.trim();
    if (text) {
      tasks.push({ text, done: false, manual: true });
      saveTasks(tasks);
      newTaskInput.value = '';
      renderTasks();
    }
  };

  renderTasks();
}

function getDefaultTasksForDay(day) {
  const taskMap = {
    Monday: ["Dream Journal", "Brush Teeth", "Take Medication", "Shower", "10 Minute Stretch", "Eat Breakfast", "5 Hour Work Day at Apple", "30 Minute Walk", "Eat Lunch", "5 Hour Work Day at Apple", "Eat Dinner", "Family Time", "15 Minute House Clean Up", "Learn Spanish", "Review Email Accounts", "Review Social Media", "Strength Train", "Shower", "Stretch", "Read a Chapter of a Book", "Journal", "Drink a Gallon of Water", "Update Planner"],
    Tuesday: ["Dream Journal", "Brush Teeth", "Take Medication", "Shower", "10 Minute Stretch", "Eat Breakfast", "5 Hour Work Day at Apple", "30 Minute Walk", "Eat Lunch", "5 Hour Work Day at Apple", "Eat Dinner", "Family Time", "15 Minute House Clean Up", "Learn Spanish", "Review Email Accounts", "Review Social Media", "Strength Train", "Shower", "Stretch", "Read a Chapter of a Book", "Journal", "Drink a Gallon of Water", "Update Planner"],
    Wednesday: ["Dream Journal", "Brush Teeth", "Take Medication", "Shower", "10 Minute Stretch", "Eat Breakfast", "30 Minute Walk", "Eat Lunch", "Pay Bills", "Check on CPAP Supplies", "Order Groceries", "2 PM Therapy Session", "Work on Alchemy Body Werks", "Eat Dinner", "Family Time", "15 Minute House Clean Up", "Learn Spanish", "Review Email Accounts", "Review Social Media", "Strength Train", "Shower", "Stretch", "Read a Chapter of a Book", "Journal", "Drink a Gallon of Water", "Update Planner"],
    Thursday: ["Dream Journal", "Brush Teeth", "Take Medication", "Shower", "10 Minute Stretch", "Eat Breakfast", "5 Hour Work Day at Apple", "30 Minute Walk", "Eat Lunch", "5 Hour Work Day at Apple", "Eat Dinner", "Family Time", "15 Minute House Clean Up", "Learn Spanish", "Review Email Accounts", "Review Social Media", "Strength Train", "Shower", "Stretch", "Read a Chapter of a Book", "Journal", "Drink a Gallon of Water", "Update Planner"],
    Friday: ["Dream Journal", "Brush Teeth", "Take Medication", "Take Out Trash", "Shower", "10 Minute Stretch", "Eat Breakfast", "5 Hour Work Day at Apple", "Call IRS to Setup Payment Plan", "30 Minute Walk", "Eat Lunch", "5 Hour Work Day at Apple", "Eat Dinner", "Finish MKG540 Module 8 Portfolio Project", "Family Time", "Find Treadmill Remote", "Find Lenovo Charger", "15 Minute House Clean Up", "Learn Spanish", "Review Email Accounts", "Review Social Media", "Strength Train", "Shower", "Stretch", "Read a Chapter of a Book", "Journal", "Drink a Gallon of Water", "Update Planner"],
    Saturday: ["Dream Journal", "Brush Teeth", "Take Medication", "Shower", "10 Minute Stretch", "Eat Breakfast", "30 Minute Walk", "Deep Clean House", "1 PM Soccer", "Eat Lunch", "Laundry", "Yard Work", "Eat Dinner", "Family Time", "Work on Alchemy Body Werks", "15 Minute House Clean Up", "Learn Spanish", "Review Email Accounts", "Review Social Media", "Strength Train", "Shower", "Stretch", "Read a Chapter of a Book", "Journal", "Drink a Gallon of Water", "Update Planner"],
    Sunday: ["Dream Journal", "Brush Teeth", "Take Medication", "Shower", "10 Minute Stretch", "Eat Breakfast", "30 Minute Walk", "CSU Homework", "Eat Lunch", "CSU Homework", "Eat Dinner", "Family Time", "15 Minute House Clean Up", "Learn Spanish", "Review Email Accounts", "Review Social Media", "Strength Train", "Shower", "Stretch", "Read a Chapter of a Book", "Journal", "Drink a Gallon of Water", "Update Planner"]
  };
  return taskMap[day] || [];
}
