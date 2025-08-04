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

function updatePageTitle() {
  const title = document.getElementById('page-title');
  const day = getEffectiveDay();
  if (title) {
    title.textContent = day;
    title.style.visibility = 'visible';
  }
}

async function setupApp() {
  updatePageTitle();
  await ensureAllDaysInitialized();
  await initTaskApp();
  await initOngoingTasks();
  loadRandomQuote();
  loadDailyAffirmation();
  await loadJournalEntries();
  startBreathingBubble();

  const saveBtn = document.getElementById('save-journal-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveJournalEntries);
  }
}

function getCurrentDay() {
  const urlParams = new URLSearchParams(window.location.search);
  const paramDay = urlParams.get('day');
  const validDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  return validDays.includes(paramDay) ? paramDay : null;
}

function getEffectiveDay() {
  const currentDay = getCurrentDay();
  if (currentDay) return currentDay;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  return today.charAt(0).toUpperCase() + today.slice(1);
}

/* ---------------- Journals ---------------- */
async function saveJournalEntries() {
  const day = getEffectiveDay();
  const dreamField = document.getElementById('dream-journal');
  const dailyField = document.getElementById('daily-journal');
  const gratitudeField = document.getElementById('gratitudeEntry');
  const moodField = document.getElementById('mood');

  const entry = {
    dream: dreamField?.value.trim() || '',
    daily: dailyField?.value.trim() || '',
    gratitude: gratitudeField?.value.trim() || '',
    mood: moodField?.value || ''
  };

  try {
    const ref = doc(db, 'users', userId, 'journals', day);
    await setDoc(ref, entry, { merge: true });
    alert("Journal entry saved!");
  } catch (err) {
    console.error("Error saving journal:", err);
    alert("Failed to save entry.");
  }
}

async function loadJournalEntries() {
  const day = getEffectiveDay();
  const dreamField = document.getElementById('dream-journal');
  const dailyField = document.getElementById('daily-journal');
  const gratitudeField = document.getElementById('gratitudeEntry');
  const moodField = document.getElementById('mood');

  try {
    const ref = doc(db, 'users', userId, 'journals', day);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      dreamField.value = data.dream || '';
      dailyField.value = data.daily || '';
      gratitudeField.value = data.gratitude || '';
      moodField.value = data.mood || '';
    }
  } catch (err) {
    console.error("Failed to load journal:", err);
  }
}

/* ---------------- Firestore Init ---------------- */
async function ensureAllDaysInitialized() {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  for (const day of days) {
    const dailyRef = doc(db, 'users', userId, day, 'tasks');
    const dailySnap = await getDoc(dailyRef);
    if (!dailySnap.exists() || !Array.isArray(dailySnap.data().tasks)) {
      const defaults = getDefaultTasksForDay(day).map(text => ({ text, done: false, manual: false }));
      await setDoc(dailyRef, { tasks: defaults });
    }
  }

  // Ongoing tasks collection
  const ongoingRef = doc(db, 'users', userId, 'ongoing', 'tasks');
  const ongoingSnap = await getDoc(ongoingRef);
  if (!ongoingSnap.exists() || !Array.isArray(ongoingSnap.data().tasks)) {
    await setDoc(ongoingRef, { tasks: [] });
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

/* ---------------- Daily Tasks ---------------- */
async function initTaskApp() {
  const taskList = document.getElementById('task-list');
  const newTaskInput = document.getElementById('new-task');
  let tasks = await loadTasks();

  function renderTasks() {
    taskList.innerHTML = '';
    tasks.forEach((task, i) => {
      const h2 = document.createElement('h2');
      if (task.done) h2.style.opacity = '0.3';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.done;
      checkbox.onchange = () => {
        tasks[i].done = checkbox.checked;
        saveTasks(tasks);
        updateProgressBar();
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
  const day = getEffectiveDay();
  const ref = doc(db, 'users', userId, day, 'tasks');
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data().tasks : [];
}

async function saveTasks(tasks) {
  const day = getEffectiveDay();
  const ref = doc(db, 'users', userId, day, 'tasks');
  await setDoc(ref, { tasks });
}

/* ---------------- Ongoing Tasks ---------------- */
async function initOngoingTasks() {
  const ongoingList = document.getElementById('ongoing-task-list');
  const newOngoingInput = document.getElementById('new-ongoing-task');
  let tasks = await loadOngoingTasks();

  function renderOngoing() {
    ongoingList.innerHTML = '';
    tasks.forEach((task, i) => {
      const h2 = document.createElement('h2');
      if (task.done) h2.style.opacity = '0.3';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.done;
      checkbox.onchange = () => {
        tasks[i].done = checkbox.checked;
        saveOngoingTasks(tasks);
        updateProgressBar();
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
          saveOngoingTasks(tasks);
          renderOngoing();
        };
        h2.appendChild(del);
      }

      ongoingList.appendChild(h2);
    });
    updateProgressBar();
  }

  window.addOngoingTask = () => {
    const text = newOngoingInput.value.trim();
    if (text) {
      tasks.push({ text, done: false, manual: true });
      saveOngoingTasks(tasks);
      newOngoingInput.value = '';
      renderOngoing();
    }
  };

  window.resetOngoingTasks = () => {
    tasks = tasks.map(t => ({ ...t, done: false }));
    saveOngoingTasks(tasks);
    renderOngoing();
  };

  renderOngoing();
}

async function loadOngoingTasks() {
  const ref = doc(db, 'users', userId, 'ongoing', 'tasks');
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data().tasks : [];
}

async function saveOngoingTasks(tasks) {
  const ref = doc(db, 'users', userId, 'ongoing', 'tasks');
  await setDoc(ref, { tasks });
}

/* ---------------- Progress Bar ---------------- */
async function updateProgressBar() {
  const daily = await loadTasks();
  const ongoing = await loadOngoingTasks();
  const total = daily.length + ongoing.length;
  const completed = daily.filter(t => t.done).length + ongoing.filter(t => t.done).length;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  document.getElementById('progress-bar').style.width = `${percent}%`;
  document.getElementById('progress-text').textContent = `${percent}% Complete`;
}

/* ---------------- Quotes ---------------- */
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

/* ---------------- Affirmations ---------------- */
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

/* ---------------- Breathing ---------------- */
function startBreathingBubble() {
  const bubble = document.getElementById('breath-bubble');
  const text = document.getElementById('breath-text');
  const button = document.getElementById('breath-toggle-btn');
  if (!bubble || !text || !button) return;

  let cycle = ["Inhale", "Hold", "Exhale", "Hold"];
  let index = 0;
  let intervalId = null;
  let timeoutId = null;

  function updateText() {
    text.textContent = cycle[index % cycle.length];
    index++;
  }

  function startSession() {
    updateText();
    intervalId = setInterval(updateText, 4000);
    timeoutId = setTimeout(stopSession, 60000);
    button.textContent = 'Stop Breath';
  }

  function stopSession() {
    clearInterval(intervalId);
    clearTimeout(timeoutId);
    text.textContent = 'Inhale';
    button.textContent = 'Start Breath';
  }

  let isRunning = false;
  button.addEventListener('click', () => {
    if (!isRunning) {
      startSession();
    } else {
      stopSession();
    }
    isRunning = !isRunning;
  });
}
