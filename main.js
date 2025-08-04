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
    if (!dailySnap.exists() || !Array.isArray(dailySnap.d
