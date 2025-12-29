const firebaseConfig = {
  apiKey: "AIzaSyAYXC6A67bh-SR8OhB1K5w6fwRYRCWgklw",
  authDomain: "ecoenergy-eb878.firebaseapp.com",
  projectId: "ecoenergy-eb878",
  storageBucket: "ecoenergy-eb878.firebasestorage.app",
  messagingSenderId: "340357568412",
  appId: "1:340357568412:web:8819af8a2d2452db6f5a59",
  measurementId: "G-9QQY2CKF68"
};

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
function calculateAndSave() {
  const lab = document.getElementById("lab").value;
  const kwh = parseFloat(document.getElementById("kwh").value);

  if (!lab) return alert("Please select a lab");
  if (!kwh || kwh <= 0) return alert("Enter valid kWh");

  const cost = +(kwh * COST_PER_KWH).toFixed(2);
  const user = auth.currentUser;
  if (!user) return alert("User not logged in");

  db.collection("EnergyRecords").add({
    uid: user.uid,
    lab: lab,
    energy: kwh,
    cost: cost,
    timestamp: firebase.firestore.Timestamp.now()
  }).then(() => {
    alert("Saved successfully");
    document.getElementById("consumption").innerText = `Energy Consumed: ${kwh} kWh`;
    document.getElementById("cost").innerText = `Total Cost: ₹${cost}`;
  }).catch(err => console.error("Error saving record:", err));
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
  const start = new Date();
  start.setHours(0,0,0,0);

  db.collection("EnergyRecords")
    .where("uid", "==", user.uid)
    .where("timestamp", ">=", firebase.firestore.Timestamp.fromDate(start))
    .get()
    .then(snapshot => {
      let total = 0;
      snapshot.forEach(doc => total += doc.data().energy || 0);

      const ctx = document.getElementById("dailyChart").getContext("2d");

      if (dailyChartInstance) dailyChartInstance.destroy();

      dailyChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
          labels: ["Today"],
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

function loadWeeklyAnalytics(user, chartId) {
  const canvas = document.getElementById(chartId);
  if (!canvas) return;

  const start = new Date();
  start.setDate(start.getDate() - 6);

  const days = {Mon:0,Tue:0,Wed:0,Thu:0,Fri:0,Sat:0,Sun:0};

  db.collection("EnergyRecords")
    .where("uid", "==", user.uid)
    .where("timestamp", ">=", firebase.firestore.Timestamp.fromDate(start))
    .orderBy("timestamp", "asc")
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const d = doc.data();
        const day = d.timestamp.toDate().toLocaleDateString("en-US",{weekday:"short"});
        days[day] += Number(d.energy);
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
    });
}

function loadMonthlyAnalytics(user) {
  db.collection("EnergyRecords")
    .where("uid", "==", user.uid)
    .get()
    .then(snapshot => {
      const months = {};
      snapshot.forEach(doc => {
        const d = doc.data();
        const m = d.timestamp.toDate().toLocaleString("en-US",{month:"short",year:"numeric"});
        months[m] = (months[m] || 0) + d.energy;
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
        options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}
      });
    });
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
