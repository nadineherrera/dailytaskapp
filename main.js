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

signInAnonymously(auth)
  .then(() => {
    onAuthStateChanged(auth, user => {
      if (user) {
        const userId = user.uid;
        initializeAllDays(userId).then(() => {
          initTaskApp(userId);
          displayDailyCard(); // 🚀 NEW
        });
      }
    });
  })
  .catch(error => {
    console.error("Anonymous login error:", error.message);
  });

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

// 🧠 Minimal quote + affirmation in one card
async function displayDailyCard() {
  const container = document.getElementById('quote-container');
  if (!container) return;

  container.innerHTML = '';
  container.classList.remove('loaded');

  const today = new Date().toISOString().split('T')[0];
  const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

  const saved = JSON.parse(localStorage.getItem('dailyCard') || '{}');
  if (saved.date === today && saved.quote && saved.affirmation) {
    renderCard(saved.quote, saved.author, saved.affirmation);
    return;
  }

  try {
    const quoteSnap = await getDocs(collection(db, 'quotes'));
    const quoteList = quoteSnap.docs.map(doc => doc.data());
    const { text: quote, author } = quoteList[Math.floor(Math.random() * quoteList.length)];

    const affirmationSnap = await getDoc(doc(db, 'affirmations', dayName));
    const affirmation = affirmationSnap.exists() ? affirmationSnap.data().text : "";

    localStorage.setItem('dailyCard', JSON.stringify({ date: today, quote, author, affirmation }));
    renderCard(quote, author, affirmation);
  } catch (err) {
    console.error("Card fetch error:", err);
    renderCard("You’re doing great. Just keep showing up.", "", "I am enough. I am doing my best.");
  }

  function renderCard(quote, author, affirmation) {
    container.innerHTML = `
      <div style="font-size: 1.15rem; font-weight: 500; margin-bottom: 0.5rem;">"${quote}"</div>
      ${author ? `<div style="font-size: 0.9rem; color: #666; margin-bottom: 1rem;">– ${author}</div>` : ""}
      <div style="font-size: 1rem; font-weight: 400; font-style: normal; color: #845EC2;">${affirmation}</div>
    `;
    container.classList.add('loaded');
  }
}
