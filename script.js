const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const homeOptions = document.getElementById("homeOptions");
const backBtn = document.getElementById("backBtn");
const summaryDiv = document.getElementById("summary");
const content = document.getElementById("content");
const multiplierDiv = document.getElementById("multiplierTable");
const tableBody = multiplierDiv.querySelector("tbody");
const countHeader = document.getElementById("countHeader");

let mode = null;
let rawData = [];
let currentView = 'months'; // months | days | hours | multi

uploadBtn.onclick = () => fileInput.click();
fileInput.onchange = (e) => {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  rawData = [];
  let loaded = 0;
  files.forEach((file) => {
    const r = new FileReader();
    r.onload = (ev) => {
      try {
        let parsed = JSON.parse(ev.target.result);
        if (!Array.isArray(parsed)) parsed = [parsed];
        rawData.push(...parsed);
      } catch (err) {
        alert("Invalid JSON: " + file.name);
      }
      loaded++;
      if (loaded === files.length && mode) render();
    };
    r.readAsText(file);
  });
};

function chooseMode(m) {
  mode = m;
  homeOptions.style.display = "none";
  backBtn.style.display = "block";
  render();
}


// === PNL ANALYSIS ===
const monthsNames = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];
function pad(n) {
  return String(n).padStart(2, "0");
}
function preprocess() {
  rawData.forEach((item) => {
    const amount = Number(item.data?.amount ?? 0);
    const payout = Number(item.data?.payout ?? 0);
    item.pnl = payout - amount;
    const dt = item.created_at ? new Date(item.created_at) : new Date();
    const y = dt.getUTCFullYear(),
      m = dt.getUTCMonth() + 1,
      d = dt.getUTCDate(),
      h = dt.getUTCHours();
    item._utcDateISO = `${y}-${pad(m)}-${pad(d)}`;
    item._utcMonthKey = `${y}-${pad(m)}`;
    item._utcHour = h;
  });
}
function groupByMonths() {
  const m = {};
  rawData.forEach((it) => {
    (m[it._utcMonthKey] ??= []).push(it);
  });
  return m;
}
function groupByDays(monthItems) {
  const d = {};
  monthItems.forEach((it) => {
    (d[it._utcDateISO] ??= []).push(it);
  });
  return d;
}
function groupByHours(dayItems) {
  const hours = {};
  dayItems.forEach((it) => {
    const h = it._utcHour;
    if (!hours[h]) hours[h] = { pnl: 0, count: 0 };
    hours[h].pnl += it.pnl;
    hours[h].count += 1;
  });
  return hours;
}

function showSummary() {
  const totalPNL = rawData.reduce((s, i) => s + i.pnl, 0);
  const totalGames = rawData.length;
  const wins = rawData.filter((i) => i.pnl > 0).length;
  const winRate = totalGames ? (wins / totalGames) * 100 : 0;
  summaryDiv.style.display = "block";
  summaryDiv.innerHTML = `<h2>Overall Summary</h2>
      <p>Total Records: <strong>${totalGames}</strong></p>
      <p>Overall PNL: <strong class="${totalPNL >= 0 ? "profit" : "loss"
    }">${totalPNL.toFixed(2)}</strong></p>
      <p>Win rate: <strong>${winRate.toFixed(
      2
    )}%</strong> (${wins}/${totalGames})</p>`;
}

let currentMonthItems = null;
let currentMonthLabel = null;
let currentDayItems = null;
let currentDayLabel = null;

function showMonths() {
  currentView = 'months';
  content.innerHTML = "";
  showSummary();

  currentMonthItems = null;
  currentMonthLabel = null;
  currentDayItems = null;
  currentDayLabel = null;

  const months = groupByMonths();
  Object.keys(months)
    .sort((a, b) => b.localeCompare(a))
    .forEach((monthKey) => {
      const items = months[monthKey];
      const totalPNL = items.reduce((s, i) => s + i.pnl, 0);
      const totalGames = items.length;
      const [y, mm] = monthKey.split("-");
      const monthName = monthsNames[Number(mm) - 1];
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `<h3>${monthName} ${y}</h3><p>Games: <strong>${totalGames}</strong></p>
        <p>PNL: <strong class="${totalPNL >= 0 ? "profit" : "loss"}">${totalPNL.toFixed(2)}</strong></p>`;
      card.onclick = () => showDays(items, monthName + " " + y);
      content.appendChild(card);
    });
}

function showDays(monthItems, label) {
  currentView = 'days';
  currentMonthItems = monthItems;
  currentMonthLabel = label;

  content.innerHTML = "";
  const days = groupByDays(monthItems);
  Object.keys(days)
    .sort((a, b) => b.localeCompare(a))
    .forEach((dayKey) => {
      const items = days[dayKey];
      const totalPNL = items.reduce((s, i) => s + i.pnl, 0);
      const totalGames = items.length;
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `<h3>${dayKey}</h3><p>Games: <strong>${totalGames}</strong></p>
        <p>PNL: <strong class="${totalPNL >= 0 ? "profit" : "loss"}">${totalPNL.toFixed(2)}</strong></p>`;
      card.onclick = () => showHours(items, dayKey);
      content.appendChild(card);
    });
}

function showHours(dayItems, label) {
  currentView = 'hours';
  currentDayItems = dayItems;
  currentDayLabel = label;

  content.innerHTML = "";
  summaryDiv.style.display = "none";

  const hours = groupByHours(dayItems);
  const wrapper = document.createElement("div");
  wrapper.style.gridColumn = "1/-1";
  wrapper.innerHTML = `<h2>Hourly PNL and Games (${label})</h2>`;

  const table = document.createElement("table");
  table.id = "hourlyTable";
  table.innerHTML = `
    <thead>
      <tr>
        <th>Hour (UTC)</th>
        <th>Games</th>
        <th>PNL</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector("tbody");

  for (let h = 0; h < 24; h++) {
    const data = hours[h] || { pnl: 0, count: 0 };
    let cls = "neutral";
    if (data.pnl > 0) cls = "profit";
    else if (data.pnl < 0) cls = "loss";
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${pad(h)}:00</td>
      <td>${data.count}</td>
      <td class="${cls}">${data.pnl.toFixed(2)}</td>
    `;
    tbody.appendChild(row);
  }

  wrapper.appendChild(table);
  content.appendChild(wrapper);
}


const buckets = [
  0,
  1.01, 1.02, 1.03, 1.04, 1.05, 1.06, 1.07, 1.08, 1.09, 1.1,
  1.15, 1.2, 1.25, 1.3, 1.35, 1.4, 1.45, 1.5,
  2, 3, 10, 50, 100, 500, 1000
];

function runMultiplier() {
  currentView = "multi";
  const counts = {};
  buckets.forEach((b) => (counts[b] = 0));
  rawData.forEach((obj) => {
    const m = obj?.data?.payoutMultiplier;
    if (typeof m === "number") {
      let bucket = buckets.find((b) => m <= b);
      counts[bucket] = (counts[bucket] || 0) + 1;
    }
  });
  tableBody.innerHTML = "";
  let total = Object.values(counts).reduce((a, b) => a + b, 0);
  countHeader.textContent = `Count (Total: ${total})`;
  for (let k in counts) {
    const percentage = total ? ((counts[k] / total) * 100).toFixed(2) : "0.00";
    tableBody.innerHTML += `<tr><td>${k}</td><td>${counts[k]}</td><td>${percentage}%</td></tr>`;
  }
  multiplierDiv.style.display = "block";
}

// === Render based on mode ===
function render() {
  if (!rawData.length) return;
  preprocess();
  if (mode === "pnl") {
    multiplierDiv.style.display = "none";
    showMonths();
  } else if (mode === "multiplier") {
    summaryDiv.style.display = "none";
    content.innerHTML = "";
    runMultiplier();
  }
}

backBtn.onclick = () => {
  if (currentView === 'days') {
    showMonths();
  } else if (currentView === 'hours') {
    showDays(currentMonthItems, currentMonthLabel);
  } else if (currentView === 'multi' || 'months') {
    // Go back to home
    currentView = 'months';
    // reset view
    homeOptions.style.display = "";
    backBtn.style.display = "";
    summaryDiv.style.display = "none";
    content.innerHTML = "";
    multiplierDiv.style.display = "none";
    mode = null; // reset mode
  }
};
