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

window.addEventListener('DOMContentLoaded', () => {
  displayDailyQuote();
  initializeAllDays();
});

// 🧠 Quote Display Logic
async function displayDailyQuote() {
  const quoteContainer = document.getElementById('quote-container');
  if (!quoteContainer) return;

  try {
    const snapshot = await getDocs(collection(db, 'quotes'));
    const quotes = snapshot.docs.map(doc => doc.data()).filter(q => q.text && q.author);

    if (quotes.length > 0) {
      const { text, author } = quotes[Math.floor(Math.random() * quotes.length)];
      quoteContainer.innerHTML = `
        <span class="author">📝 ${author}</span><br/>
        <q>${text}</q>
      `;
    } else {
      showFallbackQuote(quoteContainer);
    }
  } catch (error) {
    console.error("⚠️ Error loading quotes:", error);
    showFallbackQuote(quoteContainer);
  }
}

function showFallbackQuote(container) {
  container.innerHTML = `
    <span class="author">– Daily Task App</span><br/>
    <q>Keep going. Your effort matters.</q>
  `;
}
