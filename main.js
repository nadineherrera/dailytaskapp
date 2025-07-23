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
  await loadJournalEntries();

  const saveBtn = document.getElementById('save-journal-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveJournalEntries);
  }
}

function getCurrentDay() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('day') || new Date().toLocaleDateString('en-US', { weekday: 'long' });
}

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

// ✅ Journal
async function saveJournalEntries() {
  const date = getCurrentDay();
  const dream = document.getElementById('dream-journal')?.value.trim() || '';
  const daily = document.getElementById('daily-journal')?.value.trim() || '';
  const entry = { dream, daily };

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
  const date = getCurrentDay();
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

// ✅ Task Defaults
async function ensureAllDaysInitialized() {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  for (const day of days) {
    const ref = doc(db, 'users', userId, day, 'default');
    const snap = await getDoc(ref);
    if (!snap.exists() || !Array.isArray(snap.data().tasks)) {
      const defaults = getDefaultTasksForDay(day).map(text => ({ text, done: false, manual: false }));
      await setDoc(ref, { tasks: defaults });
    }
  }
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

// ✅ Tasks + Progress Bar
async function initTaskApp() {
  const taskList = document.getElementById('task-list');
  const newTaskInput = document.getElementById('new-task');
  let tasks = await loadTasks();

  function updateProgressBar() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.done).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    const bar = document.getElementById('progress-bar');
    const text = document.getElementById('progress-text');
    if (bar) bar.style.width = `${percent}%`;
    if (text) text.textContent = `${percent}% Complete`;
  }

  function renderTasks() {
    taskList.innerHTML = '';
    tasks.forEach((task, i) => {
      const h2 = document.createElement('h2');

    if (task.done) {
  h2.style.transition = 'opacity 0.3s ease';
  h2.style.opacity = '0.3'; // Faded but still visible
}

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.done;
      checkbox.onchange = () => {
        tasks[i].done = checkbox.checked;
        saveTasks(tasks);
        
        if (checkbox.checked) {
        const emoji = document.createElement('span');
emoji.textContent = ['🎉', '🌟', '💯', '👏', '👍', '🔥', '⭐️', '🥳', '🎊', '🫶🏼', '💫'][Math.floor(Math.random() * 4)];
emoji.classList.add('celebration-emoji');
h2.appendChild(emoji);
          yaySound.currentTime = 0;
          yaySound.play();
          
       setTimeout(() => {
  emoji.remove();

  // Fully hide the task AFTER the emoji disappears
  h2.style.opacity = '0';
  h2.style.height = '0';
  h2.style.overflow = 'hidden';
  h2.style.margin = '0';
  h2.style.padding = '0';
  h2.style.border = 'none';

  updateProgressBar(); // Still update progress after
}, 2000);
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
        del.textContent = 'ⅹ';
        del.onclick = () => {
          tasks.splice(i, 1);
          saveTasks(tasks);
          renderTasks();
        };
        h2.appendChild(del);
      }

      taskList.appendChild(h2);
    });

    updateProgressBar();
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

async function loadTasks() {
  const day = getCurrentDay();
  const ref = doc(db, 'users', userId, day, 'default');
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data().tasks : [];
}

async function saveTasks(tasks) {
  const day = getCurrentDay();
  const ref = doc(db, 'users', userId, day, 'default');
  await setDoc(ref, { tasks });
}

// ✅ Quotes + Affirmations
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

async function loadDailyAffirmation() {
  const box = document.getElementById('affirmation-box');
  if (!box) return;

  const urlDay = new URLSearchParams(window.location.search).get('day');
  const today = (urlDay || new Date().toLocaleDateString('en-US', { weekday: 'long' })).toLowerCase();

  try {
    const ref = doc(db, 'affirmations', today);
    const snap = await getDoc(ref);
    box.textContent = snap.exists()
      ? `🌿  Affirmation: ${snap.data().text}`
      : "🌿  No affirmation for today.";
    box.classList.add('visible');
  } catch (e) {
    console.error(e);
    box.textContent = "🌿  Unable to load affirmation.";
  }
}
