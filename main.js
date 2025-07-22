import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

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

const userId = 'djUVi4KmRVfQohInCiM6oVmbYx92';
const yaySound = new Audio('377017__elmasmalo1__notification-pop.wav');
yaySound.volume = 1.0;

// ✅ Run both only after the page fully loads
window.addEventListener('DOMContentLoaded', () => {
  displayDailyQuote();
  initializeAllDays();
});

async function saveTasksForDay(day, tasks) {
  await setDoc(doc(db, 'users', userId, day, 'default'), { tasks });
}

async function initializeAllDays() {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  for (const day of days) {
    const docRef = doc(db, 'users', userId, day, 'default');
    const docSnap = await getDoc(docRef);
    const data = docSnap.exists() ? docSnap.data() : {};

    if (!Array.isArray(data.tasks) || data.tasks.length === 0 || typeof data.tasks[0]?.text !== 'string') {
      const defaultTasks = getDefaultTasksForDay(day).map(text => ({ text, done: false, manual: false }));
      await saveTasksForDay(day, defaultTasks);
    }
  }

  initTaskApp();
}

async function saveTasks(tasks) {
  const day = getCurrentDay();
  await saveTasksForDay(day, tasks);
}

async function loadTasks() {
  const day = getCurrentDay();
  const docRef = doc(db, 'users', userId, day, 'default');
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data().tasks : [];
}

function getCurrentDay() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('day') || new Date().toLocaleDateString('en-US', { weekday: 'long' });
}

async function initTaskApp() {
  const taskList = document.getElementById('task-list');
  const newTaskInput = document.getElementById('new-task');
  let tasks = await loadTasks();

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
    Monday: [...baseTasks, "Work for 5 Hours at Apple", "Call IRS to Setup Payment Plan", "5 Hour Work Day at Apple"],
    Tuesday: [...baseTasks, "Work for 5 Hours at Apple", "5 Hour Work Day at Apple"],
    Wednesday: [...baseTasks, "Pay Bills", "Check on CPAP Supplies", "Order Groceries", "2 PM Therapy Session", "Work on Alchemy Body Werks"],
    Thursday: [...baseTasks, "Work for 5 Hours at Apple", "5 Hour Work Day at Apple"],
    Friday: [...baseTasks, "Take Trash Cans to Curb", "Retrieve Trash Cans from Curb", "Work for 5 Hours at Apple", "5 Hour Work Day at Apple"],
    Saturday: [...baseTasks, "Deep Clean House", "1 PM Soccer", "Laundry", "Yard Work", "Finish MKG540 Module 8 Portfolio Project", "Find Lenovo Charger", "Work on Alchemy Body Werks"],
    Sunday: [...baseTasks, "CSU Homework", "CSU Homework"]
  };
  return extended[day] || baseTasks;
}

// ✅ Fetch and display motivational quote from Firestore with logging
async function displayDailyQuote() {
  const quoteContainer = document.getElementById('quote-container');
  if (!quoteContainer) {
    console.warn("No quote container found in HTML.");
    return;
  }

  try {
    const snapshot = await getDocs(collection(db, 'quotes'));
    const quotes = snapshot.docs.map(doc => doc.data());
    console.log(`✅ Quotes fetched: ${quotes.length}`, quotes);

    if (quotes.length > 0) {
      const randomIndex = Math.floor(Math.random() * quotes.length);
      const { text, author } = quotes[randomIndex];

      if (text && author) {
        quoteContainer.innerHTML = `"${text}"<br><span style="font-size: 0.9em;">– ${author}</span>`;
      } else {
        console.warn("❗ A quote is missing 'text' or 'author'.");
        quoteContainer.textContent = "You are strong. Trust the process.";
      }
    } else {
      console.warn("❗ No quotes found in Firestore.");
      quoteContainer.textContent = "Keep going. Your effort matters.";
    }
  } catch (error) {
    console.error("🔥 Error fetching quote:", error);
    quoteContainer.textContent = "You’re doing great. Just keep showing up.";
  }
}
