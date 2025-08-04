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
  updatePageTitle();
  await ensureAllDaysInitialized();
  await initTaskApp();
  await initOngoingTaskApp();
  loadRandomQuote();
  loadDailyAffirmation();
  await loadJournalEntries();
  startBreathingBubble();

  const saveBtn = document.getElementById('save-journal-btn');
  if (saveBtn) saveBtn.addEventListener('click', saveJournalEntries);
}

function updatePageTitle() {
  const title = document.getElementById('page-title');
  if (title) {
    title.textContent = getEffectiveDay();
    title.style.visibility = 'visible';
  }
}

function getCurrentDay() {
  const paramDay = new URLSearchParams(window.location.search).get('day');
  const validDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  return validDays.includes(paramDay) ? paramDay : null;
}

function getEffectiveDay() {
  return getCurrentDay() || new Date().toLocaleDateString('en-US', { weekday: 'long' });
}

/* ===== JOURNALS ===== */
async function saveJournalEntries() {
  const day = getEffectiveDay();
  const entry = {
    dream: document.getElementById('dream-journal')?.value.trim() || '',
    daily: document.getElementById('daily-journal')?.value.trim() || ''
  };
  await setDoc(doc(db, 'users', userId, 'journals', day), entry, { merge: true });
  alert("Journal entry saved!");
}

async function loadJournalEntries() {
  const day = getEffectiveDay();
  const ref = doc(db, 'users', userId, 'journals', day);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    document.getElementById('dream-journal').value = data.dream || '';
    document.getElementById('daily-journal').value = data.daily || '';
  }
}

/* ===== TASKS ===== */
async function ensureAllDaysInitialized() {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  for (const day of days) {
    const ref = doc(db, 'users', userId, day, 'tasks');
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const defaults = getDefaultTasksForDay(day).map(text => ({ text, done: false, manual: false }));
      await setDoc(ref, { tasks: defaults });
    }
  }
}

function getDefaultTasksForDay(day) {
  return ["Dream Journal", "Brush Teeth", "Take Medicine"];
}

async function initTaskApp() {
  const taskList = document.getElementById('task-list');
  const newTaskInput = document.getElementById('new-task');
  let tasks = await loadTasks();

  function renderTasks() {
    taskList.innerHTML = '';
    tasks.forEach((task, i) => {
      const h2 = document.createElement('h2');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.done;
      checkbox.onchange = () => {
        tasks[i].done = checkbox.checked;
        saveTasks(tasks);
        updateProgressBar();
      };
      h2.appendChild(checkbox);
      h2.appendChild(document.createTextNode(task.text));
      taskList.appendChild(h2);
    });
    updateProgressBar();
  }

  window.addTask = () => {
    if (newTaskInput.value.trim()) {
      tasks.push({ text: newTaskInput.value.trim(), done: false, manual: true });
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
  const ref = doc(db, 'users', userId, getEffectiveDay(), 'tasks');
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data().tasks : [];
}

async function saveTasks(tasks) {
  await setDoc(doc(db, 'users', userId, getEffectiveDay(), 'tasks'), { tasks });
}

/* ===== ONGOING TASKS ===== */
async function initOngoingTaskApp() {
  const taskList = document.getElementById('ongoing-task-list');
  const newTaskInput = document.getElementById('new-ongoing-task');
  let tasks = await loadOngoingTasks();

  function renderTasks() {
    taskList.innerHTML = '';
    tasks.forEach((task, i) => {
      const h2 = document.createElement('h2');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.done;
      checkbox.onchange = () => {
        tasks[i].done = checkbox.checked;
        saveOngoingTasks(tasks);
        updateProgressBar();
      };
      h2.appendChild(checkbox);
      h2.appendChild(document.createTextNode(task.text));
      taskList.appendChild(h2);
    });
    updateProgressBar();
  }

  window.addOngoingTask = () => {
    if (newTaskInput.value.trim()) {
      tasks.push({ text: newTaskInput.value.trim(), done: false });
      saveOngoingTasks(tasks);
      newTaskInput.value = '';
      renderTasks();
    }
  };

  window.resetOngoingTasks = () => {
    tasks = tasks.map(t => ({ ...t, done: false }));
    saveOngoingTasks(tasks);
    renderTasks();
  };

  renderTasks();
}

async function loadOngoingTasks() {
  const ref = doc(db, 'users', userId, 'ongoing', 'tasks');
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data().tasks : [];
}

async function saveOngoingTasks(tasks) {
  await setDoc(doc(db, 'users', userId, 'ongoing', 'tasks'), { tasks });
}

/* ===== PROGRESS BAR ===== */
function updateProgressBar() {
  const dailyCheckboxes = document.querySelectorAll('#task-list input[type="checkbox"]');
  const ongoingCheckboxes = document.querySelectorAll('#ongoing-task-list input[type="checkbox"]');
  const total = dailyCheckboxes.length + ongoingCheckboxes.length;
  const completed = [...dailyCheckboxes].filter(cb => cb.checked).length + [...ongoingCheckboxes].filter(cb => cb.checked).length;
  document.getElementById('progress-bar').style.width = (total ? (completed / total * 100) : 0) + '%';
  document.getElementById('progress-text').textContent = `${Math.round(total ? (completed / total * 100) : 0)}% Complete`;
}

/* ===== QUOTES & AFFIRMATIONS ===== */
async function loadRandomQuote() {
  const box = document.getElementById('quote-box');
  if (!box) return;
  const snap = await getDocs(collection(db, 'quotes'));
  const quotes = snap.docs.map(doc => doc.data());
  const q = quotes[Math.floor(Math.random() * quotes.length)];
  box.textContent = q ? `"${q.text}" — ${q.author || 'Unknown'}` : "Stay motivated.";
  box.classList.add('visible');
}

async function loadDailyAffirmation() {
  const box = document.getElementById('affirmation-box');
  if (!box) return;
  const ref = doc(db, 'affirmations', getEffectiveDay().toLowerCase());
  const snap = await getDoc(ref);
  box.textContent = snap.exists()
    ? `🌿  Affirmation: ${snap.data().text}`
    : "🌿  No affirmation for today.";
  box.classList.add('visible');
}

/* ===== BREATHING BUBBLE ===== */
function startBreathingBubble() {
  const bubble = document.getElementById('breath-bubble');
  const text = document.getElementById('breath-text');
  const button = document.getElementById('breath-toggle-btn');
  if (!bubble || !text || !button) return;

  const phases = [
    { label: "Inhale", scale: 1.5 },
    { label: "Hold", scale: 1.5 },
    { label: "Exhale", scale: 1 },
    { label: "Hold", scale: 1 }
  ];
  let index = 0, countdownInterval = null, running = false;

  function updatePhase() {
    const current = phases[index % phases.length];
    let count = 4;
    text.innerHTML = `${current.label} for <span id="countdown">${count}</span>`;
    bubble.style.transform = `scale(${current.scale})`;
    clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
      count--;
      document.getElementById("countdown").textContent = count;
      if (count <= 0) {
        clearInterval(countdownInterval);
        index++;
        setTimeout(updatePhase, 1000);
      }
    }, 1000);
  }

  button.addEventListener('click', () => {
    if (!running) {
      running = true;
      index = 0;
      updatePhase();
      button.textContent = "Stop Breath";
    } else {
      running = false;
      clearInterval(countdownInterval);
      text.innerHTML = `Inhale for <span id="countdown">4</span>`;
      bubble.style.transform = "scale(1)";
      button.textContent = "Start Breath";
    }
  });
}
