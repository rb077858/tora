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

// אתחול
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// הפעלת מצב אופליין (מונע את השגיאה שקיבלת במקרה של ניתוק רגעי)
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.warn("Multiple tabs open, persistence can only be enabled in one tab at a time.");
    } else if (err.code == 'unimplemented') {
        console.warn("The current browser does not support all of the features required to enable persistence");
    }
});

const parashot = ["בראשית", "נח", "לך לך", "וירא", "חיי שרה", "תולדות", "ויצא", "וישלח", "וישב", "מקץ", "ויגש", "ויחי", "שמות", "וארא", "בא", "בשלח", "יתרו", "משפטים", "תרומה", "תצוה", "כי תשא", "ויקהל", "פקודי"];

// --- ניהול מצבי תצוגה ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists() && userDoc.data().setupComplete) {
                showSection('app');
                document.getElementById('user-name-display').textContent = `שלום, ${user.displayName}`;
                loadDashboard();
            } else {
                showSection('wizard');
                populateParashot();
            }
        } catch (error) {
            console.error("שגיאה בגישה למסד הנתונים:", error);
            // במקרה של שגיאת חיבור, ננסה להציג את הדשבורד עם מה שיש ב-Cache
            showSection('app');
            loadDashboard();
        }
    } else {
        showSection('auth');
    }
});

function showSection(id) {
    ['auth', 'wizard', 'app'].forEach(s => {
        const el = document.getElementById(`${s}-section`);
        if (el) el.classList.add('hidden');
    });
    const target = document.getElementById(`${id}-section`);
    if (target) target.classList.remove('hidden');
}

// --- Wizard ---
function populateParashot() {
    const sel = document.getElementById('bar-mitzvah-select');
    if (!sel || sel.children.length > 0) return;
    parashot.forEach(p => {
        let opt = document.createElement('option');
        opt.value = p; opt.textContent = p;
        sel.appendChild(opt);
    });
}

document.getElementById('next-1').onclick = () => {
    document.getElementById('step-1').classList.add('hidden');
    document.getElementById('step-2').classList.remove('hidden');
};

document.getElementById('save-wizard').onclick = async () => {
    const user = auth.currentUser;
    const known = Array.from(document.querySelectorAll('#chumash-list input:checked')).map(i => i.value);
    try {
        await setDoc(doc(db, "users", user.uid), {
            name: user.displayName,
            email: user.email,
            barMitzvah: document.getElementById('bar-mitzvah-select').value,
            knownChumashim: known,
            setupComplete: true,
            isAdmin: user.email === 'rb077858@gmail.com'
        });
        location.reload();
    } catch (e) {
        alert("שגיאה בשמירת הנתונים. וודא שיש חיבור אינטרנט.");
    }
};

// --- לוגיקה עסקית ודשבורד ---
async function loadDashboard() {
    try {
        const q = query(collection(db, "readings"), orderBy("date", "asc"));
        const snap = await getDocs(q);
        const readings = [];
        snap.forEach(d => readings.push({ id: d.id, ...d.data() }));

        renderTable(readings);
        renderPersonalCard(readings);
    } catch (e) {
        console.error("לא ניתן לטעון את לוח הקריאות:", e);
    }
}

function renderTable(data) {
    const body = document.getElementById('readings-body');
    if (!body) return;
    body.innerHTML = '';
    const now = new Date();

    data.forEach(item => {
        const dateObj = new Date(item.date);
        const diffHours = (dateObj - now) / (1000 * 3600);
        
        let statusClass = 'status-high';
        let statusText = "מוכן";
        let canJoin = false;

        if (!item.reader || item.reader === "פנוי") {
            statusClass = 'status-low';
            statusText = "פנוי";
            canJoin = true;
        } else if (item.status < 3 && diffHours < 24) {
            statusClass = 'status-low';
            statusText = "דגל אדום!";
        } else if (item.status < 3) {
            statusClass = 'status-med';
            statusText = "בתהליך";
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.date}</td>
            <td>${item.parasha}</td>
            <td>${item.reader || '-'}</td>
            <td><span class="badge ${statusClass}">${statusText}</span></td>
            <td>${canJoin ? `<button class="action-btn" onclick="assignMe('${item.id}')">שבץ אותי</button>` : ''}</td>
        `;
        body.appendChild(row);
    });
}

window.assignMe = async (id) => {
    const user = auth.currentUser;
    try {
        await updateDoc(doc(db, "readings", id), {
            reader: user.displayName,
            readerId: user.uid,
            status: 1
        });
        loadDashboard();
    } catch (e) {
        alert("השיבוץ נכשל. נסה שנית מאוחר יותר.");
    }
};

function renderPersonalCard(data) {
    const my = data.find(r => r.readerId === auth.currentUser.uid && new Date(r.date) >= new Date().setHours(0,0,0,0));
    const container = document.getElementById('personal-card');
    if (!container) return;
    
    if (!my) {
        container.innerHTML = "אין לך קריאה קרובה. אולי תשבץ את עצמך?";
        return;
    }
    container.innerHTML = `
        <strong>${my.parasha}</strong> ב-${my.date}<br>
        מצב הכנה: 
        <select onchange="updateStatus('${my.id}', this.value)">
            <option value="1" ${my.status==1?'selected':''}>טרם התחלתי</option>
            <option value="2" ${my.status==2?'selected':''}>עברתי פעם אחת</option>
            <option value="3" ${my.status==3?'selected':''}>מוכן לקריאה!</option>
        </select>
    `;
}

window.updateStatus = async (id, val) => {
    try {
        await updateDoc(doc(db, "readings", id), { status: parseInt(val) });
        loadDashboard();
    } catch (e) {
        console.error("עדכון סטטוס נכשל");
    }
};

document.getElementById('login-btn').onclick = () => signInWithPopup(auth, provider);
document.getElementById('logout-btn').onclick = () => signOut(auth);
