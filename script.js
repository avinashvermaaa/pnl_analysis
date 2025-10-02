// === Helper utilities ===
const monthsNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function pad(n){ return String(n).padStart(2,'0'); }
function isoToDisplay(isoDateStr){ // "2025-09-29" -> "29 Sep 2025"
  const [y,m,d] = isoDateStr.split('-');
  return `${Number(d)} ${monthsNames[Number(m)-1]} ${y}`;
}

// === State ===
let rawData = [];
const content = document.getElementById('content');
const summaryDiv = document.getElementById('summary');
const backBtn = document.getElementById('backBtn');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');

let currentView = 'months'; // months | days | hours
let selectedMonthKey = null; // e.g. "2025-09"
let selectedDayKey = null;   // e.g. "2025-09-29"

// === File upload ===
uploadBtn.onclick = () => fileInput.click();
fileInput.onchange = (e) => {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  rawData = [];
  let loaded = 0;
  files.forEach(file => {
    const r = new FileReader();
    r.onload = ev => {
      try {
        let parsed = JSON.parse(ev.target.result);
        if (!Array.isArray(parsed)) parsed = [parsed];
        rawData.push(...parsed);
      } catch (err) {
        alert('Invalid JSON in file: ' + file.name);
      }
      loaded++;
      if (loaded === files.length) {
        preprocess();
        showMonths();
      }
    };
    r.readAsText(file);
  });
};

// === Preprocess: compute pnl and UTC-based keys ===
function preprocess(){
  rawData.forEach(item => {
    const amount = Number(item.data?.amount ?? 0) || 0;
    const payout = Number(item.data?.payout ?? 0) || 0;
    item.pnl = payout - amount;

    let dt;
    if (item.created_at) dt = new Date(item.created_at);
    else if (typeof item.data?.createdAt === 'number') dt = new Date(item.data.createdAt);
    else dt = new Date();

    const y = dt.getUTCFullYear();
    const m = dt.getUTCMonth() + 1;
    const d = dt.getUTCDate();
    const h = dt.getUTCHours();

    item._utcDateISO = `${y}-${pad(m)}-${pad(d)}`;
    item._utcMonthKey  = `${y}-${pad(m)}`;
    item._utcHour      = h;
  });

  rawData.sort((a,b) => {
    const ta = a.created_at ? Date.parse(a.created_at) : (a.data?.createdAt || 0);
    const tb = b.created_at ? Date.parse(b.created_at) : (b.data?.createdAt || 0);
    return ta - tb;
  });
}

// === Groupers ===
function groupByMonths(){
  const months = {};
  rawData.forEach(it => {
    const key = it._utcMonthKey;
    if (!months[key]) months[key] = [];
    months[key].push(it);
  });
  return months;
}

function groupByDays(monthItems){
  const days = {};
  monthItems.forEach(it => {
    const key = it._utcDateISO;
    if (!days[key]) days[key] = [];
    days[key].push(it);
  });
  return days;
}

function groupByHours(dayItems){
  const hours = {};
  dayItems.forEach(it => {
    const h = it._utcHour;
    if (!hours[h]) hours[h] = { pnl:0, count:0 };
    hours[h].pnl += it.pnl;
    hours[h].count += 1;
  });
  return hours;
}

// === Views ===
function showSummary(){
  const totalPNL = rawData.reduce((s,i) => s + i.pnl, 0);
  const totalGames = rawData.length;
  const wins = rawData.filter(i => i.pnl > 0).length;
  const winRate = totalGames ? (wins / totalGames * 100) : 0;
  summaryDiv.style.display = 'block';
  summaryDiv.innerHTML = `
    <h2>Overall Summary</h2>
    <p>Total Records (Games Played): <strong>${totalGames}</strong></p>
    <p>Overall PNL: <strong class="${totalPNL>=0?'profit':'loss'}">${totalPNL.toFixed(2)}</strong></p>
    <p>Win rate: <strong>${winRate.toFixed(2)}%</strong> (${wins}/${totalGames})</p>
  `;
}

function showMonths(){
  currentView = 'months';
  backBtn.style.display = 'none';
  content.innerHTML = '';
  if (!rawData.length){
    content.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#666;">Upload JSON files to see analysis</p>';
    summaryDiv.style.display = 'none';
    return;
  }
  showSummary();
  const months = groupByMonths();
  const keys = Object.keys(months).sort((a,b) => b.localeCompare(a));
  keys.forEach(monthKey => {
    const items = months[monthKey];
    const totalPNL = items.reduce((s,i) => s + i.pnl, 0);
    const totalGames = items.length;
    const [y,mm] = monthKey.split('-');
    const monthName = monthsNames[Number(mm)-1];
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<h3>${monthName} ${y}</h3>
                      <p>Total Games: <strong>${totalGames}</strong></p>
                      <p>Total PNL: <strong class="${totalPNL>=0?'profit':'loss'}">${totalPNL.toFixed(2)}</strong></p>`;
    card.onclick = () => { selectedMonthKey = monthKey; showDays(months[monthKey]); };
    content.appendChild(card);
  });
}

function showDays(monthItems){
  currentView = 'days';
  backBtn.style.display = 'inline-block';
  content.innerHTML = '';
  summaryDiv.style.display = 'none';
  const days = groupByDays(monthItems);
  const keys = Object.keys(days).sort((a,b) => b.localeCompare(a));
  keys.forEach(dayISO => {
    const items = days[dayISO];
    const totalPNL = items.reduce((s,i) => s + i.pnl, 0);
    const gamesPlayed = items.length;
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<h3>${isoToDisplay(dayISO)}</h3>
                      <p>Games Played: <strong>${gamesPlayed}</strong></p>
                      <p>Total PNL: <strong class="${totalPNL>=0?'profit':'loss'}">${totalPNL.toFixed(2)}</strong></p>`;
    card.onclick = () => { selectedDayKey = dayISO; showHours(days[dayISO]); };
    content.appendChild(card);
  });
}

function showHours(dayItems){
  currentView = 'hours';
  backBtn.style.display = 'inline-block';
  content.innerHTML = '';
  summaryDiv.style.display = 'none';
  const hours = groupByHours(dayItems);
  const wrapper = document.createElement('div');
  wrapper.style.gridColumn = '1/-1';
  wrapper.innerHTML = `<h2>Hourly PNL and Games (${isoToDisplay(selectedDayKey)})</h2>`;
  const hourList = document.createElement('div');
  hourList.style.marginTop = '10px';
  for (let h = 0; h < 24; h++){
    const data = hours[h] || { pnl: 0, count: 0 };
    const row = document.createElement('div');
    row.className = 'hour-row';
    const left = document.createElement('div');
    left.textContent = `${pad(h)}:00`;
    const mid = document.createElement('div');
    mid.textContent = `Games: ${data.count}`;
    const right = document.createElement('div');
    right.innerHTML = `<span class="${data.pnl>=0?'profit':'loss'}">${data.pnl.toFixed(2)}</span>`;
    row.appendChild(left); row.appendChild(mid); row.appendChild(right);
    hourList.appendChild(row);
  }
  wrapper.appendChild(hourList);
  content.appendChild(wrapper);
}

// === Back button handler ===
backBtn.onclick = () => {
  if (currentView === 'days') showMonths();
  else if (currentView === 'hours') {
    const months = groupByMonths();
    if (selectedMonthKey && months[selectedMonthKey]) showDays(months[selectedMonthKey]);
    else showMonths();
  }
};

// initial empty state
showMonths();
