const state = { view: "start", patch: "A", decisions: {}, result: null, running: false };
const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));

function show(v) {
  state.view = v;
  ["start", "rules", "verify", "report"].forEach(n => {
    $("view-" + n).classList.toggle("active", n === v);
    $("step-" + n).classList.toggle("active", n === v);
  });
  if (v === "report") renderReport();
}

/* ---------- Step 0: start / analysis animation ---------- */
function setBar(pct, label) {
  $("bar-fill").style.width = pct + "%";
  $("bar-label").textContent = label;
}

async function runAnalysis() {
  if (state.running) return;
  state.running = true;
  $("btn-start").disabled = true;
  $("scan-log").innerHTML = "";
  setBar(0, "Loading EPS-SRD.md...");
  await sleep(700);

  const n = RULES.length;
  for (let i = 0; i < n; i++) {
    const r = RULES[i];
    setBar(Math.round((i / n) * 100), `Scanning ${r.id} (${i + 1}/${n})...`);
    await sleep(550);
    const flagged = r.status === "review";
    $("scan-log").insertAdjacentHTML("beforeend",
      `<li class="${flagged ? "warn" : "pass"}">${flagged ? "⚠" : "✔"} <b>${r.id}</b> · ${r.source} · confidence ${Math.round(r.confidence * 100)}% → ${flagged ? "flagged for human review" : "rule accepted"}</li>`);
  }

  const rev = RULES.filter(r => r.status === "review").length;
  setBar(100, `Done: ${n - rev} rules accepted, ${rev} need a human decision`);
  await sleep(1200);

  state.running = false;
  $("btn-start").disabled = false;
  show("rules");
}

/* ---------- Step 1: rules ---------- */
function renderRules() {
  const auto = RULES.filter(r => r.status === "auto").length;
  const rev = RULES.length - auto;
  $("rules-counter").textContent = `${auto} approved automatically · ${rev} need a human decision`;
  $("rules-body").innerHTML = RULES.map(r => {
    const d = state.decisions[r.id];
    let status;
    if (r.status === "auto") status = `<span class="tag auto">AUTO ✓</span>`;
    else if (d) status = `<span class="tag ${d}">${d.toUpperCase()}</span>`;
    else status = `<button class="ok" onclick="decide('${r.id}','approved')">Approve</button>
                   <button class="no" onclick="decide('${r.id}','rejected')">Reject</button>`;
    return `<tr class="${r.status === "review" && !d ? "review" : ""}">
      <td><b>${r.id}</b></td><td>${r.text}</td><td class="src">${r.source}</td>
      <td>${Math.round(r.confidence * 100)}%</td><td>${status}</td></tr>`;
  }).join("");
}

function decide(id, d) { state.decisions[id] = d; renderRules(); }

/* ---------- Step 2: verification ---------- */
function selectPatch(p) {
  if (state.running) return;
  state.patch = p;
  state.result = null;
  ["A", "B"].forEach(x => $("btn-" + x).classList.toggle("selected", x === p));
  $("patch-name").textContent = PATCHES[p].name;
  $("patch-diff").textContent = PATCHES[p].diff;
  $("test-list").innerHTML = "";
  $("progress").textContent = "";
  $("verdict").style.display = "none";
  $("btn-report").style.display = "none";
  const c = $("chart"); c.getContext("2d").clearRect(0, 0, c.width, c.height);
}

async function runVerify() {
  if (state.running) return;
  selectPatch(state.patch);
  state.running = true;
  $("btn-verify").disabled = true;
  const res = verify(PATCHES[state.patch].params, state.decisions);
  state.result = res;

  const n = res.results.length;
  for (let i = 0; i < n; i++) {
    $("progress").textContent = `Running test ${i + 1}/${n}...`;
    await sleep(450);
    const r = res.results[i];
    $("test-list").insertAdjacentHTML("beforeend",
      `<li class="${r.pass ? "pass" : "fail"}">${r.pass ? "✔ PASS" : "✘ FAIL"} · <b>${r.id}</b> ${r.text}</li>`);
  }
  $("progress").textContent = `${res.results.filter(r => r.pass).length}/${n} tests passed`;

  // Animate the chart
  await new Promise(resolve => {
    let k = 0;
    (function step() {
      k += 60;
      drawChart($("chart"), res.hist, k);
      if (k < res.hist.length) requestAnimationFrame(step); else resolve();
    })();
  });

  const v = $("verdict");
  const msg = {
    "GO": "Update can be uploaded",
    "NO-GO": "Update blocked: safety requirement violated",
    "REVIEW": `${res.pending.length} rule(s) await human decision`
  }[res.verdict];
  v.className = "verdict " + res.verdict.replace("-", "");
  v.innerHTML = `${res.verdict}<small>${msg}</small>`;
  v.style.display = "block";
  $("btn-report").style.display = "inline-block";
  $("btn-verify").disabled = false;
  state.running = false;
}

/* ---------- Step 3: report ---------- */
function fakeHash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, "0") + "a41f9c02";
}

function renderReport() {
  const res = state.result;
  if (!res) { $("report").innerHTML = "<h1>No verification yet</h1><p>Run a verification first.</p>"; return; }
  const p = PATCHES[state.patch];
  const rows = res.results.map(r => `<tr>
      <td>${r.id}</td><td>${r.text}</td><td>${r.source}</td>
      <td>${r.status === "auto" ? "Auto-approved" : "Human-approved"}</td>
      <td>${r.pass ? "PASS" : "FAIL"}</td></tr>`).join("");
  const pend = res.pending.length
    ? `<p><b>Pending human decisions:</b> ${res.pending.map(r => r.id).join(", ")}</p>` : "";
  $("report").innerHTML = `
    <h1>Verification Evidence Report</h1>
    <div class="meta">
      Patch: ${p.name}<br>
      Patch hash: ${fakeHash(p.diff)}<br>
      Simulator: DEMOSAT-1 EPS model v0.1 (orbit 90 min, eclipse 30 min)<br>
      Requirements baseline: EPS-SRD v1.0<br>
      Generated: ${res.timestamp}
    </div>
    <div class="verdict ${res.verdict.replace("-", "")}">${res.verdict}</div>
    <h2>Traceability: requirement → test → result</h2>
    <table>
      <thead><tr><th>Requirement</th><th>Rule</th><th>Source</th><th>Approval</th><th>Result</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${pend}
    <p class="meta">Min battery voltage in simulation: ${Math.min(...res.hist.map(s => s.v)).toFixed(2)} V.
    This report supports, but does not replace, the decision of the responsible engineer.</p>`;
}

/* ---------- Keyboard shortcuts ---------- */
document.addEventListener("keydown", e => {
  if (e.code === "Space") {
    e.preventDefault();
    if (state.view === "start") runAnalysis();
    else if (state.view === "rules") show("verify");
    else if (state.view === "verify") { if (state.result) show("report"); else runVerify(); }
  } else if (e.key === "1") selectPatch("A");
  else if (e.key === "2") selectPatch("B");
  else if (e.key.toLowerCase() === "r") resetDemo();
});
document.addEventListener("keyup", e => { if (e.code === "Space") e.preventDefault(); });

function resetDemo() {
  if (state.running) return;
  state.decisions = {};
  state.result = null;
  $("scan-log").innerHTML = "";
  setBar(0, "");
  renderRules();
  selectPatch("A");
  show("start");
}

renderRules();
selectPatch("A");