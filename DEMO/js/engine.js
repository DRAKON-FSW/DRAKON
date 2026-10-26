// A rule goes to a human by RISK or SOURCE CONFLICT, not only by low model confidence.
function needsHuman(r) {
  return r.risk === "critical" || r.ruleStatus === "conflict" || r.confidence < 0.8;
}
RULES.forEach(r => { r.status = needsHuman(r) ? "review" : "auto"; });

const SCOPE = {
  covered: "battery voltage model, mode transitions, eclipse cycle",
  notCovered: "hardware timing, HW interactions, radiation effects"
};

// Static checks: work without any simulator.
function staticCheck(patch) {
  return patch.staticChecks.map(c => {
    const rule = RULES.find(r => r.id === c.rule);
    const message = rule
      ? `Changed constant ${c.constant} (${c.from} → ${c.to}) is linked to ${rule.risk} rule ${c.rule}`
      : `Changed constant ${c.constant} (${c.from} → ${c.to}) is not linked to any rule: static analysis cannot assess its impact`;
    return { ...c, critical: !!rule && rule.risk === "critical", message };
  });
}

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
function verify(params, decisions, patch) {
  const hist = simulate(params);
  const active = RULES.filter(r => r.status === "auto" || decisions[r.id] === "approved");
  const results = active.map(r => ({
    id: r.id, text: r.text, source: r.source, status: r.status,
    risk: r.risk, origin: r.origin, ruleStatus: r.ruleStatus, pass: r.check(hist)
  }));
  const pending = RULES.filter(r => r.status === "review" && !decisions[r.id]);
  const staticWarnings = patch ? staticCheck(patch) : [];
  const anyFail = results.some(r => !r.pass);

  const recommendation = anyFail ? "BLOCK"
    : (pending.length > 0 || staticWarnings.length > 0) ? "REVIEW" : "APPROVE";
  const verdict = anyFail ? "NO-GO" : pending.length > 0 ? "REVIEW" : "GO";  // old UI

  return { hist, results, pending, staticWarnings, recommendation, verdict,
           environment: "SIL", scope: SCOPE, coverage: patch ? patch.coverage : null,
           timestamp: new Date().toISOString() };
}