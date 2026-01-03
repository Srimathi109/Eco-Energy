import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai@latest?cachebust=20260103";



const API_KEY =process.env.GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(API_KEY);
const db = firebase.firestore();

firebase.auth().onAuthStateChanged(async (user) => {
  if (!user) return window.location.href = "index.html";
  await loadAIInsights(user);
});

async function loadAIInsights(user) {
  const safeDiv = document.getElementById("safeLabs");
  const abnormalDiv = document.getElementById("abnormalLabs");
  const efficientDiv = document.getElementById("efficientLabs");
  const zeroDiv = document.getElementById("zeroLabs");

  try {
    const snap = await db.collection("EnergyRecords")
      .where("uid", "==", user.uid)
      .orderBy("timestamp", "desc")
      .limit(100)
      .get();

    if (snap.empty) {
      safeDiv.innerHTML = abnormalDiv.innerHTML = efficientDiv.innerHTML = zeroDiv.innerHTML = 
        '<div class="empty-state"><span class="material-icons">data_usage</span><p>No energy data available for analysis</p></div>';
      return;
    }

    const records = snap.docs.map(d => {
      const data = d.data();
      return {
        ...data,
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp)
      };
    });

    // Group by lab and calculate metrics
    const labData = {};
    const labStats = {};
    
    records.forEach(r => {
      if (!labData[r.lab]) {
        labData[r.lab] = [];
        labStats[r.lab] = {
          total: 0,
          count: 0,
          avg: 0,
          max: 0,
          min: Infinity,
          cost: 0
        };
      }
      labData[r.lab].push(r);
      labStats[r.lab].total += r.energy || 0;
      labStats[r.lab].count++;
      labStats[r.lab].max = Math.max(labStats[r.lab].max, r.energy || 0);
      labStats[r.lab].min = Math.min(labStats[r.lab].min, r.energy || 0);
      labStats[r.lab].cost += r.cost || 0;
    });

    Object.keys(labStats).forEach(lab => {
      labStats[lab].avg = labStats[lab].total / labStats[lab].count;
    });

    // Calculate overall average for comparison
    const overallAvg = Object.values(labStats).reduce((sum, stat) => sum + stat.avg, 0) / Object.keys(labStats).length;

    const prompt = `You are an expert AI energy auditor analyzing lab energy consumption data.

For EACH LAB, analyze the data and provide:
1. Classification: SAFE, ABNORMAL, ZERO, or EFFICIENT
2. Detailed reason with specific metrics
3. Priority level: HIGH, MEDIUM, or LOW
4. Actionable recommendations (2-3 specific items)
5. Estimated monthly cost savings if recommendations are followed (in rupees)

Energy Data Summary:
${JSON.stringify(Object.keys(labStats).map(lab => ({
  lab: lab,
  averageConsumption: labStats[lab].avg.toFixed(2),
  maxConsumption: labStats[lab].max.toFixed(2),
  minConsumption: labStats[lab].min.toFixed(2),
  totalCost: labStats[lab].cost.toFixed(2),
  recordCount: labStats[lab].count,
  recentReadings: labData[lab].slice(0, 5).map(r => ({ energy: r.energy, cost: r.cost }))
})), null, 2)}

Overall Average Consumption: ${overallAvg.toFixed(2)} kWh

Return ONLY valid JSON in this exact format:
{
  "safe": [
    {
      "lab": "Lab Name",
      "reason": "Detailed explanation",
      "priority": "LOW",
      "avgEnergy": 2.5,
      "recommendations": ["Recommendation 1", "Recommendation 2"],
      "savings": 0
    }
  ],
  "abnormal": [
    {
      "lab": "Lab Name",
      "reason": "Detailed explanation with metrics",
      "priority": "HIGH",
      "avgEnergy": 5.5,
      "recommendations": ["Action item 1", "Action item 2", "Action item 3"],
      "savings": 1500
    }
  ],
  "zero": [
    {
      "lab": "Lab Name",
      "reason": "Explanation",
      "priority": "MEDIUM",
      "avgEnergy": 0,
      "recommendations": ["Recommendation"],
      "savings": 0
    }
  ],
  "efficient": [
    {
      "lab": "Lab Name",
      "reason": "Explanation",
      "priority": "LOW",
      "avgEnergy": 1.2,
      "recommendations": ["Best practice to share"],
      "savings": 0
    }
  ]
}`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Extract JSON from response
    let json;
    try {
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}") + 1;
      json = JSON.parse(text.substring(jsonStart, jsonEnd));
    } catch (e) {
      // Fallback parsing
      const codeBlock = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
      if (codeBlock) {
        json = JSON.parse(codeBlock[1]);
      } else {
        throw new Error("Could not parse AI response");
      }
    }

    // Update summary cards
    document.getElementById("summaryAbnormal").querySelector(".value").textContent = json.abnormal?.length || 0;
    document.getElementById("summarySafe").querySelector(".value").textContent = json.safe?.length || 0;
    document.getElementById("summaryEfficient").querySelector(".value").textContent = json.efficient?.length || 0;
    document.getElementById("summaryZero").querySelector(".value").textContent = json.zero?.length || 0;
    
    const totalSavings = (json.abnormal || []).reduce((sum, item) => sum + (item.savings || 0), 0) +
                        (json.zero || []).reduce((sum, item) => sum + (item.savings || 0), 0);
    document.getElementById("summarySavings").querySelector(".value").textContent = `₹${totalSavings.toLocaleString()}`;

    // Render sections with enhanced cards
    renderEnhancedList(abnormalDiv, json.abnormal || [], "No abnormal activity detected", "abnormal", labStats);
    renderEnhancedList(safeDiv, json.safe || [], "All labs are operating within safe parameters", "safe", labStats);
    renderEnhancedList(efficientDiv, json.efficient || [], "No labs identified as particularly efficient", "efficient", labStats);
    renderEnhancedList(zeroDiv, json.zero || [], "No labs showing zero consumption", "zero", labStats);

    // Save insights
    await db.collection("AIInsights").doc(user.uid).set({
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      summary: json,
      labStats: labStats,
      totalSavings: totalSavings
    }, { merge: true });

    // Store for export
    window.currentInsightsData = {
      summary: json,
      labStats: labStats,
      totalSavings: totalSavings
    };

    // Render trend chart
    renderTrendChart(records, labStats);

  } catch (err) {
    console.error("AI Insights Error:", err);
    safeDiv.innerHTML = abnormalDiv.innerHTML = efficientDiv.innerHTML = zeroDiv.innerHTML = 
      `<div class="empty-state"><span class="material-icons">error</span><p>Error generating insights: ${err.message}</p></div>`;
  }
}

// Trend Chart Function
let trendChartInstance = null;

function renderTrendChart(records, labStats) {
  const canvas = document.getElementById('trendChart');
  if (!canvas) return;

  // Group records by date
  const dailyData = {};
  const labColors = {
    'Computer Lab': '#22c55e',
    'Electronics Lab': '#3b82f6',
    'Physics Lab': '#f59e0b',
    'Chemistry Lab': '#ef4444'
  };

  records.forEach(record => {
    const date = new Date(record.timestamp);
    const dateKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    if (!dailyData[dateKey]) {
      dailyData[dateKey] = {};
    }
    
    if (!dailyData[dateKey][record.lab]) {
      dailyData[dateKey][record.lab] = 0;
    }
    
    dailyData[dateKey][record.lab] += record.energy || 0;
  });

  // Get all unique dates and labs
  const dates = Object.keys(dailyData).sort((a, b) => {
    return new Date(a) - new Date(b);
  });
  const labs = Object.keys(labStats);

  // Prepare datasets for each lab
  const datasets = labs.map(lab => ({
    label: lab,
    data: dates.map(date => dailyData[date]?.[lab] || 0),
    borderColor: labColors[lab] || '#6b7280',
    backgroundColor: labColors[lab] ? labColors[lab] + '40' : '#6b728040',
    tension: 0.4,
    fill: false
  }));

  // Destroy existing chart if it exists
  if (trendChartInstance) {
    trendChartInstance.destroy();
  }

  // Create new chart
  trendChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels: dates,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Energy (kWh)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Date'
          }
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    }
  });
}

function renderEnhancedList(div, items, emptyMsg, category, labStats) {
  div.classList.remove("loading");
  
  if (!items || items.length === 0) {
    div.innerHTML = `<div class="empty-state"><span class="material-icons">check_circle</span><p>${emptyMsg}</p></div>`;
    return;
  }

  div.innerHTML = items.map((item, index) => {
    const stats = labStats[item.lab] || {};
    const priorityClass = item.priority?.toLowerCase() || 'low';
    
    return `
      <div class="lab-card ${category}" data-index="${index}" onclick="toggleCard(this)">
        <div class="lab-card-header">
          <div class="lab-card-title">${item.lab}</div>
          ${item.priority ? `<div class="lab-card-priority ${priorityClass}">${item.priority}</div>` : ''}
        </div>
        <div class="lab-card-reason">${item.reason}</div>
        <div class="lab-card-details">
          <div class="lab-metrics">
            <div class="metric">
              <div class="metric-label">Avg Energy</div>
              <div class="metric-value">${(item.avgEnergy || stats.avg || 0).toFixed(2)} kWh</div>
            </div>
            <div class="metric">
              <div class="metric-label">Max Energy</div>
              <div class="metric-value">${(stats.max || 0).toFixed(2)} kWh</div>
            </div>
            <div class="metric">
              <div class="metric-label">Total Cost</div>
              <div class="metric-value">₹${(stats.cost || 0).toFixed(2)}</div>
            </div>
            <div class="metric">
              <div class="metric-label">Records</div>
              <div class="metric-value">${stats.count || 0}</div>
            </div>
          </div>
          ${item.recommendations && item.recommendations.length > 0 ? `
            <div class="recommendations">
              <h5><span class="material-icons" style="font-size:16px;">lightbulb</span> Recommendations</h5>
              <ul>
                ${item.recommendations.map(rec => `<li>${rec}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          ${item.savings > 0 ? `
            <div class="cost-savings">
              <h5>Potential Monthly Savings</h5>
              <div class="savings-amount">₹${item.savings.toLocaleString()}</div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function toggleCard(card) {
  card.classList.toggle('expanded');
}

// Make toggleCard available globally
window.toggleCard = toggleCard;