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

const COST_PER_KWH = 10; // ₹10 per kWh

// ================= CALCULATE & SAVE =================
function calculateAndSave() {
  const kwh = parseFloat(document.getElementById("kwh").value);

  if (!kwh || kwh <= 0) {
    alert("Enter valid kWh value");
    return;
  }

  const cost = (kwh * COST_PER_KWH).toFixed(2);
  const now = firebase.firestore.Timestamp.now();

  document.getElementById("consumption").innerHTML =
    `<strong>Energy Consumed:</strong> ${kwh} kWh`;
  document.getElementById("cost").innerHTML =
    `<strong>Total Cost:</strong> ₹${cost}`;

  auth.onAuthStateChanged(user => {
    if (!user) {
      alert("Please login");
      return;
    }

    db.collection("EnergyRecords").add({
      uid: user.uid,
      energy: kwh,
      cost: parseFloat(cost),
      timestamp: now
    }).then(() => {
      alert("Saved successfully!");
      loadDashboard();
    });
  });
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
  db.collection("EnergyRecords")
    .where("uid", "==", user.uid)
    .orderBy("timestamp", "desc")
    .get()
    .then(snapshot => {
      const table = document.getElementById("historyTable");
      table.innerHTML = `
        <tr>
          <th>Date</th>
          <th>Time</th>
          <th>Energy (kWh)</th>
          <th>Cost (₹)</th>
        </tr>`;

      snapshot.forEach(doc => {
        const d = doc.data();
        const dt = d.timestamp.toDate();

        table.innerHTML += `
          <tr>
            <td>${dt.toLocaleDateString()}</td>
            <td>${dt.toLocaleTimeString()}</td>
            <td>${d.energy}</td>
            <td>₹${d.cost}</td>
          </tr>`;
      });
    })
    .catch(err => console.error("History error:", err));
}
function loadDashboardHistory(user) {
  const table = document.getElementById("dashboardHistory");
  if (!table) return;

  db.collection("EnergyRecords")
    .where("uid", "==", user.uid)
    .orderBy("timestamp", "desc")
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
            <td>${d.energy}</td>
            <td>₹ ${d.cost}</td>
          </tr>
        `;
      });
    });
}

auth.onAuthStateChanged(user => {
  if (!user) return;

  // Dashboard cards
  if (document.getElementById("todayConsumption")) {
    loadDashboard(user);
    loadWeeklyAnalytics(user, "weeklyChart"); // ✅ FIXED
  }

  // History page
  if (document.getElementById("historyTable")) {
    loadHistory(user);
  }

  // Analytics page
  if (document.getElementById("dailyChart")) {
    loadDailyAnalytics(user);
    loadWeeklyAnalytics(user, "weeklyChart");
    loadMonthlyAnalytics(user);
  }

  loadDashboardHistory(user);
});


function loadDailyAnalytics(user) {
  const start = new Date();
  start.setHours(0,0,0,0);

  db.collection("EnergyRecords")
    .where("uid", "==", user.uid)
    .where("timestamp", ">=", firebase.firestore.Timestamp.fromDate(start))
    .get()
    .then(snapshot => {
      let total = 0;
      snapshot.forEach(doc => total += doc.data().energy);

      new Chart(document.getElementById("dailyChart"), {
        type: "bar",
        data: {
          labels: ["Today"],
          datasets: [{
            data: [total],
            backgroundColor: "#22c55e"
          }]
        },
        options: { plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}} }
      });
    });
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
        const day = d.timestamp
          .toDate()
          .toLocaleDateString("en-US",{weekday:"short"});
        days[day] += Number(d.energy);
      });

      new Chart(canvas, {
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
        const m = d.timestamp.toDate()
          .toLocaleString("en-US",{month:"short",year:"numeric"});
        months[m] = (months[m] || 0) + d.energy;
      });

      new Chart(document.getElementById("monthlyChart"), {
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
