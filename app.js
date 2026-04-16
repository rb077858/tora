import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, query, getDocs, updateDoc, orderBy, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// רשימת פרשות מלאה
const parashot = [
    "בראשית", "נח", "לך לך", "וירא", "חיי שרה", "תולדות", "ויצא", "וישלח", "וישב", "מקץ", "ויגש", "ויחי",
    "שמות", "וארא", "בא", "בשלח", "יתרו", "משפטים", "תרומה", "תצוה", "כי תשא", "ויקהל", "פקודי",
    "ויקרא", "צו", "שמיני", "תזריע", "מצורע", "אחרי מות", "קדושים", "אמור", "בהר", "בחוקותי",
    "במדבר", "נשא", "בהעלותך", "שלח", "קרח", "חקת", "בלק", "פנחס", "מטות", "מסעי",
    "דברים", "ואתחנן", "עקב", "ראה", "שופטים", "כי תצא", "כי תבוא", "נצבים", "וילך", "האזינו", "וזאת הברכה"
];

// הפעלת Persistence
enableIndexedDbPersistence(db).catch(() => {});

// --- ניהול תצוגה ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists() && userDoc.data().setupComplete) {
                showSection('app');
                document.getElementById('user-name-display').textContent = user.displayName;
                loadDashboard();
            } else {
                showSection('wizard');
                populateParashot();
            }
        } catch (e) {
            showSection('app');
            loadDashboard();
        }
    } else {
        showSection('auth');
    }
});

function showSection(id) {
    document.querySelectorAll('.container').forEach(c => c.classList.add('hidden'));
    document.getElementById(`${id}-section`).classList.remove('hidden');
    document.body.style.alignItems = (id === 'app') ? 'flex-start' : 'center';
    if (id === 'app') document.body.style.paddingTop = '40px';
}

function populateParashot() {
    const sel = document.getElementById('bar-mitzvah-select');
    if (sel.children.length > 1) return;
    parashot.forEach(p => {
        let opt = document.createElement('option');
        opt.value = p; opt.textContent = p;
        sel.appendChild(opt);
    });
}

// לוגיקת Wizard
document.getElementById('next-1').onclick = () => {
    document.getElementById('step-1').classList.add('hidden');
    document.getElementById('step-2').classList.remove('hidden');
};

document.getElementById('save-wizard').onclick = async () => {
    const user = auth.currentUser;
    const known = Array.from(document.querySelectorAll('#chumash-list input:checked')).map(i => i.value);
    await setDoc(doc(db, "users", user.uid), {
        name: user.displayName,
        email: user.email,
        barMitzvah: document.getElementById('bar-mitzvah-select').value,
        knownChumashim: known,
        setupComplete: true,
        isAdmin: user.email === 'rb077858@gmail.com'
    });
    location.reload();
};

// --- דשבורד ---
async function loadDashboard() {
    const q = query(collection(db, "readings"), orderBy("date", "asc"));
    const snap = await getDocs(q);
    const readings = [];
    snap.forEach(d => readings.push({ id: d.id, ...d.data() }));
    renderTable(readings);
    renderPersonalCard(readings);
}

function renderTable(data) {
    const body = document.getElementById('readings-body');
    body.innerHTML = '';
    const now = new Date();

    data.forEach(item => {
        const dateObj = new Date(item.date);
        const diffHours = (dateObj - now) / (1000 * 3600);
        
        let sClass = 'status-high', sText = "מוכן", canJoin = false;

        if (!item.reader || item.reader === "פנוי") {
            sClass = 'status-low'; sText = "פנוי"; canJoin = true;
        } else if (item.status < 3 && diffHours < 24) {
            sClass = 'status-low'; sText = "דגל אדום";
        } else if (item.status < 3) {
            sClass = 'status-med'; sText = "בתהליך";
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.date.split('-').reverse().join('/')}</td>
            <td><strong>${item.parasha}</strong></td>
            <td>${item.reader || '-'}</td>
            <td><span class="badge ${sClass}">${sText}</span></td>
            <td>${canJoin ? `<button class="secondary-btn" onclick="assignMe('${item.id}')">שבץ אותי</button>` : ''}</td>
        `;
        body.appendChild(row);
    });
}

window.assignMe = async (id) => {
    await updateDoc(doc(db, "readings", id), {
        reader: auth.currentUser.displayName,
        readerId: auth.currentUser.uid,
        status: 1
    });
    loadDashboard();
};

function renderPersonalCard(data) {
    const my = data.find(r => r.readerId === auth.currentUser.uid && new Date(r.date) >= new Date().setHours(0,0,0,0));
    const container = document.getElementById('personal-card');
    if (!my) {
        container.innerHTML = "<p style='color:var(--text-muted)'>אין לך קריאה קרובה.</p>";
        return;
    }
    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
                <span style="color:var(--accent)">הקריאה שלך:</span>
                <h2 style="margin:5px 0">${my.parasha}</h2>
                <small>${my.date}</small>
            </div>
            <select class="full-input" style="width:auto; margin:0" onchange="updateStatus('${my.id}', this.value)">
                <option value="1" ${my.status==1?'selected':''}>⏳ טרם התחלתי</option>
                <option value="2" ${my.status==2?'selected':''}>📖 בתהליך למידה</option>
                <option value="3" ${my.status==3?'selected':''}>✅ מוכן!</option>
            </select>
        </div>
    `;
}

window.updateStatus = async (id, val) => {
    await updateDoc(doc(db, "readings", id), { status: parseInt(val) });
    loadDashboard();
};

document.getElementById('login-btn').onclick = () => signInWithPopup(auth, provider);
document.getElementById('logout-btn').onclick = () => signOut(auth);
