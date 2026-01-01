
/**************** FIREBASE CONFIG ****************/
const firebaseConfig = {
  apiKey: "AIzaSyAYXC6A67bh-SR8OhB1K5w6fwRYRCWgklw",
  authDomain: "ecoenergy-eb878.firebaseapp.com",
  projectId: "ecoenergy-eb878",
  storageBucket: "ecoenergy-eb878.firebasestorage.app",
  messagingSenderId: "340357568412",
  appId: "1:340357568412:web:8819af8a2d2452db6f5a59",
  measurementId: "G-9QQY2CKF68"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

/**************** GLOBAL STATE ****************/
let currentUser = null;
let selectedLab = "";

let dailyChartInstance = null;
let weeklyChartInstance = null;
let monthlyChartInstance = null;

/**************** LAB FACTORS ****************/
const labFactors = {
  "Computer Lab": 1.0,
  "Electronics Lab": 0.7,
  "Physics Lab": 0.5,
  "Chemistry Lab": 0.6
};

/**************** HELPERS ****************/
function normalizeDate(ts) {
  if (!ts) return null;

  // Firestore SDK timestamp
  if (ts.toDate) {
    const d = ts.toDate();
    if (isNaN(d.getTime())) return null;
    return d;
  }

  // REST API timestamp string
  if (typeof ts === "string") {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  return null;
}


/**************** LAB FILTER ****************/
const labSelect = document.getElementById("labFilter");
if (labSelect) {
  labSelect.addEventListener("change", e => {
    selectedLab = e.target.value;
    if (!currentUser) return;
    loadDailyAnalytics(currentUser);
    loadWeeklyAnalytics(currentUser);
    loadMonthlyAnalytics(currentUser);
  });
}

/**************** AUTH ****************/
function signup() {
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;
  const confirm = document.getElementById("confirm-password").value;
  const err = document.getElementById("signup-error");

  if (!email || !password || password !== confirm) {
    err.innerText = "Invalid signup details";
    return;
  }

  auth.createUserWithEmailAndPassword(email, password)
    .then(() => location.href = "dashboard.html")
    .catch(e => err.innerText = e.message);
}

function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  auth.signInWithEmailAndPassword(email, password)
    .then(() => location.href = "dashboard.html")
    .catch(e => alert(e.message));
}

document.querySelectorAll(".logout").forEach(btn => {
  btn.addEventListener("click", () =>
    auth.signOut().then(() => location.href = "index.html")
  );
});

/**************** DASHBOARD ****************/
function loadDashboard(user) {
  db.collection("EnergyRecords")
    .where("uid", "==", user.uid)
    .orderBy("timestamp", "desc")
    .limit(1)
    .get()
    .then(snap => {
      if (snap.empty) {
        todayConsumption.innerText = "0 kWh";
        todayCost.innerText = "₹0";
        return;
      }
      const d = snap.docs[0].data();
      todayConsumption.innerText = d.energy + " kWh";
      todayCost.innerText = "₹" + d.cost;
    });
}

/**************** HISTORY ****************/
function loadHistory(user) {
  const table = document.getElementById("historyTable");
  if (!table) return;

  table.innerHTML = "";

  db.collection("EnergyRecords")
    .where("uid", "==", user.uid)
    .orderBy("timestamp", "desc")
    .get()
    .then(snap => {
      snap.forEach(doc => {
        const d = doc.data();
        const t = normalizeDate(d.timestamp);
        table.innerHTML += `
          <tr>
            <td>${t?.toLocaleDateString()}</td>
            <td>${t?.toLocaleTimeString()}</td>
            <td>${d.lab}</td>
            <td>${d.energy}</td>
            <td>₹${d.cost}</td>
          </tr>`;
      });
    });
}

/**************** DAILY ANALYTICS ****************/
function loadDailyAnalytics(user) {
  const ctx = document.getElementById("dailyChart")?.getContext("2d");
  if (!ctx) return;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  let total = 0;

  db.collection("EnergyRecords")
    .where("uid", "==", user.uid)
    .get()
    .then(snap => {
      snap.forEach(doc => {
        const d = doc.data();
        if (selectedLab && d.lab !== selectedLab) return;
        const ts = normalizeDate(d.timestamp);
        if (!ts || ts < since) return;
        total += d.energy * (labFactors[selectedLab] || 1);
      });

      if (dailyChartInstance) dailyChartInstance.destroy();
      dailyChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
          labels: ["Last 24 Hours"],
          datasets: [{
            data: [total],
            backgroundColor: "#22c55e"
          }]
        },
        options: { scales: { y: { beginAtZero: true } } }
      });
    });
}

/**************** WEEKLY ANALYTICS ****************/
function loadWeeklyAnalytics(user) {
  const ctx = document.getElementById("weeklyChart");
  if (!ctx) return;

  const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const data = Object.fromEntries(days.map(d => [d, 0]));

  db.collection("EnergyRecords")
    .where("uid", "==", user.uid)
    .get()
    .then(snap => {
      snap.forEach(doc => {
        const d = doc.data();
        if (selectedLab && d.lab !== selectedLab) return;
        const ts = normalizeDate(d.timestamp);
        if (!ts) return;
        const day = ts.toLocaleDateString("en-US",{weekday:"short"});
        data[day] += d.energy * (labFactors[selectedLab] || 1);
      });

      if (weeklyChartInstance) weeklyChartInstance.destroy();
      weeklyChartInstance = new Chart(ctx, {
        type: "line",
        data: {
          labels: days,
          datasets: [{
            data: Object.values(data),
            borderColor: "#22c55e",
            backgroundColor: "rgba(34,197,94,.25)",
            fill: true,
            tension: 0.4
          }]
        },
        options: { scales: { y: { beginAtZero: true } } }
      });
    });
}

/**************** MONTHLY ANALYTICS (FIXED) ****************/
function loadMonthlyAnalytics(user) {
  const ctx = document.getElementById("monthlyChart")?.getContext("2d");
  if (!ctx) return;

  const months = {};

  db.collection("EnergyRecords")
    .where("uid", "==", user.uid)
    .get()
    .then(snap => {
      snap.forEach(doc => {
        const d = doc.data();
        if (selectedLab && d.lab !== selectedLab) return;
        const ts = normalizeDate(d.timestamp);
        if (!ts || ts.getFullYear() < 2020) return;

        const key = `${ts.getFullYear()}-${ts.getMonth()}`;
        months[key] = (months[key] || 0) + d.energy * (labFactors[selectedLab] || 1);
      });

      const keys = Object.keys(months).sort();
      const labels = keys.map(k => {
        const [y,m] = k.split("-");
        return new Date(y, m).toLocaleString("en-US",{month:"short",year:"numeric"});
      });

      if (monthlyChartInstance) monthlyChartInstance.destroy();
      monthlyChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
          labels,
          datasets: [{
            data: keys.map(k => months[k]),
            backgroundColor: "#22c55e"
          }]
        },
        options: { scales: { y: { beginAtZero: true } } }
      });
    });
}

/**************** AI INSIGHTS ****************/
function loadAIInsights(user) {
  db.collection("EnergyRecords")
    .where("uid","==",user.uid)
    .get()
    .then(snap => {
      if (snap.empty) return;

      const labs = {};
      let total = 0;

      snap.forEach(doc => {
        const d = doc.data();
        total += d.energy;
        labs[d.lab] = (labs[d.lab] || 0) + d.energy;
      });

      let maxLab = "";
      let max = 0;
      for (const l in labs) {
        if (labs[l] > max) { max = labs[l]; maxLab = l; }
      }

      if (aiSummary) {
        aiSummary.innerText = `AI Insight: ${maxLab} consumes the highest energy.`;
      }
    });
}

/**************** AUTH STATE ****************/
auth.onAuthStateChanged(user => {
  if (!user) return;
  currentUser = user;

  if (todayConsumption) loadDashboard(user);
  if (dailyChart) loadDailyAnalytics(user);
  if (weeklyChart) loadWeeklyAnalytics(user);
  if (monthlyChart) loadMonthlyAnalytics(user);
  if (historyTable) loadHistory(user);
  if (aiSummary || aiResult) loadAIInsights(user);
});
