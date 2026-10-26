const state = {
  view: "start", patch: "A", decisions: {},
  cache: {},                 // per patch: { result, signoff }
  running: false, analyzed: false, pendingDecision: null
};
const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const cur = () => state.cache[state.patch] || {};
const VIEWS = ["start", "rules", "verify", "signoff", "report"];

function fmtTime(iso) {
  const d = new Date(iso);
  const local = d.toLocaleString("en-GB", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    timeZoneName: "short"
  });
  return `${local} (UTC ${iso.slice(11, 19)})`;
}

function show(v) {
  if (state.running) return;            // no navigation while an animation runs
  if (v !== "start" && !state.analyzed) {
    v = "start";                        // steps are locked until the analysis is done
    $("bar-label").textContent = "Run the analysis first.";
  }
  state.view = v;
  VIEWS.forEach(n => {
    $("view-" + n).classList.toggle("active", n === v);
    $("step-" + n).classList.toggle("active", n === v);
    if (n !== "start") $("step-" + n).classList.toggle("locked", !state.analyzed);
  });
  if (v === "verify") selectPatch(state.patch);
  if (v === "signoff") renderSignoff();
  if (v === "report") renderReport();
}

/* ---------- Step 0: start / analysis animation ---------- */
function setBar(pct, label) {
  $("bar-fill").style.width = pct + "%";
  $("bar-label").textContent = label;
}

function startOrContinue() {
  if (state.analyzed) show("rules"); else runAnalysis();
}

async function runAnalysis() {
  if (state.running) return;
  state.running = true;
  $("btn-start").disabled = true;
  $("scan-log").innerHTML = "";
  $("gaps").style.display = "none";

  const phases = [
    { label: "Scanning documentation (EPS-SRD.md)...", rules: RULES.filter(r => r.origin === "document") },
    { label: "Scanning code (eps_telemetry.c, eps_config.h)...", rules: RULES.filter(r => r.origin === "code") },
    { label: "Cross-checking sources and change history...", rules: [] }
  ];
  const total = RULES.length + 1;
  let done = 0;
  setBar(0, "Loading project files...");
  await sleep(700);

  for (const ph of phases) {
    setBar(Math.round((done / total) * 100), ph.label);
    await sleep(600);
    for (const r of ph.rules) {
      done++;
      setBar(Math.round((done / total) * 100), `${ph.label} ${r.id}`);
      await sleep(450);
      const warn = r.status === "review";
      const why = r.risk === "critical" ? "critical → human decision"
                : r.ruleStatus === "conflict" ? "sources conflict → human decision"
                : r.confidence < 0.8 ? "low confidence → human decision"
                : "low risk → auto";
      $("scan-log").insertAdjacentHTML("beforeend",
        `<li class="${warn ? "warn" : "pass"}">${warn ? "⚠" : "✔"} <b>${r.id}</b> · ${r.origin} · ${r.risk} · ${why}</li>`);
    }
  }
  const human = RULES.filter(r => r.status === "review").length;
  setBar(100, `Done: ${RULES.length - human} auto (low risk), ${human} need a human decision`);

  $("gaps").innerHTML = `<h2>Knowledge gaps detected</h2><ul>${QUESTIONS.map(q => `<li>${q}</li>`).join("")}</ul>`;
  $("gaps").style.display = "block";

  state.running = false;
  state.analyzed = true;
  VIEWS.forEach(n => { if (n !== "start") $("step-" + n).classList.remove("locked"); });
  $("btn-start").disabled = false;
  $("btn-start").textContent = "Continue to rules →";
}

/* ---------- Step 1: rules ---------- */
function renderRules() {
  const human = RULES.filter(r => r.status === "review").length;
  $("rules-counter").textContent =
    `${RULES.length - human} auto (low risk) · ${human} human (critical / conflict / low confidence)`;
  $("rules-body").innerHTML = RULES.map(r => {
    const d = state.decisions[r.id];
    const needs = r.status === "review";
    let decision;
    if (!needs) decision = `<span class="tag auto">AUTO ✓</span>`;
    else if (d) decision = `<span class="tag ${d}">${d.toUpperCase()}</span>`;
    else decision = `<button class="ok" onclick="decide('${r.id}','approved')">Approve</button>
                     <button class="no" onclick="decide('${r.id}','rejected')">Reject</button>`;
    const rowCls = (needs && !d ? "review " : "") + (r.risk === "critical" ? "critical-row" : "");
    return `<tr class="${rowCls}">
      <td><b>${r.id}</b></td>
      <td>${r.risk === "critical" ? " " : ""}${r.text}</td>
      <td class="src">${r.source}</td>
      <td><span class="tag origin">${r.origin}</span></td>
      <td><span class="tag ${r.risk}">${r.risk}</span></td>
      <td><span class="tag ${r.ruleStatus}">${r.ruleStatus}</span></td>
      <td>${Math.round(r.confidence * 100)}%</td>
      <td>${decision}</td></tr>`;
  }).join("");
}

function decide(id, d) {
  state.decisions[id] = d;
  state.cache = {};          // rule decisions changed: earlier analyses and sign-offs are stale
  renderRules();
}

/* ---------- Step 2: analysis ---------- */
const staticItems = res => res.staticWarnings.length
  ? res.staticWarnings.map(w => `<li class="warn">⚠ ${w.message}</li>`).join("")
  : `<li class="ok-static">✔ No constants changed, no rule-linked changes detected</li>`;

const testItem = r =>
  `<li class="${r.pass ? "pass" : "fail"}">${r.pass ? "✔ PASS" : "✘ FAIL"} · <b>${r.id}</b> ${r.text}</li>`;

const progressDone = res =>
  `${res.results.filter(r => r.pass).length}/${res.results.length} tests passed · Environment: SIL`;

function clearVerifyView() {
  $("test-list").innerHTML = "";
  $("static-list").innerHTML = "";
  $("static-title").style.display = "none";
  $("test-title").style.display = "none";
  $("progress").textContent = "";
  $("verdict").style.display = "none";
  $("btn-report").style.display = "none";
  $("btn-verify").textContent = "Analyze patch";
  $("btn-verify").disabled = false;
  const c = $("chart"); c.getContext("2d").clearRect(0, 0, c.width, c.height);
}

function paintVerdict(res) {
  const msg = {
    "APPROVE": "System suggests the update can be uploaded",
    "BLOCK": "System suggests blocking: safety requirement violated",
    "REVIEW": res.pending.length
      ? `${res.pending.length} rule(s) await human decision`
      : "Static warnings require engineer attention"
  }[res.recommendation];
  const v = $("verdict");
  v.className = "verdict " + res.recommendation;
  v.innerHTML = `Recommendation: ${res.recommendation}<small>${msg}<br>Final decision: responsible engineer</small>`;
  v.style.display = "block";
  $("btn-report").style.display = "inline-block";
  $("btn-verify").textContent = "Re-run analysis";
  $("btn-verify").disabled = false;
}

// Instant (no animation) repaint of a stored result
function paintResult(res) {
  $("static-title").style.display = "block";
  $("static-list").innerHTML = staticItems(res);
  $("test-title").style.display = "block";
  $("test-list").innerHTML = res.results.map(testItem).join("");
  $("progress").textContent = progressDone(res);
  drawChart($("chart"), res.hist, res.hist.length);
  paintVerdict(res);
}

function selectPatch(p) {
  if (state.running) return;
  state.patch = p;
  state.pendingDecision = null;
  ["A", "B", "C"].forEach(x => $("btn-" + x).classList.toggle("selected", x === p));
  $("patch-name").textContent = PATCHES[p].name;
  $("patch-diff").textContent = PATCHES[p].diff;
  clearVerifyView();
  const c = state.cache[p];
  if (c && c.result) paintResult(c.result);
}

async function runVerify() {
  if (state.running) return;
  clearVerifyView();
  state.running = true;
  $("btn-verify").disabled = true;
  const patch = PATCHES[state.patch];
  const res = verify(patch.params, state.decisions, patch);

  // Phase 1: static checks (no simulator needed)
  $("static-title").style.display = "block";
  $("progress").textContent = "Running static checks...";
  await sleep(700);
  $("static-list").innerHTML = staticItems(res);
  await sleep(800);

  // Phase 2: SIL simulation tests
  $("test-title").style.display = "block";
  const n = res.results.length;
  for (let i = 0; i < n; i++) {
    $("progress").textContent = `Running SIL test ${i + 1}/${n}...`;
    await sleep(450);
    $("test-list").insertAdjacentHTML("beforeend", testItem(res.results[i]));
  }
  $("progress").textContent = progressDone(res);

  await new Promise(resolve => {
    let k = 0;
    (function step() {
      k += 60;
      drawChart($("chart"), res.hist, k);
      if (k < res.hist.length) requestAnimationFrame(step); else resolve();
    })();
  });

  state.cache[state.patch] = { result: res, signoff: null };   // remember for this patch
  state.running = false;
  paintVerdict(res);
}

/* ---------- Step 3: engineer sign-off ---------- */
const DEC_LABEL = { APPROVE: "Approve upload", BLOCK: "Block", REVIEW: "Send to review" };

function renderSignoff() {
  const c = cur(), res = c.result;
  const box = $("signoff-summary");
  $("signoff-done").style.display = "none";
  $("btn-open-report").style.display = "none";
  if (!res) {
    box.innerHTML = `<p>No analysis for Patch ${state.patch} yet. Run it in step 2.</p>`;
    $("signoff-form").style.display = "none";
    return;
  }
  const p = PATCHES[state.patch];
  const passed = res.results.filter(r => r.pass).length;
  box.innerHTML = `
    <div class="row"><span class="k">Patch</span><span>${p.name}</span></div>
    <div class="row"><span class="k">System recommendation</span><span class="tag ${res.recommendation === "APPROVE" ? "auto" : res.recommendation === "BLOCK" ? "critical" : "pending"}">${res.recommendation}</span></div>
    <div class="row"><span class="k">Static warnings</span><span>${res.staticWarnings.length}</span></div>
    <div class="row"><span class="k">SIL tests passed</span><span>${passed}/${res.results.length}</span></div>
    <div class="row"><span class="k">Rules awaiting decision</span><span>${res.pending.length}</span></div>
    <div class="row"><span class="k">Change coverage by rules</span><span>${res.coverage}%</span></div>
    <div class="row"><span class="k">Not covered by simulation</span><span>${res.scope.notCovered}</span></div>`;

  if (c.signoff) { showSigned(); return; }
  $("signoff-form").style.display = "block";
  $("signoff-error").textContent = "";
  $("mismatch").style.display = "none";
  ["APPROVE", "BLOCK", "REVIEW"].forEach(x => $("dec-" + x).classList.remove("selected"));
}

function pickDecision(d) {
  const c = cur();
  if (c.signoff || !c.result) return;
  state.pendingDecision = d;
  ["APPROVE", "BLOCK", "REVIEW"].forEach(x => $("dec-" + x).classList.toggle("selected", x === d));
  $("mismatch").style.display = d !== c.result.recommendation ? "block" : "none";
}

function signDecision() {
  const c = cur();
  if (c.signoff || !c.result) return;
  const name = $("eng-name").value.trim();
  const reason = $("eng-reason").value.trim();
  const d = state.pendingDecision;
  const err = $("signoff-error");
  if (!name) { err.textContent = "Enter the name of the responsible engineer."; return; }
  if (!d) { err.textContent = "Choose a decision."; return; }
  if (d !== c.result.recommendation && !reason) {
    err.textContent = "Your decision differs from the recommendation: justification is required."; return;
  }
  c.signoff = { engineer: name, decision: d, reason: reason || "Consistent with system recommendation",
                time: new Date().toISOString() };
  showSigned();
}

function showSigned() {
  const s = cur().signoff;
  $("signoff-form").style.display = "none";
  const done = $("signoff-done");
  done.innerHTML = `<b>Decision recorded:</b> ${DEC_LABEL[s.decision]}<br>
    Engineer: <span id="so-name"></span> · ${fmtTime(s.time)}<br>
    Justification: <span id="so-reason"></span>`;
  done.style.display = "block";
  $("so-name").textContent = s.engineer;
  $("so-reason").textContent = s.reason;
  $("btn-open-report").style.display = "inline-block";
}

/* ---------- Step 4: report ---------- */
function fakeHash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, "0") + "a41f9c02";
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function renderReport() {
  const c = cur(), res = c.result, so = c.signoff;
  if (!res) {
    $("report").innerHTML = `<h1>No analysis yet</h1><p>Run the analysis for Patch ${state.patch} first (step 2).</p>`;
    return;
  }
  const p = PATCHES[state.patch];

  const rows = res.results.map(r => `<tr>
      <td><b>${r.id}</b></td><td>${r.text}</td><td>${r.source}</td>
      <td>${r.origin}</td><td>${r.risk}</td><td>${r.ruleStatus}</td>
      <td>${r.status === "auto" ? "Auto (low risk)" : "Human-approved"}</td>
      <td>${r.pass ? "PASS" : "FAIL"}</td></tr>`).join("");

  const statics = res.staticWarnings.length
    ? `<ul>${res.staticWarnings.map(w => `<li>⚠ ${w.message}</li>`).join("")}</ul>`
    : `<p>No constants changed, no rule-linked changes detected.</p>`;

  const gaps = `<ul>${QUESTIONS.map(q => `<li>${q} <i>(status: open)</i></li>`).join("")}</ul>`;

  const pend = res.pending.length
    ? `<p><b>Rules without human decision:</b> ${res.pending.map(r => r.id).join(", ")}</p>` : "";

  const decision = so
    ? `<b>${DEC_LABEL[so.decision]}</b><br>Engineer: ${esc(so.engineer)}<br>Time: ${fmtTime(so.time)}<br>Justification: ${esc(so.reason)}`
    : `<i>Not signed yet. This report is a draft until the responsible engineer records a decision.</i>`;

  $("report").innerHTML = `
    <h1>Verification Evidence Report</h1>
    <div class="meta">
      Patch: ${p.name}<br>
      Patch hash: ${fakeHash(p.diff)}<br>
      Requirements baseline: EPS-SRD v1.0 · DEMOSAT-1<br>
      Generated: ${fmtTime(res.timestamp)}<br>
      Demo data: documentation, code and satellite are fictional
    </div>

    <h2>Recommendation vs engineer decision</h2>
    <div class="cmp">
      <div><h3>System recommendation</h3><div class="verdict ${res.recommendation}">${res.recommendation}</div></div>
      <div><h3>Engineer decision</h3>${decision}</div>
    </div>

    <h2>Traceability: rule → source → test → result</h2>
    <table>
      <thead><tr><th>ID</th><th>Rule</th><th>Source</th><th>Origin</th><th>Risk</th><th>Rule status</th><th>Approval</th><th>Result</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${pend}

    <h2>Static checks</h2>
    ${statics}

    <h2>Environment and scope</h2>
    <p><b>Environment level:</b> ${res.environment} (simulator)<br>
    <b>Covered:</b> ${res.scope.covered}<br>
    <b>Not covered:</b> ${res.scope.notCovered}<br>
    Min battery voltage in simulation: ${Math.min(...res.hist.map(s => s.v)).toFixed(2)} V</p>

    <h2>Coverage</h2>
    <p>${res.coverage}% of changed elements are covered by at least one rule.</p>

    <h2>Knowledge gaps</h2>
    ${gaps}

    <div class="footer-note">This report supports, but does not replace, the decision of the responsible engineer.
    Final decision rests with the responsible engineer.</div>`;
}

/* ---------- Keyboard shortcuts ---------- */
document.addEventListener("keydown", e => {
  if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;   // do not hijack typing
  if (e.code === "Space") {
    e.preventDefault();
    if (state.view === "start") startOrContinue();
    else if (state.view === "rules") show("verify");
    else if (state.view === "verify") { if (cur().result) show("signoff"); else runVerify(); }
    else if (state.view === "signoff" && cur().signoff) show("report");
  } else if (e.key === "1" && state.view === "verify") selectPatch("A");
  else if (e.key === "2" && state.view === "verify") selectPatch("B");
  else if (e.key === "3" && state.view === "verify") selectPatch("C");
  else if (e.key.toLowerCase() === "r") resetDemo();
});
document.addEventListener("keyup", e => {
  if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
  if (e.code === "Space") e.preventDefault();
});

function resetDemo() {
  if (state.running) return;
  state.decisions = {};
  state.cache = {};
  state.analyzed = false;
  state.pendingDecision = null;
  $("scan-log").innerHTML = "";
  $("gaps").style.display = "none";
  $("btn-start").textContent = "Start analysis";
  $("eng-name").value = "";
  $("eng-reason").value = "";
  setBar(0, "");
  renderRules();
  selectPatch("A");
  show("start");
}

renderRules();
selectPatch("A");
show("start");   // forces the initial view: only Start is visible