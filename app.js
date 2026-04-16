import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, query, getDocs, updateDoc, orderBy, onSnapshot, initializeFirestore, persistentLocalCache } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCHyS_MZhSLPDmBMNfSEx69tzRWhLMQ9Sc",
  authDomain: "tora-app-5781c.firebaseapp.com",
  projectId: "tora-app-5781c",
  storageBucket: "tora-app-5781c.firebasestorage.app",
  messagingSenderId: "278076130279",
  appId: "1:278076130279:web:01b37888c5b9d069ae7342"
};

// אתחול אפליקציה
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// אתחול Firestore עם ה-Cache החדש (לפי האזהרה שקיבלת)
const db = initializeFirestore(app, {
    localCache: persistentLocalCache()
});

const provider = new GoogleAuthProvider();

const parashot = ["בראשית", "נח", "לך לך", "וירא", "חיי שרה", "תולדות", "ויצא", "וישלח", "וישב", "מקץ", "ויגש", "ויחי", "שמות", "וארא", "בא", "בשלח", "יתרו", "משפטים", "תרומה", "תצוה", "כי תשא", "ויקהל", "פקודי", "ויקרא", "צו", "שמיני", "תזריע", "מצורע", "אחרי מות", "קדושים", "אמור", "בהר", "בחוקותי", "במדבר", "נשא", "בהעלותך", "שלח", "קרח", "חקת", "בלק", "פנחס", "מטות", "מסעי", "דברים", "ואתחנן", "עקב", "ראה", "שופטים", "כי תצא", "כי תבוא", "נצבים", "וילך", "האזינו", "וזאת הברכה"];

let currentUserData = null;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists() && userDoc.data().setupComplete) {
                currentUserData = userDoc.data();
                setupDashboard();
            } else {
                showSection('wizard');
                populateWizard();
            }
        } catch (e) {
            console.error("Auth error:", e);
        }
    } else {
        showSection('auth');
    }
});

function showSection(id) {
    document.querySelectorAll('.container').forEach(c => c.classList.add('hidden'));
    const target = document.getElementById(`${id}-section`);
    if (target) target.classList.remove('hidden');
}

// --- WIZARD ---
function populateWizard() {
    const sel = document.getElementById('bar-mitzvah-select');
    if (!sel || sel.children.length > 0) return;
    parashot.forEach(p => {
        let opt = document.createElement('option');
        opt.value = p; opt.textContent = p;
        sel.appendChild(opt);
    });
}

// שימוש ב-AddEventListener במקום Onclick למניעת שגיאות null
const saveWizardBtn = document.getElementById('save-wizard');
if (saveWizardBtn) {
    saveWizardBtn.onclick = async () => {
        const user = auth.currentUser;
        const barMitzvah = document.getElementById('bar-mitzvah-select').value;
        if (!barMitzvah) return alert("נא לבחור פרשה");
        
        await setDoc(doc(db, "users", user.uid), {
            name: user.displayName,
            email: user.email,
            barMitzvah: barMitzvah,
            setupComplete: true,
            isAdmin: user.email === 'rb077858@gmail.com'
        });
        location.reload();
    };
}

// --- DASHBOARD ---
async function setupDashboard() {
    showSection('app');
    const nameDisp = document.getElementById('user-name-display');
    if (nameDisp) nameDisp.textContent = `שלום, ${auth.currentUser.displayName}`;
    
    if (currentUserData.isAdmin) {
        const adminBtn = document.getElementById('admin-toggle');
        if (adminBtn) {
            adminBtn.classList.remove('hidden');
            adminBtn.onclick = () => document.getElementById('admin-panel').classList.toggle('hidden');
        }
    }

    onSnapshot(collection(db, "readings"), (snap) => {
        const booked = {};
        snap.forEach(d => booked[d.id] = d.data());
        renderAutomaticTable(booked);
    });
}

function getNextSaturdays(count) {
    const saturdays = [];
    let d = new Date();
    // מציאת השבת הקרובה
    d.setDate(d.getDate() + (6 - d.getDay() + 7) % 7);
    for (let i = 0; i < count; i++) {
        saturdays.push(new Date(d));
        d.setDate(d.getDate() + 7);
    }
    return saturdays;
}

// חישוב פרשה לפי תאריך (לוגיקה בסיסית לרשימה הסטטית שלך)
function getParashaForDate(date) {
    // נקודת ייחוס: 18/04/2026 היא פרשת שמיני (אינדקס 25)
    const refDate = new Date('2026-04-18');
    const diffWeeks = Math.round((date - refDate) / (1000 * 60 * 60 * 24 * 7));
    const index = (25 + diffWeeks) % parashot.length;
    return parashot[index >= 0 ? index : parashot.length + index];
}

function renderAutomaticTable(bookedData) {
    const body = document.getElementById('readings-body');
    if (!body) return;
    body.innerHTML = '';
    const nextSaturdays = getNextSaturdays(5);

    nextSaturdays.forEach((sat) => {
        const dateStr = sat.toISOString().split('T')[0];
        const currentParasha = getParashaForDate(sat);
        const docId = `${dateStr}_${currentParasha}`;
        const booking = bookedData[docId];

        const isVacant = !booking || !booking.readerId;
        const row = document.createElement('tr');
        
        let statusHTML = isVacant ? '<span class="badge status-low">פנוי</span>' : 
                         `<span class="badge ${booking.status == 3 ? 'status-high' : 'status-med'}">${booking.status == 3 ? 'מוכן' : 'בתהליך'}</span>`;

        row.innerHTML = `
            <td>${dateStr.split('-').reverse().join('/')}</td>
            <td><strong>${currentParasha}</strong></td>
            <td>${isVacant ? '-' : booking.readerName}</td>
            <td>${statusHTML}</td>
            <td>
                ${isVacant ? `<button class="main-btn" style="padding:5px 10px; font-size:0.8rem" onclick="assign('${docId}', '${currentParasha}', '${dateStr}')">שבץ אותי</button>` : ''}
                ${!isVacant && booking.readerId === auth.currentUser.uid ? `<button class="secondary-btn" style="padding:5px 10px; font-size:0.8rem" onclick="cancel('${docId}')">בטל</button>` : ''}
            </td>
        `;
        body.appendChild(row);

        if (booking && booking.readerId === auth.currentUser.uid) {
            renderPersonalCard(docId, booking, currentParasha);
        }
    });
}

window.assign = async (id, parasha, date) => {
    await setDoc(doc(db, "readings", id), {
        readerName: auth.currentUser.displayName,
        readerId: auth.currentUser.uid,
        parasha: parasha,
        date: date,
        status: 1
    });
};

window.cancel = async (id) => {
    if(confirm("לבטל שיבוץ?")) {
        await updateDoc(doc(db, "readings", id), { readerId: null, readerName: null });
    }
};

function renderPersonalCard(id, data, parasha) {
    const card = document.getElementById('personal-card');
    if (!card) return;
    card.classList.remove('hidden');
    card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center">
            <div>קריאה משובצת: <h2 style="margin:0">${parasha}</h2></div>
            <select onchange="updateStatus('${id}', this.value)" class="full-input" style="width:auto; margin:0">
                <option value="1" ${data.status==1?'selected':''}>⏳ התחלתי</option>
                <option value="2" ${data.status==2?'selected':''}>📖 לומד</option>
                <option value="3" ${data.status==3?'selected':''}>✅ מוכן!</option>
            </select>
        </div>
    `;
}

window.updateStatus = async (id, val) => {
    await updateDoc(doc(db, "readings", id), { status: parseInt(val) });
};

document.getElementById('login-btn').onclick = () => signInWithPopup(auth, provider);
document.getElementById('logout-btn').onclick = () => signOut(auth);
