function checkSafeModeEntry(h, thr, maxDelay) {
  const i = h.findIndex(s => s.v < thr);
  if (i === -1) return true;
  const j = Math.min(i + maxDelay, h.length - 1);
  return h[j].mode === "SAFE_MODE";
}

function checkNoReturnInEclipse(h) {
  for (let i = 1; i < h.length; i++) {
    if (h[i - 1].mode === "SAFE_MODE" && h[i].mode === "NOMINAL" && h[i].eclipse) return false;
  }
  return true;
}

// decisions: { ruleId: "approved" | "rejected" }
function verify(params, decisions) {
  const hist = simulate(params);
  const active = RULES.filter(r => r.status === "auto" || decisions[r.id] === "approved");
  const results = active.map(r => ({
    id: r.id, text: r.text, source: r.source, status: r.status, pass: r.check(hist)
  }));
  const pending = RULES.filter(r => r.status === "review" && !decisions[r.id]);
  const anyFail = results.some(r => !r.pass);
  const verdict = anyFail ? "NO-GO" : pending.length > 0 ? "REVIEW" : "GO";
  return { hist, results, pending, verdict, timestamp: new Date().toISOString() };
}