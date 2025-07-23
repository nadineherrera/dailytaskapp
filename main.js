import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore, doc, getDoc, setDoc, collection, getDocs
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {
  getAuth, signInAnonymously, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

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
const yaySound = new Audio('377017__elmasmalo1__notification-pop.wav');
yaySound.volume = 1.0;

// === Sign in anonymously ===
signInAnonymously(auth)
  .then(() => {
    onAuthStateChanged(auth, user => {
      if (user) {
        const userId = user.uid;
        initializeAllDays(userId).then(() => {
          initTaskApp(userId);
          displayDailyQuote();
        });
      }
    });
  })
  .catch(error => {
    console.error("Anonymous login error:", error.message);
  });

// === Firestore Logic ===

async function saveTasksForDay(userId, day, tasks) {
  await setDoc(doc(db, 'users', userId, day, 'default'), { tasks });
}

async function initializeAllDays(userId) {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  for (const day of days) {
    const docRef = doc(db, 'users', userId, day, 'default');
    const docSnap = await getDoc(docRef);
    const data = docSnap.exists() ? docSnap.data() : {};

    if (!Array.isArray(data.tasks) || data.tasks.length === 0 || typeof data.tasks[0]?.text !== 'string') {
      const defaultTasks = getDefaultTasksForDay(day).map(text => ({ text, done: false, manual: false }));
      await saveTasksForDay(userId, day, defaultTasks);
    }
  }
}

function getCurrentDay() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('day') || new Date().toLocaleDateString('en-US', { weekday: 'long' });
}

async function loadTasks(userId) {
  const day = getCurrentDay();
  const docRef = doc(db, 'users', userId, day, 'default');
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data().tasks : [];
}

async function initTaskApp(userId) {
  const taskList = document.getElementById('task-list');
  const newTaskInput = document.getElementById('new-task');
  let tasks = await loadTasks(userId);

  function renderTasks() {
    taskList.innerHTML = '';
    tasks.forEach((task, index) => {
      if (task.done) return;

      const h2 = document.createElement('h2');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.done;

      checkbox.onchange = () => {
        tasks[index].done = checkbox.checked;
        saveTasksForDay(userId, getCurrentDay(), tasks);

        if (checkbox.checked) {
          const emojis = ['🥳', '👏', '✨', '🎉', '🌟', '🔥', '🫶🏼', '💫', '⭐', '🎊', '💯', '👍'];
          const emoji = document.createElement('span');
          emoji.className = 'celebration';
          emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
          h2.appendChild(emoji);
          yaySound.currentTime = 0;
          yaySound.play();

          setTimeout(() => {
            emoji.remove();
            renderTasks();
          }, 2200);
        } else {
          renderTasks();
        }
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
          saveTasksForDay(userId, getCurrentDay(), tasks);
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
      saveTasksForDay(userId, getCurrentDay(), tasks);
      newTaskInput.value = '';
      renderTasks();
    }
  };

  window.resetTasks = function () {
    tasks = tasks.map(task => ({ ...task, done: false }));
    saveTasksForDay(userId, getCurrentDay(), tasks);
    renderTasks();
  };

  renderTasks();
}

function getDefaultTasksForDay(day) {
  const baseTasks = [
    "Dream Journal", "Brush Teeth", "Take Medicine", "Take a Shower", "Stretch",
    "Eat Breakfast", "Walk for 30 Minutes", "Eat Lunch", "Eat Dinner",
    "Spend Time With Family & Call Family Members", "15-Minute Clean Up",
    "Learn Spanish", "Check All Email Accounts", "Check Social Media",
    "Strength Train", "Take a Shower", "Stretch", "Read a Book", "Journal",
    "Drink a Gallon of Water Throughout Day", "Update Daily Tasks if Needed"
  ];

  const extended = {
    Monday: [...baseTasks, "Work for 5 Hours at Apple", "Call IRS to Setup Payment Plan"],
    Tuesday: [...baseTasks, "Work for 5 Hours at Apple"],
    Wednesday: [...baseTasks, "Pay Bills", "Check on CPAP Supplies", "Order Groceries", "2 PM Therapy Session", "Work on Alchemy Body Werks"],
    Thursday: [...baseTasks, "Work for 5 Hours at Apple"],
    Friday: [...baseTasks, "Take Trash Cans to Curb", "Retrieve Trash Cans from Curb", "Work for 5 Hours at Apple"],
    Saturday: [...baseTasks, "Deep Clean House", "1 PM Soccer", "Laundry", "Yard Work", "Finish MKG540 Module 8 Portfolio Project", "Find Lenovo Charger", "Work on Alchemy Body Werks"],
    Sunday: [...baseTasks, "CSU Homework", "CSU Homework"]
  };

  return extended[day] || baseTasks;
}

// === Daily Motivational Quote with Per-Day Persistence ===
async function displayDailyQuote() {
  const quoteContainer = document.getElementById('quote-container');
  if (!quoteContainer) return;

  quoteContainer.innerHTML = '';
  quoteContainer.classList.remove('loaded');

  const today = new Date().toISOString().split('T')[0]; // e.g. "2025-07-23"
  const savedQuote = JSON.parse(localStorage.getItem('dailyQuote') || '{}');

  if (savedQuote.date === today && savedQuote.text && savedQuote.author !== undefined) {
    renderQuote(savedQuote.text, savedQuote.author);
    return;
  }

  try {
    const snapshot = await getDocs(collection(db, 'quotes'));
    const quotes = snapshot.docs.map(doc => doc.data());

    if (quotes.length > 0) {
      const randomIndex = Math.floor(Math.random() * quotes.length);
      const { text, author } = quotes[randomIndex];

      localStorage.setItem('dailyQuote', JSON.stringify({ text, author, date: today }));
      renderQuote(text, author);
    } else {
      renderQuote("Keep going. Your effort matters.", "");
    }
  } catch (error) {
    console.error("Error fetching quote:", error);
    renderQuote("You’re doing great. Just keep showing up.", "");
  }

  function renderQuote(text, author) {
    quoteContainer.innerHTML = `
      <div style="font-size: 1.2rem; font-weight: 500;">"${text}"</div>
      ${author ? `<div style="font-size: 0.9rem; margin-top: 0.5rem; color: #666;">– ${author}</div>` : ""}
    `;
    quoteContainer.classList.add('loaded');
  }
}
