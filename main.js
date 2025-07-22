import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyAZh-tXWVRaoYIuQ9BH6z0upIuExZ8rAGs",
  authDomain: "my-daily-tasks-5a313.firebaseapp.com",
  projectId: "my-daily-tasks-5a313",
  storageBucket: "my-daily-tasks-5a313.appspot.com",
  messagingSenderId: "676679892031",
  appId: "1:676679892031:web:4746c594d8415697394c8a",
  measurementId: "G-7DEQC4CWQH"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const userId = 'djUVi4KmRVfQohInCiM6oVmbYx92';
const yaySound = new Audio('377017__elmasmalo1__notification-pop.wav');
yaySound.volume = 1.0;

onAuthStateChanged(auth, async user => {
  if (!user) await signInAnonymously(auth);
  await displayDailyQuote();
  await initializeAllDays();
});

// Load quote from Firestore
async function displayDailyQuote() {
  const quoteContainer = document.getElementById('quote-container');
  if (!quoteContainer) return;

  try {
    const snapshot = await getDocs(collection(db, 'quotes'));
    const quotes = snapshot.docs
      .map(doc => doc.data())
      .filter(q => typeof q.text === 'string' && typeof q.author === 'string');

    if (quotes.length > 0) {
      const { text, author } = quotes[Math.floor(Math.random() * quotes.length)];
      quoteContainer.innerHTML = `"${text}"<br><span class="author">– ${author}</span>`;
    } else {
      quoteContainer.innerHTML = `"You are strong. Trust the process."<br><span class="author">– Daily Task App</span>`;
    }
  } catch (error) {
    console.error("Error fetching quote:", error);
    quoteContainer.innerHTML = `"You're doing great. Just keep showing up."<br><span class="author">– Daily Task App</span>`;
  }
}

async function initializeAllDays() {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  for (const day of days) {
    const docRef = doc(db, 'users', userId, day, 'default');
    const docSnap = await getDoc(docRef);
    const data = docSnap.exists() ? docSnap.data() : {};

    if (!Array.isArray(data.tasks) || data.tasks.length === 0 || typeof data.tasks[0]?.text !== 'string') {
      const defaultTasks = getDefaultTasksForDay(day).map(text => ({ text, done: false, manual: false }));
      await setDoc(docRef, { tasks: defaultTasks });
    }
  }

  initTaskApp();
}

function getDefaultTasksForDay(day) {
  return ["Example Task 1", "Example Task 2"]; // Customize this for each day if needed
}

function getCurrentDay() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('day') || new Date().toLocaleDateString('en-US', { weekday: 'long' });
}

async function loadTasks() {
  const day = getCurrentDay();
  const docRef = doc(db, 'users', userId, day, 'default');
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data().tasks : [];
}

async function saveTasks(tasks) {
  const day = getCurrentDay();
  await setDoc(doc(db, 'users', userId, day, 'default'), { tasks });
}

function initTaskApp() {
  const taskList = document.getElementById('task-list');
  const newTaskInput = document.getElementById('new-task');

  loadTasks().then(tasks => {
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
          saveTasks(tasks);

          if (checkbox.checked) {
            const emojis = ['🥳', '👏', '✨', '🎉', '🌟', '🔥', '🫶🏼', '💫', '⭐️', '🎊', '💯', '👍'];
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

    window.resetTasks = function () {
      tasks = tasks.map(task => ({ ...task, done: false }));
      saveTasks(tasks);
      renderTasks();
    };

    renderTasks();
  });
}
