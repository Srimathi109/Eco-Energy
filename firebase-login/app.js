const firebaseConfig = {
  apiKey: "AIzaSyAYXC6A67bh-SR8OhB1K5w6fwRYRCWgklw",
  authDomain: "ecoenergy-eb878.firebaseapp.com",
  projectId: "ecoenergy-eb878",
  storageBucket: "ecoenergy-eb878.firebasestorage.app",
  messagingSenderId: "340357568412",
  appId: "1:340357568412:web:8819af8a2d2452db6f5a59",
  measurementId: "G-9QQY2CKF68"
};
// Global variables
let currentUser = null;
let selectedLab = "";

const labFactors = { // Consumption weights
  "Computer Lab": 1.0,
  "Electronics Lab": 0.7,
  "Physics Lab": 0.5,
  "Chemistry Lab": 0.6
};

function parseTimestamp(d) {
  // Firestore SDK Timestamp
  if (d.timestamp?.toDate) return d.timestamp.toDate();

  // Arduino REST API ISO string
  if (d.timestamp?.timestampValue) return new Date(d.timestamp.timestampValue);
  // fallback
  return null;
}

const labSelect = document.getElementById("labFilter");

if (labSelect) {
  labSelect.addEventListener("change", (e) => {
    selectedLab = e.target.value;

    // Reload analytics when lab changes
    loadDailyAnalytics(currentUser);
    loadWeeklyAnalytics(currentUser, "weeklyChart");
    loadMonthlyAnalytics(currentUser);
  });
}

// Firebase initialization
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const COST_PER_KWH = 10; // ₹10 per kWh

// --- SIGNUP ---
function signup() {
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;
  const confirm = document.getElementById("confirm-password").value;
  const errorEl = document.getElementById("signup-error");

  if (!email || !password || !confirm) {
    errorEl.innerText = "Please fill all fields";
    return;
  }
  if (password !== confirm) {
    errorEl.innerText = "Passwords do not match";
    return;
  }

  auth.createUserWithEmailAndPassword(email, password)
    .then(() => {
      window.location.href = "dashboard.html";
    })
    .catch(err => {
      errorEl.innerText = err.message;
    });
}

// --- LOGIN ---
function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      window.location.href = "dashboard.html";
    })
    .catch(err => alert(err.message));
}

// --- GOOGLE SIGNIN ---
document.querySelectorAll(".google-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
      .then(() => window.location.href = "dashboard.html")
      .catch(err => alert(err.message));
  });
});

// --- LOGOUT ---
document.querySelectorAll(".logout").forEach(btn => {
  btn.addEventListener("click", () => auth.signOut().then(() => window.location.href="index.html"));
});

// ================= CALCULATE & SAVE =================
async function calculateAndSave() {
  const kwh = parseFloat(document.getElementById('kwh').value);
  const lab = document.getElementById('lab').value;
  const popup = document.getElementById('popup');

  // Validate inputs
  if (isNaN(kwh) || kwh <= 0 || !lab) {
    popup.textContent = "Please enter valid energy and select a lab!";
    popup.className = "result-popup error";
    popup.style.display = "block";
    return;
  }

  // Example calculation: cost = 10 ₹ per kWh
  const cost = (kwh * 10).toFixed(2);

  document.getElementById('consumption').textContent = `Energy Consumed: ${kwh} kWh`;
  document.getElementById('cost').textContent = `Total Cost: ₹ ${cost}`;

  try {
    const user = firebase.auth().currentUser;
    if (!user) throw new Error("User not logged in");

    await db.collection('EnergyRecords').add({
      userId: user.uid,
      kwh,
      cost,
      lab,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    popup.textContent = "DataSaved successfully!";
    popup.className = "result-popup success";
    popup.style.display = "block";

  } catch (err) {
    console.error(err);
    popup.textContent = "Failed to save data!";
    popup.className = "result-popup error";
    popup.style.display = "block";
  }
}


// ================= DASHBOARD =================
function loadDashboard(user) {
  db.collection("EnergyRecords")
    .where("uid", "==", user.uid)
    .orderBy("timestamp", "desc")
    .limit(1)
    .get()
    .then(snapshot => {
      if (!snapshot.empty) {
        const d = snapshot.docs[0].data();
        document.getElementById("todayConsumption").innerText = d.energy + " kWh";
        document.getElementById("todayCost").innerText = "₹" + d.cost;
      } else {
        document.getElementById("todayConsumption").innerText = "0 kWh";
        document.getElementById("todayCost").innerText = "₹0";
      }
    })
    .catch(err => console.error("Dashboard error:", err));
}

// ================= HISTORY =================
function loadHistory(user) {
  const table = document.getElementById("historyTable");
  if (!table) return;

  table.innerHTML = ``;

  db.collection("EnergyRecords")
    .where("uid", "==", user.uid)
    .orderBy("timestamp", "desc")
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const d = doc.data();
        const dt = d.timestamp.toDate();
        table.innerHTML += `
          <tr>
            <td>${dt.toLocaleDateString()}</td>
            <td>${dt.toLocaleTimeString()}</td>
            <td>${d.lab}</td>
            <td>${d.energy}</td>
            <td>₹${d.cost}</td>
          </tr>
        `;
      });
    })
    .catch(err => console.error("History error:", err));
}

function loadDashboardHistory(user) {
  const table = document.getElementById("dashboardHistory");
  if (!table) return;

  db.collection("EnergyRecords")
    .where("uid","==",user.uid)
    .orderBy("timestamp","desc")
    .limit(5)
    .onSnapshot(snapshot => {
      table.innerHTML = "";
      snapshot.forEach(doc => {
        const d = doc.data();
        const dateObj = d.timestamp.toDate();
        table.innerHTML += `
          <tr>
            <td>${dateObj.toLocaleDateString()}</td>
            <td>${dateObj.toLocaleTimeString()}</td>
            <td>${d.lab}</td>
            <td>${d.energy}</td>
            <td>₹${d.cost}</td>
          </tr>
        `;
      });
    });
}

// ================= CHART INSTANCES =================
let dailyChartInstance;
let weeklyChartInstance;
let monthlyChartInstance;

// ================= DASHBOARD CHARTS =================
function loadDailyAnalytics(user) {
  const ctx = document.getElementById("dailyChart").getContext("2d");

  db.collection("EnergyRecords")
    .where("uid", "==", user.uid)
    .get()
    .then(snapshot => {
      let total = 0;
      const factor = labFactors[selectedLab] || 1;

      snapshot.forEach(doc => {
        const d = doc.data();

        // Lab filter
        if (selectedLab && d.lab !== selectedLab) return;

        const ts = parseTimestamp(d);
        if (!ts) return;

        // Only last 24 hours
        const start = new Date();
        start.setHours(start.getHours() - 24);
        if (ts < start) return;

        total += (d.energy || 0) * factor;
      });

      if (dailyChartInstance) dailyChartInstance.destroy();

      dailyChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
          labels: ["Recent Energy"],
          datasets: [{
            label: "Energy (kWh)",
            data: [total],
            backgroundColor: "#22c55e"
          }]
        },
        options: { 
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } }
        }
      });
    })
    .catch(err => console.error("Daily Analytics error:", err));
}

// Auto-refresh daily chart
setInterval(() => {
  if (currentUser) loadDailyAnalytics(currentUser);
}, 15000); // every 15s

function loadWeeklyAnalytics(user, chartId) {
  const canvas = document.getElementById(chartId);
  if (!canvas) return;

  const days = {Mon:0,Tue:0,Wed:0,Thu:0,Fri:0,Sat:0,Sun:0};

  db.collection("EnergyRecords")
    .where("uid", "==", user.uid)
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const d = doc.data();

        if (selectedLab && d.lab !== selectedLab) return;

        const ts = parseTimestamp(d);
        if (!ts) return;

        const day = ts.toLocaleDateString("en-US",{weekday:"short"});
        days[day] += (d.energy || 0) * (labFactors[selectedLab] || 1);
      });

      if (weeklyChartInstance) weeklyChartInstance.destroy();

      weeklyChartInstance = new Chart(canvas, {
        type:"line",
        data:{
          labels:Object.keys(days),
          datasets:[{
            label:"Energy (kWh)",
            data:Object.values(days),
            fill:true,
            tension:0.4,
            backgroundColor:"rgba(34,197,94,.25)",
            borderColor:"#22c55e",
            pointRadius:4
          }]
        },
        options:{
          responsive:true,
          maintainAspectRatio:false,
          plugins:{legend:{display:false}},
          scales:{y:{beginAtZero:true}}
        }
      });
    })
    .catch(err => console.error("Weekly Analytics error:", err));
}

function loadMonthlyAnalytics(user) {
  db.collection("EnergyRecords")
    .where("uid", "==", user.uid)
    .get()
    .then(snapshot => {
      const months = {};

      snapshot.forEach(doc => {
        const d = doc.data();

        if (selectedLab && d.lab !== selectedLab) return;

        const ts = parseTimestamp(d);
        if (!ts) return;

        const monthLabel = ts.toLocaleString("en-US",{month:"short",year:"numeric"});
        months[monthLabel] = (months[monthLabel] || 0) + (d.energy || 0) * (labFactors[selectedLab] || 1);
      });

      if (monthlyChartInstance) monthlyChartInstance.destroy();

      const ctx = document.getElementById("monthlyChart").getContext("2d");
      monthlyChartInstance = new Chart(ctx, {
        type:"bar",
        data:{
          labels:Object.keys(months),
          datasets:[{
            data:Object.values(months),
            backgroundColor:"#22c55e"
          }]
        },
        options:{
          plugins:{legend:{display:false}},
          scales:{y:{beginAtZero:true}}
        }
      });
    })
    .catch(err => console.error("Monthly Analytics error:", err));
}

// ================= AI INSIGHTS =================
function loadAIInsights(user) {
  db.collection("EnergyRecords")
    .where("uid", "==", user.uid)
    .get()
    .then(snapshot => {
      if (snapshot.empty) {
        if (document.getElementById("aiResult")) {
          document.getElementById("aiResult").innerText = "No data available for AI analysis.";
        }
        return;
      }

      const labStats = {};
      let totalEnergy = 0;
      let recordCount = 0;

      snapshot.forEach(doc => {
        const d = doc.data();
        recordCount++;
        totalEnergy += d.energy;

        if (!labStats[d.lab]) labStats[d.lab] = { total:0, count:0 };
        labStats[d.lab].total += d.energy;
        labStats[d.lab].count++;
      });

      const avgEnergy = totalEnergy / recordCount;
      let insights = [];
      let inefficientLab = "";
      let maxEnergy = 0;

      Object.keys(labStats).forEach(lab => {
        const avgLabEnergy = labStats[lab].total / labStats[lab].count;

        if (labStats[lab].total === 0) {
          insights.push(`⚠️ ${lab} shows zero consumption. Possible power-off or meter issue.`);
        }

        if (avgLabEnergy > avgEnergy * 1.5) {
          insights.push(`🔴 ${lab} consumes significantly higher energy than average.`);
        }

        if (labStats[lab].total > maxEnergy) {
          maxEnergy = labStats[lab].total;
          inefficientLab = lab;
        }
      });

      if (insights.length === 0) {
        insights.push("✅ All labs are operating within normal energy limits.");
      }

      if (document.getElementById("aiResult")) {
        document.getElementById("aiResult").innerHTML = insights.map(i => `<p>${i}</p>`).join("");
      }

      if (document.getElementById("aiSummary")) {
        document.getElementById("aiSummary").innerText =
          `AI Insight: ${inefficientLab || "No lab"} is currently the highest energy-consuming lab.`;
      }
    })
    .catch(err => console.error("AI Insights error:", err));
}

// ================= AUTH STATE =================
auth.onAuthStateChanged(user => {
  if (!user) return;
  currentUser = user;
  console.log("Logged-in UID:", user.uid);
  db.collection("activeLabs").doc("lab1").set({
    uid: user.uid,
    lab: "Computer Lab"
  });

  db.collection("activeLabs").doc("lab2").set({
    uid: user.uid,
    lab: "Electronics Lab"
  });

  if (document.getElementById("todayConsumption")) {
    loadDashboard(user);
  }

  if (document.getElementById("dailyChart")) {
    loadDailyAnalytics(user);
  }
  if (document.getElementById("weeklyChart")) {
    loadWeeklyAnalytics(user, "weeklyChart");
  }
  if (document.getElementById("monthlyChart")) {
    loadMonthlyAnalytics(user);
  }
  if (document.getElementById("historyTable")) {
    loadHistory(user);
  }
  if (document.getElementById("dashboardHistory")) {
    loadDashboardHistory(user);
  }
  if (document.getElementById("aiResult") || document.getElementById("aiSummary")) {
    loadAIInsights(user);
  }
});

