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

let initialTotalTasks = 0; // ✅ store total from start
let completedTasksCount = 0; // ✅ track how many completed so far

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
  getWeather();

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
  const entry = {
    dream: document.getElementById('dream-journal')?.value.trim() || '',
    daily: document.getElementById('daily-journal')?.value.trim() || '',
    gratitude: document.getElementById('gratitudeEntry')?.value.trim() || '',
    mood: document.getElementById('mood')?.value || ''
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
  try {
    const ref = doc(db, 'users', userId, 'journals', day);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      document.getElementById('dream-journal').value = data.dream || '';
      document.getElementById('daily-journal').value = data.daily || '';
      document.getElementById('gratitudeEntry').value = data.gratitude || '';
      document.getElementById('mood').value = data.mood || '';
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
    if (!dailySnap.exists()) {
      const defaults = getDefaultTasksForDay(day).map(text => ({ text, done: false, manual: false }));
      await setDoc(dailyRef, { tasks: defaults });
    }
  }
  const ongoingRef = doc(db, 'users', userId, 'ongoing', 'tasks');
  const ongoingSnap = await getDoc(ongoingRef);
  if (!ongoingSnap.exists()) {
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
  let tasks = await loadTasks();

  initialTotalTasks += tasks.length; // ✅ set initial total ONCE

  function renderTasks() {
    taskList.innerHTML = '';
    tasks.forEach((task, i) => {
      const h2 = document.createElement('h2');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.done;

      checkbox.onchange = async () => {
        if (!tasks[i].done) {
          completedTasksCount++; // ✅ only count once
        }
        tasks[i].done = true;
        await saveTasks(tasks);

        yaySound.play();
        const emoji = document.createElement('span');
        emoji.textContent = '🎉';
        emoji.className = 'celebration-emoji';
        h2.appendChild(emoji);

        setTimeout(() => {
          tasks.splice(i, 1); // ✅ remove from list visually
          saveTasks(tasks);
          renderTasks();
        }, 800);

        updateProgressBar();
      };

      const span = document.createElement('span');
      span.textContent = task.text;
      h2.appendChild(checkbox);
      h2.appendChild(span);
      taskList.appendChild(h2);
    });
    updateProgressBar();
  }

  window.addTask = () => {
    const text = document.getElementById('new-task').value.trim();
    if (text) {
      tasks.push({ text, done: false, manual: true });
      initialTotalTasks++; // ✅ increase total
      saveTasks(tasks);
      document.getElementById('new-task').value = '';
      renderTasks();
    }
  };

  window.resetTasks = () => {
    tasks = getDefaultTasksForDay(getEffectiveDay()).map(text => ({ text, done: false, manual: false }));
    initialTotalTasks = tasks.length;
    completedTasksCount = 0;
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
  const ref = doc(db, 'users', userId, getEffectiveDay(), 'tasks');
  await setDoc(ref, { tasks });
}

/* ---------------- Ongoing Tasks ---------------- */
async function initOngoingTasks() {
  const ongoingList = document.getElementById('ongoing-task-list');
  let tasks = await loadOngoingTasks();

  initialTotalTasks += tasks.length; // ✅ include ongoing in total

  function renderOngoing() {
    ongoingList.innerHTML = '';
    tasks.forEach((task, i) => {
      const h2 = document.createElement('h2');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.done;

      checkbox.onchange = async () => {
        if (!tasks[i].done) {
          completedTasksCount++;
        }
        tasks[i].done = true;
        await saveOngoingTasks(tasks);
        updateProgressBar();
      };

      const span = document.createElement('span');
      span.textContent = task.text;
      h2.appendChild(checkbox);
      h2.appendChild(span);
      ongoingList.appendChild(h2);
    });
    updateProgressBar();
  }

  window.addOngoingTask = () => {
    const text = document.getElementById('new-ongoing-task').value.trim();
    if (text) {
      tasks.push({ text, done: false, manual: true });
      initialTotalTasks++;
      saveOngoingTasks(tasks);
      document.getElementById('new-ongoing-task').value = '';
      renderOngoing();
    }
  };

  window.resetOngoingTasks = () => {
    tasks = tasks.map(t => ({ ...t, done: false }));
    completedTasksCount = 0;
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
function updateProgressBar() {
  const percent = initialTotalTasks ? Math.round((completedTasksCount / initialTotalTasks) * 100) : 0;
  document.getElementById('progress-bar').style.width = `${percent}%`;
  document.getElementById('progress-text').textContent = `${percent}% Complete`;
}

/* ---------------- Quotes ---------------- */
async function loadRandomQuote() {
  const box = document.getElementById('quote-box');
  try {
    const snap = await getDocs(collection(db, 'quotes'));
    const quotes = snap.docs.map(doc => doc.data());
    const q = quotes[Math.floor(Math.random() * quotes.length)];
    box.textContent = q ? `"${q.text}" — ${q.author || 'Unknown'}` : "Stay motivated.";
    box.classList.add('visible');
  } catch {
    box.textContent = "Could not load quote.";
  }
}

/* ---------------- Affirmations ---------------- */
async function loadDailyAffirmation() {
  const box = document.getElementById('affirmation-box');
  const today = getEffectiveDay().toLowerCase();
  try {
    const ref = doc(db, 'affirmations', today);
    const snap = await getDoc(ref);
    box.textContent = snap.exists()
      ? `🌿 Affirmation: ${snap.data().text}`
      : "🌿 No affirmation for today.";
    box.classList.add('visible');
  } catch {
    box.textContent = "🌿 Unable to load affirmation.";
  }
}

/* ---------------- Weather ---------------- */
function getWeather() {
  if (!navigator.geolocation) {
    document.getElementById('weather').innerHTML = `<p style="color:#999;">Weather unavailable</p>`;
    return;
  }
  navigator.geolocation.getCurrentPosition(successWeather, () => {
    document.getElementById('weather').innerHTML = `<p style="color:#999;">Weather unavailable</p>`;
  });
}

function successWeather(position) {
  const lat = position.coords.latitude;
  const lon = position.coords.longitude;
  const apiKey = 'c30f91e272b6b6c6d468994f7abfdabe';
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`;

  fetch(url)
    .then(response => response.json())
    .then(data => {
      const city = data.name || "Your Location";
      const temp = Math.round(data.main.temp);
      const feelsLike = Math.round(data.main.feels_like);
      const desc = data.weather[0].description;
      const humidity = data.main.humidity;
      const weatherMain = data.weather[0].main;

      let weatherEmoji = "🌡️";
      switch (weatherMain.toLowerCase()) {
        case "clear": weatherEmoji = "☀️"; break;
        case "clouds": weatherEmoji = "🌤️"; break;
        case "rain":
        case "drizzle": weatherEmoji = "🌧️"; break;
        case "thunderstorm": weatherEmoji = "⛈️"; break;
        case "snow": weatherEmoji = "❄️"; break;
        case "mist":
        case "fog":
        case "haze": weatherEmoji = "🌫️"; break;
        default: weatherEmoji = "🌡️";
      }

      document.getElementById('weather').innerHTML = `
        <div style="font-size: 2rem; margin-bottom: 0.25rem;">${weatherEmoji}</div>
        <div class="temp">${city}: ${temp}°F</div>
        <div class="desc">${desc.charAt(0).toUpperCase() + desc.slice(1)}</div>
        <div>Feels like: ${feelsLike}°F • Humidity: ${humidity}%</div>
      `;
    })
    .catch(() => {
      document.getElementById('weather').innerHTML = `<p style="color:#999;">Weather unavailable</p>`;
    });
}

/* ---------------- Breathing ---------------- */
function startBreathingBubble() {
  const bubble = document.getElementById('breath-bubble');
  const text = document.getElementById('breath-text');
  const button = document.getElementById('breath-toggle-btn');

  let cycle = ["Inhale", "Hold", "Exhale", "Hold"];
  let index = 0;
  let intervalId = null;

  function updateText() {
    text.textContent = `${cycle[index % cycle.length]} for 4`;
    index++;
    bubble.classList.toggle('breathe-animation');
  }

  button.addEventListener('click', () => {
    if (!intervalId) {
      updateText();
      intervalId = setInterval(updateText, 4000);
      button.textContent = 'Stop Breath';
    } else {
      clearInterval(intervalId);
      intervalId = null;
      bubble.classList.remove('breathe-animation');
      button.textContent = 'Start Breath';
    }
  });
}
