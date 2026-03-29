import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
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
const auth = getAuth(app);
const db = getFirestore(app);

// IMPORTANT:
// Rotate your OpenWeather key separately if it was exposed.
// Leaving it in frontend JS means it is still public.
const OPENWEATHER_API_KEY = 'f38e67d9ff7f31e8bfc0ac3f3e82c45e';

const yaySound = new Audio('377017__elmasmalo1__notification-pop.wav');
yaySound.volume = 1.0;

let currentUserId = null;
let dailyTasks = [];
let ongoingTasks = [];
let initialTotalTasks = 0;
let celebrationShown = false;

bootApp();

async function bootApp() {
  try {
    await ensureSignedIn();
    await setupApp();
  } catch (err) {
    console.error('App boot failed:', err);
    showStatusMessage('Unable to start app. Please refresh and try again.');
  }
}

async function ensureSignedIn() {
  return new Promise((resolve, reject) => {
    let settled = false;

    onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          currentUserId = user.uid;
          if (!settled) {
            settled = true;
            resolve(user);
          }
          return;
        }

        const cred = await signInAnonymously(auth);
        currentUserId = cred.user.uid;
        if (!settled) {
          settled = true;
          resolve(cred.user);
        }
      } catch (err) {
        if (!settled) {
          settled = true;
          reject(err);
        }
      }
    });
  });
}

function requireUserId() {
  if (!currentUserId) {
    throw new Error('No authenticated user is available.');
  }
  return currentUserId;
}

function showStatusMessage(message) {
  console.warn(message);
  const weatherBox = document.getElementById('weather');
  if (weatherBox && !weatherBox.innerHTML.trim()) {
    weatherBox.innerHTML = `<p style="color:#999;">${message}</p>`;
  }
}

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
  await loadRandomQuote();
  await loadDailyAffirmation();
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
  const userId = requireUserId();

  const entry = {
    dream: document.getElementById('dream-journal')?.value.trim() || '',
    daily: document.getElementById('daily-journal')?.value.trim() || '',
    gratitude: document.getElementById('gratitudeEntry')?.value.trim() || '',
    mood: document.getElementById('mood')?.value || ''
  };

  try {
    const ref = doc(db, 'users', userId, 'journals', day);
    await setDoc(ref, entry, { merge: true });
    alert('Journal entry saved!');
  } catch (err) {
    console.error('Error saving journal:', err);
    alert('Could not save journal entry.');
  }
}

async function loadJournalEntries() {
  const day = getEffectiveDay();
  const userId = requireUserId();

  try {
    const ref = doc(db, 'users', userId, 'journals', day);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const data = snap.data();
      const dream = document.getElementById('dream-journal');
      const daily = document.getElementById('daily-journal');
      const gratitude = document.getElementById('gratitudeEntry');
      const mood = document.getElementById('mood');

      if (dream) dream.value = data.dream || '';
      if (daily) daily.value = data.daily || '';
      if (gratitude) gratitude.value = data.gratitude || '';
      if (mood) mood.value = data.mood || '';
    }
  } catch (err) {
    console.error('Failed to load journal:', err);
  }
}

/* ---------------- Firestore Init ---------------- */
async function ensureAllDaysInitialized() {
  const userId = requireUserId();
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  for (const day of days) {
    const dailyRef = doc(db, 'users', userId, day, 'tasks');
    const dailySnap = await getDoc(dailyRef);

    if (!dailySnap.exists()) {
      const defaults = getDefaultTasksForDay(day).map(text => ({
        text,
        done: false,
        manual: false
      }));
      await setDoc(dailyRef, { tasks: defaults }, { merge: true });
    }
  }

  const ongoingRef = doc(db, 'users', userId, 'ongoing', 'tasks');
  const ongoingSnap = await getDoc(ongoingRef);

  if (!ongoingSnap.exists()) {
    await setDoc(ongoingRef, { tasks: [] }, { merge: true });
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

/* ---------------- Progress (Circular Ring) ---------------- */
function updateProgressBar() {
  const totalRemaining =
    dailyTasks.filter(t => !t.done).length +
    ongoingTasks.filter(t => !t.done).length;

  const completed = initialTotalTasks - totalRemaining;
  const percent = initialTotalTasks > 0
    ? Math.round((completed / initialTotalTasks) * 100)
    : 0;

  if (typeof window.updateProgressCircle === 'function') {
    window.updateProgressCircle(percent);
  } else {
    const label = document.getElementById('progress-text');
    if (label) label.textContent = `${percent}% Complete`;
  }

  if (percent === 100 && !celebrationShown) {
    celebrationShown = true;
    showCelebration();
  }
}

/* ---------------- Daily Tasks ---------------- */
async function initTaskApp() {
  dailyTasks = await loadTasks();
  ongoingTasks = await loadOngoingTasks();
  initialTotalTasks = dailyTasks.length + ongoingTasks.length;
  renderTasks();
}

function renderTasks() {
  const taskList = document.getElementById('task-list');
  if (!taskList) return;

  taskList.innerHTML = '';

  dailyTasks
    .filter(task => !task.done)
    .forEach(task => {
      const h2 = document.createElement('h2');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.done;

      checkbox.onchange = async () => {
        const indexInArray = dailyTasks.findIndex(t => t.text === task.text);
        if (indexInArray === -1) return;

        dailyTasks[indexInArray].done = checkbox.checked;
        await saveTasks(dailyTasks);

        if (checkbox.checked) {
          yaySound.play().catch(() => {});
          const emoji = document.createElement('span');
          emoji.textContent = '🎉';
          emoji.className = 'celebration-emoji';
          h2.appendChild(emoji);
          setTimeout(() => renderTasks(), 800);
        }

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

window.addTask = async () => {
  const input = document.getElementById('new-task');
  const text = input?.value.trim();

  if (text) {
    dailyTasks.push({ text, done: false, manual: true });
    await saveTasks(dailyTasks);

    if (input) input.value = '';
    initialTotalTasks = dailyTasks.length + ongoingTasks.length;
    renderTasks();
  }
};

window.resetTasks = async () => {
  dailyTasks = dailyTasks.map(t => ({ ...t, done: false }));
  await saveTasks(dailyTasks);
  celebrationShown = false;
  initialTotalTasks = dailyTasks.length + ongoingTasks.length;
  renderTasks();
};

/* ---------------- Ongoing Tasks ---------------- */
async function initOngoingTasks() {
  ongoingTasks = await loadOngoingTasks();
  initialTotalTasks = dailyTasks.length + ongoingTasks.length;
  renderOngoing();
}

function renderOngoing() {
  const ongoingList = document.getElementById('ongoing-task-list');
  if (!ongoingList) return;

  ongoingList.innerHTML = '';

  ongoingTasks
    .filter(task => !task.done)
    .forEach(task => {
      const h2 = document.createElement('h2');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.done;

      checkbox.onchange = async () => {
        const indexInArray = ongoingTasks.findIndex(t => t.text === task.text);
        if (indexInArray === -1) return;

        ongoingTasks[indexInArray].done = checkbox.checked;
        await saveOngoingTasks(ongoingTasks);

        if (checkbox.checked) {
          yaySound.play().catch(() => {});
          const emoji = document.createElement('span');
          emoji.textContent = '🎉';
          emoji.className = 'celebration-emoji';
          h2.appendChild(emoji);
          setTimeout(() => renderOngoing(), 800);
        }

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

window.addOngoingTask = async () => {
  const input = document.getElementById('new-ongoing-task');
  const text = input?.value.trim();

  if (text) {
    ongoingTasks.push({ text, done: false, manual: true });
    await saveOngoingTasks(ongoingTasks);

    if (input) input.value = '';
    initialTotalTasks = dailyTasks.length + ongoingTasks.length;
    renderOngoing();
  }
};

window.resetOngoingTasks = async () => {
  ongoingTasks = ongoingTasks.map(t => ({ ...t, done: false }));
  await saveOngoingTasks(ongoingTasks);
  celebrationShown = false;
  initialTotalTasks = dailyTasks.length + ongoingTasks.length;
  renderOngoing();
};

/* ---------------- Firestore Helpers ---------------- */
async function loadTasks() {
  const userId = requireUserId();
  const ref = doc(db, 'users', userId, getEffectiveDay(), 'tasks');
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data().tasks || [] : [];
}

async function saveTasks(tasks) {
  const userId = requireUserId();
  const ref = doc(db, 'users', userId, getEffectiveDay(), 'tasks');
  await setDoc(ref, { tasks }, { merge: true });
}

async function loadOngoingTasks() {
  const userId = requireUserId();
  const ref = doc(db, 'users', userId, 'ongoing', 'tasks');
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data().tasks || [] : [];
}

async function saveOngoingTasks(tasks) {
  const userId = requireUserId();
  const ref = doc(db, 'users', userId, 'ongoing', 'tasks');
  await setDoc(ref, { tasks }, { merge: true });
}

/* ---------------- Celebration ---------------- */
function showCelebration() {
  for (let i = 0; i < 30; i++) {
    const emoji = document.createElement('div');
    emoji.textContent = ['🎉', '✨', '🌟', '🥳'][Math.floor(Math.random() * 4)];
    emoji.style.position = 'fixed';
    emoji.style.left = Math.random() * 100 + 'vw';
    emoji.style.top = '-2rem';
    emoji.style.fontSize = '1.5rem';
    emoji.style.animation = `fall ${Math.random() * 3 + 2}s linear forwards`;
    document.body.appendChild(emoji);
    setTimeout(() => emoji.remove(), 5000);
  }

  yaySound.play().catch(() => {});
}

const style = document.createElement('style');
style.textContent = `
@keyframes fall {
  to { transform: translateY(100vh); opacity: 0; }
}`;
document.head.appendChild(style);

/* ---------------- Quotes ---------------- */
async function loadRandomQuote() {
  const box = document.getElementById('quote-box');
  if (!box) return;

  try {
    const snap = await getDocs(collection(db, 'quotes'));
    const quotes = snap.docs.map(item => item.data());
    const q = quotes[Math.floor(Math.random() * quotes.length)];

    box.textContent = q
      ? \`"\${q.text}" — \${q.author || 'Unknown'}\`
      : 'Stay motivated.';

    box.classList.add('visible');
  } catch (err) {
    console.error('Could not load quote:', err);
    box.textContent = 'Could not load quote.';
  }
}

/* ---------------- Affirmations ---------------- */
async function loadDailyAffirmation() {
  const box = document.getElementById('affirmation-box');
  if (!box) return;

  const today = getEffectiveDay().toLowerCase();

  try {
    const ref = doc(db, 'affirmations', today);
    const snap = await getDoc(ref);

    box.textContent = snap.exists()
      ? `🌿 Affirmation: ${snap.data().text}`
      : '🌿 No affirmation for today.';

    box.classList.add('visible');
  } catch (err) {
    console.error('Unable to load affirmation:', err);
    box.textContent = '🌿 Unable to load affirmation.';
  }
}

/* ---------------- Weather ---------------- */
function getWeather() {
  const weatherEl = document.getElementById('weather');
  if (!weatherEl) return;

  if (!OPENWEATHER_API_KEY || OPENWEATHER_API_KEY === 'REPLACE_WITH_YOUR_NEW_OPENWEATHER_KEY') {
    weatherEl.innerHTML = `<p style="color:#999;">Weather unavailable</p>`;
    return;
  }

  if (!navigator.geolocation) {
    weatherEl.innerHTML = `<p style="color:#999;">Weather unavailable</p>`;
    return;
  }

  navigator.geolocation.getCurrentPosition(
    successWeather,
    () => {
      weatherEl.innerHTML = `<p style="color:#999;">Weather unavailable</p>`;
    }
  );
}

function successWeather(position) {
  const weatherEl = document.getElementById('weather');
  if (!weatherEl) return;

  const lat = position.coords.latitude;
  const lon = position.coords.longitude;

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${OPENWEATHER_API_KEY}`;

  fetch(url)
    .then(response => response.json())
    .then(data => {
      if (!data || !data.main || !data.weather || !data.weather[0]) {
        throw new Error('Unexpected weather response.');
      }

      const city = data.name || 'Your Location';
      const temp = Math.round(data.main.temp);
      const feelsLike = Math.round(data.main.feels_like);
      const desc = data.weather[0].description;
      const humidity = data.main.humidity;
      const weatherMain = data.weather[0].main;

      let weatherEmoji = '🌡️';
      switch ((weatherMain || '').toLowerCase()) {
        case 'clear':
          weatherEmoji = '☀️';
          break;
        case 'clouds':
          weatherEmoji = '🌤️';
          break;
        case 'rain':
        case 'drizzle':
          weatherEmoji = '🌧️';
          break;
        case 'thunderstorm':
          weatherEmoji = '⛈️';
          break;
        case 'snow':
          weatherEmoji = '❄️';
          break;
        case 'mist':
        case 'fog':
        case 'haze':
          weatherEmoji = '🌫️';
          break;
        default:
          weatherEmoji = '🌡️';
      }

      weatherEl.innerHTML = `
        <div style="font-size: 2rem; margin-bottom: 0.25rem;">${weatherEmoji}</div>
        <div class="temp">${city}: ${temp}°F</div>
        <div class="desc">${desc.charAt(0).toUpperCase() + desc.slice(1)}</div>
        <div>Feels like: ${feelsLike}°F • Humidity: ${humidity}%</div>
      `;
    })
    .catch(err => {
      console.error('Weather request failed:', err);
      weatherEl.innerHTML = `<p style="color:#999;">Weather unavailable</p>`;
    });
}

/* ---------------- Breathing ---------------- */
function startBreathingBubble() {
  const bubble = document.getElementById('breath-bubble');
  const text = document.getElementById('breath-text');
  const button = document.getElementById('breath-toggle-btn');

  if (!bubble || !text || !button) return;

  let phase = 'Inhale';
  let intervalId = null;

  function updateText() {
    if (phase === 'Inhale') {
      text.textContent = 'Breathe in for 5 to 6 seconds';
      bubble.classList.add('breathe-in');
      bubble.classList.remove('breathe-out');
      phase = 'Exhale';
    } else {
      text.textContent = 'Breathe out for 5 to 6 seconds';
      bubble.classList.add('breathe-out');
      bubble.classList.remove('breathe-in');
      phase = 'Inhale';
    }
  }

  button.addEventListener('click', () => {
    if (!intervalId) {
      updateText();
      intervalId = setInterval(updateText, 5500);
      button.textContent = 'Stop';
    } else {
      clearInterval(intervalId);
      intervalId = null;
      text.textContent = 'Resume';
      bubble.classList.remove('breathe-in', 'breathe-out');
      button.textContent = 'Start';
    }
  });
}
