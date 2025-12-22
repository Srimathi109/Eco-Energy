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

// --- CALCULATE AND SAVE ---
function calculateAndSave() {
    const lights = parseInt(document.getElementById("lights").value) || 0;
    const fans = parseInt(document.getElementById("fans").value) || 0;
    const ac = parseInt(document.getElementById("ac").value) || 0;
    const hours = parseFloat(document.getElementById("hours").value) || 0;

    if (!lights && !fans && !ac) {
        alert("Enter at least one device");
        return;
    }

    // Sample calculation (adjust per your logic)
    const lightKW = 0.06; // kWh per hour
    const fanKW = 0.075;
    const acKW = 1.5;

    const totalConsumption = ((lights * lightKW + fans * fanKW + ac * acKW) * hours).toFixed(2);
    const cost = (totalConsumption * 10).toFixed(2); // ₹10 per kWh
    const energySaved = (Math.random() * 20).toFixed(1); // Sample percentage
    const wastage = (hours > 5) ? "High" : "Low"; // Sample logic

    // Display results
    document.getElementById("consumption").innerHTML = `<strong>Estimated Consumption:</strong> ${totalConsumption} kWh`;
    document.getElementById("cost").innerHTML = `<strong>Estimated Cost:</strong> ₹${cost}`;
    document.getElementById("energy-saved").innerHTML = `<strong>Energy Saved:</strong> ${energySaved}%`;
    document.getElementById("wastage").innerHTML = `<strong>Wastage Detected:</strong> ${wastage}`;

    // Save to Firestore
    auth.onAuthStateChanged(user => {
        if (user) {
            db.collection("EnergyRecords").add({
                uid: user.uid,
                date: firebase.firestore.Timestamp.now(),
                lights, fans, ac, hours,
                kWh: parseFloat(totalConsumption),
                cost: parseFloat(cost),
                energySaved: parseFloat(energySaved),
                wastage
            }).then(() => alert("Record saved!"))
            .catch(err => console.error(err));
        } else {
            alert("Login first!");
        }
    });
}

// --- DASHBOARD: Load latest record ---
// Fetch latest calculation for the logged-in user
function loadDashboard() {
    const user = firebase.auth().currentUser;
    if (!user) return;
    const db = firebase.firestore();
    db.collection('calculations')
      .where('uid', '==', user.uid)
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get()
      .then(snapshot => {
          if (!snapshot.empty) {
              const data = snapshot.docs[0].data();
              document.getElementById('todayConsumption').innerText = data.totalEnergy + ' kWh';
              document.getElementById('todayCost').innerText = '₹' + data.totalCost;
              document.getElementById('todayEnergySaved').innerText = data.energySaved + ' kWh';
              document.getElementById('todayWastage').innerText = data.wastage + ' kWh';
          } else {
              document.getElementById('todayConsumption').innerText = '0 kWh';
              document.getElementById('todayCost').innerText = '₹0';
              document.getElementById('todayEnergySaved').innerText = '0 kWh';
              document.getElementById('todayWastage').innerText = '0 kWh';
          }
      })
      .catch(err => console.error(err));
}


// --- HISTORY: Load all records ---
function loadHistory() {
    auth.onAuthStateChanged(user => {
        if (!user) return;
        db.collection("EnergyRecords")
          .where("uid", "==", user.uid)
          .orderBy("date", "desc")
          .get()
          .then(snapshot => {
            const table = document.querySelector("table");
            table.innerHTML = "<tr><th>Date</th><th>Lights</th><th>Fans</th><th>AC</th><th>Hours</th><th>kWh</th><th>Cost</th></tr>";
            snapshot.forEach(doc => {
                const d = doc.data();
                const date = d.date.toDate().toLocaleDateString("en-GB");
                table.innerHTML += `<tr>
                    <td>${date}</td>
                    <td>${d.lights}</td>
                    <td>${d.fans}</td>
                    <td>${d.ac}</td>
                    <td>${d.hours}</td>
                    <td>${d.kWh}</td>
                    <td>₹${d.cost}</td>
                </tr>`;
            });
          });
    });
}

// --- Call on dashboard/history load ---
if (document.getElementById("todayConsumption")) loadDashboard();
if (document.querySelector("table")) loadHistory();
