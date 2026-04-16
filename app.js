import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, query, getDocs, where, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCHyS_MZhSLPDmBMNfSEx69tzRWhLMQ9Sc",
  authDomain: "tora-app-5781c.firebaseapp.com",
  projectId: "tora-app-5781c",
  storageBucket: "tora-app-5781c.firebasestorage.app",
  messagingSenderId: "278076130279",
  appId: "1:278076130279:web:01b37888c5b9d069ae7342"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// רשימת פרשות בסיסית (בפרויקט אמיתי נמשוך מ-Hebcal API)
const parashot = ["בראשית", "נח", "לך לך", "וירא", "חיי שרה", "תולדות", "ויצא", "וישלח", "וישב", "מקץ", "ויגש", "ויחי"];

// אלמנטים
const elements = {
    auth: document.getElementById('auth-section'),
    wizard: document.getElementById('wizard-section'),
    app: document.getElementById('app-section'),
    loginBtn: document.getElementById('login-btn'),
    logoutBtn: document.getElementById('logout-btn'),
    userName: document.getElementById('user-name-display'),
    barMitzvahSelect: document.getElementById('bar-mitzvah-select'),
    readingsBody: document.getElementById('readings-body')
};

// --- לוגיקת אתחול ומצב משתמש ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().setupComplete) {
            showSection('app');
            elements.userName.textContent = `שלום, ${user.displayName}`;
            loadCommunityData();
        } else {
            initWizard();
            showSection('wizard');
        }
    } else {
        showSection('auth');
    }
});

function showSection(id) {
    elements.auth.classList.add('hidden');
    elements.wizard.classList.add('hidden');
    elements.app.classList.add('hidden');
    document.getElementById(`${id}-section`).classList.remove('hidden');
}

// --- לוגיקת WIZARD ---
function initWizard() {
    parashot.forEach(p => {
        let opt = document.createElement('option');
        opt.value = p; opt.textContent = p;
        elements.barMitzvahSelect.appendChild(opt);
    });
}

document.getElementById('next-1').onclick = () => {
    document.getElementById('step-1').classList.add('hidden');
    document.getElementById('step-2').classList.remove('hidden');
};

document.getElementById('save-wizard').onclick = async () => {
    const user = auth.currentUser;
    const selectedChumashim = Array.from(document.querySelectorAll('#chumash-list input:checked')).map(i => i.value);
    
    await setDoc(doc(db, "users", user.uid), {
        name: user.displayName,
        email: user.email,
        barMitzvah: elements.barMitzvahSelect.value,
        knownChumashim: selectedChumashim,
        setupComplete: true,
        isAdmin: user.email === 'rb077858@gmail.com'
    });
    location.reload();
};

// --- לוגיקת דשבורד וטבלה ---
async function loadCommunityData() {
    // כאן בעתיד נמשוך את הנתונים מ-Firestore
    // כרגע נציג שורת דוגמה כדי לראות את העיצוב
    const dummyData = [
        { date: "20/04/2026", parasha: "תזריע", reader: "ראם בירנבאום", status: 2 },
        { date: "23/04/2026", parasha: "מצורע", reader: "פנוי", status: 0 }
    ];
    
    renderTable(dummyData);
}

function renderTable(data) {
    elements.readingsBody.innerHTML = '';
    data.forEach(item => {
        const row = document.createElement('tr');
        const statusClass = item.status === 1 ? 'status-low' : item.status === 2 ? 'status-med' : 'status-high';
        const statusText = ["טרם התחיל", "בתהליך", "מוכן!", "פנוי"][item.status] || "פנוי";
        
        row.innerHTML = `
            <td>${item.date}</td>
            <td>${item.parasha}</td>
            <td>${item.reader}</td>
            <td><span class="badge ${statusClass}">${statusText}</span></td>
        `;
        elements.readingsBody.appendChild(row);
    });
}

elements.loginBtn.onclick = () => signInWithPopup(auth, provider);
elements.logoutBtn.onclick = () => signOut(auth);
