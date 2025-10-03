function fmt(n) { return Number.isFinite(n) ? n.toFixed(2) : '—'; }
function readInputs() {
    return {
        o1: parseFloat(document.getElementById('odds1').value) || 0,
        oX: parseFloat(document.getElementById('oddsX').value) || 0,
        o2: parseFloat(document.getElementById('odds2').value) || 0,
        S: parseFloat(document.getElementById('stakeTotal').value) || 0
    };
}
function compute() {
    const { o1, oX, o2, S } = readInputs();
    if (o1 <= 1 || oX <= 1 || o2 <= 1 || S <= 0) return;
    const a1 = 1 / o1, aX = 1 / oX, a2 = 1 / o2, A = a1 + aX + a2;
    const s1 = S * (a1 / A), sX = S * (aX / A), s2 = S * (a2 / A);
    const R = S / A, profit = R - S;
    document.getElementById('summaryA').textContent = fmt(A);
    document.getElementById('arbBadge').innerHTML = A < 1 ? '<span class="green">YES</span>' : '<span class="red">NO</span>';
    document.getElementById('tblOdds1').textContent = fmt(o1);
    document.getElementById('tblOddsX').textContent = fmt(oX);
    document.getElementById('tblOdds2').textContent = fmt(o2);
    document.getElementById('tblStake1').textContent = fmt(s1);
    document.getElementById('tblStakeX').textContent = fmt(sX);
    document.getElementById('tblStake2').textContent = fmt(s2);
    document.getElementById('tblReturn1').textContent = fmt(s1 * o1);
    document.getElementById('tblReturnX').textContent = fmt(sX * oX);
    document.getElementById('tblReturn2').textContent = fmt(s2 * o2);
    document.getElementById('tblProfit1').textContent = fmt(s1 * o1 - S);
    document.getElementById('tblProfitX').textContent = fmt(sX * oX - S);
    document.getElementById('tblProfit2').textContent = fmt(s2 * o2 - S);
    document.getElementById('resultBox').innerHTML =
        `<div class="row"><div>Total Stake</div><div class="big">₹${fmt(S)}</div></div>
        <div class="row"><div>Equalized Return</div><div class="big">₹${fmt(R)}</div></div>
        <div class="row"><div>Result</div><div>${A < 1 ? '<span class="green">Profit ' + fmt(profit) + '</span>' : '<span class="red">Loss ' + fmt(-profit) + '</span>'}</div></div>`;
}
document.getElementById('calcBtn').onclick = compute;
document.getElementById('preset500').onclick = () => { document.getElementById('stakeTotal').value = 500; compute(); };
document.getElementById('preset1000').onclick = () => { document.getElementById('stakeTotal').value = 1000; compute(); };
document.getElementById('preset2000').onclick = () => { document.getElementById('stakeTotal').value = 2000; compute(); };
compute();