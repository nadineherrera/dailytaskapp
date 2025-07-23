import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore, doc, getDoc, setDoc, collection, getDocs
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyAZh-tXWVRaoYIuQ9BH6z0upIuExZ8rAGs",
  authDomain: "my-daily-tasks-5a313.firebaseapp.com",
  projectId: "my-daily-tasks-5a313",
  storageBucket: "my-daily-tasks-5a313.firebasestorage.app",
  messagingSenderId: "676679892031",
  appId: "1:676679892031:web:4746c594d8415697394c8a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const userId = 'djUVi4KmRVfQohInCiM6oVmbYx92';
const yaySound = new Audio('377017__elmasmalo1__notification-pop.wav');
yaySound.volume = 1.0;

setupApp();

async function setupApp() {
  await ensureAllDaysInitialized();
  await initTaskApp();
  loadRandomQuote();
  loadDailyAffirmation();
  loadJournalEntries();

  const saveBtn = document.getElementById('save-journal-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveJournalEntries);
  }
}

// 🗓️ Date Helpers
function getCurrentDay() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('day') || new Date().toLocaleDateString('en-US', { weekday: 'long' });
}

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

// 📝 Journal Functions
async function saveJournalEntries() {
  const date = getTodayDate();
  const dream = document.getElementById('dream-journal')?.value?.trim() || '';
  const daily = document.getElementById('daily-journal')?.value?.trim() || '';

  const entry = { ...(dream && { dream }), ...(daily && { daily }) };
  if (!dream && !daily) {
    alert("Please enter something to save.");
    return;
  }

  try {
    const ref = doc(db, 'users', userId, 'journals', date);
    await setDoc(ref, entry, { merge: true });
    alert("Journal entry saved!");
  } catch (err) {
    console.error("Error saving journal:", err);
    alert("Failed to save entry.");
  }
}

async function loadJournalEntries() {
  const date = getTodayDate();
  const dreamField = document.getElementById('dream-journal');
  const dailyField = document.getElementById('daily-journal');
  if (!dreamField || !dailyField) return;

  try {
    const ref = doc(db, 'users', userId, 'journals', date);
    const snap = await getDoc(ref);
    const data = snap.exists() ? snap.data() : {};
    dreamField.value = data.dream || '';
    dailyField.value = data.daily || '';
  } catch (err) {
    console.error("Failed to load journal:", err);
  }
}

// ✅ Tasks
async function ensureAllDaysInitialized() {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  for (const day of days) {
    const ref = doc(db, 'users', userId, day, 'default');
    const snap = await getDoc(ref);
    const data = snap.exists() ? snap.data() : {};
    if (!Array.isArray(data.tasks) || data.tasks.length === 0) {
      const defaults = getDefaultTasksForDay(day).map(text => ({ text, done: false, manual: false }));
      await setDoc(ref, { tasks: defaults });
    }
  }
}

async function loadTasks() {
  const day = getCurrentDay();
  const ref = doc(db, 'users', userId, day, 'default');
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data().tasks : [];
}

async function initTaskApp() {
  const taskList = document.getElementById('task-list');
  const newTaskInput = document.getElementById('new-task');
  let tasks = await loadTasks();

  function renderTasks() {
    taskList.innerHTML = '';
    tasks.forEach((task, i) => {
      if (task.done) return;
      const h2 = document.createElement('h2');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.done;
      checkbox.onchange = () => {
        tasks[i].done = checkbox.checked;
        saveTasks(tasks);
        if (checkbox.checked) {
          const emoji = document.createElement('span');
          emoji.textContent = ['🎉', '🌟', '💯', '👏'][Math.floor(Math.random() * 4)];
          h2.appendChild(emoji);
          yaySound.currentTime = 0;
          yaySound.play();
          setTimeout(() => { emoji.remove(); renderTasks(); }, 2000);
        } else {
          renderTasks();
        }
      };

      const span = document.createElement('span');
      span.textContent = task.text;
      h2.appendChild(checkbox);
      h2.appendChild(span);

      if (task.manual) {
        const del = document.createElement('button');
        del.textContent = '❌';
        del.onclick = () => {
          tasks.splice(i, 1);
          saveTasks(tasks);
          renderTasks();
        };
        h2.appendChild(del);
      }

      taskList.appendChild(h2);
    });
  }

  window.addTask = () => {
    const text = newTaskInput.value.trim();
    if (text) {
      tasks.push({ text, done: false, manual: true });
      saveTasks(tasks);
      newTaskInput.value = '';
      renderTasks();
    }
  };

  window.resetTasks = () => {
    tasks = tasks.map(t => ({ ...t, done: false }));
    saveTasks(tasks);
    renderTasks();
  };

  renderTasks();
}

async function saveTasks(tasks) {
  const day = getCurrentDay();
  const ref = doc(db, 'users', userId, day, 'default');
  await setDoc(ref, { tasks });
}

function getDefaultTasksForDay(day) {
  const base = [
    "Dream Journal", "Brush Teeth", "Take Medicine", "Take a Shower", "Stretch",
    "Eat Breakfast", "Walk for 30 Minutes", "Eat Lunch", "Eat Dinner",
    "Spend Time With Family", "15-Minute Clean Up", "Learn Spanish",
    "Check Email", "Check Social Media", "Strength Train", "Read", "Journal",
    "Drink Water", "Update Tasks"
  ];
  const addOns = {
    Monday: ["Work for 5 Hours at Apple"],
    Tuesday: ["Work for 5 Hours at Apple"],
    Wednesday: ["2 PM Therapy Session"],
    Thursday: ["Work on Alchemy Body Werks"],
    Friday: ["Pay Bills", "Call IRS"],
    Saturday: ["Deep Clean", "Laundry"],
    Sunday: ["CSU Homework"]
  };
  return [...base, ...(addOns[day] || [])];
}

// ✅ Quotes
async function loadRandomQuote() {
  const box = document.getElementById('quote-box');
  if (!box) return;

  try {
    const snap = await getDocs(collection(db, 'quotes'));
    const quotes = snap.docs.map(doc => doc.data());
    const q = quotes[Math.floor(Math.random() * quotes.length)];
    box.textContent = q ? `"${q.text}" — ${q.author || 'Unknown'}` : "Stay motivated.";
    box.classList.add('visible');
  } catch (e) {
    console.error(e);
    box.textContent = "Could not load quote.";
  }
}

// ✅ Affirmation
async function loadDailyAffirmation() {
  const box = document.getElementById('affirmation-box');
  if (!box) return;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  try {
    const ref = doc(db, 'affirmations', today);
    const snap = await getDoc(ref);
    box.textContent = snap.exists() ? `🌿 Affirmation: ${snap.data().text}` : "🌿 No affirmation for today.";
    box.classList.add('visible');
  } catch (e) {
    console.error(e);
    box.textContent = "🌿 Unable to load affirmation.";
  }
}
