// Rules inferred once by an LLM from documentation, code and change history (cached).
// risk: "critical" | "low"; origin: "document" | "code" | "human";
// ruleStatus: "confirmed" | "inferred" | "conflict".
// "status" (auto/review) is computed in engine.js by needsHuman().
const RULES = [
  { id: "REQ-EPS-014", confidence: 0.97, risk: "critical", origin: "document", ruleStatus: "confirmed",
    text: "When battery voltage < 7.0 V, enter SAFE_MODE within 10 s.",
    source: "EPS-SRD §4.2.1",
    check: h => checkSafeModeEntry(h, 7.0, 10) },
  { id: "REQ-EPS-021", confidence: 0.95, risk: "critical", origin: "document", ruleStatus: "confirmed",
    text: "Battery voltage must never drop below 6.5 V.",
    source: "EPS-SRD §4.3.1",
    check: h => h.every(s => s.v >= 6.5) },
  { id: "REQ-EPS-030", confidence: 0.93, risk: "critical", origin: "document", ruleStatus: "confirmed",
    text: "No return from SAFE_MODE to NOMINAL during eclipse.",
    source: "EPS-SRD §4.2.2",
    check: h => checkNoReturnInEclipse(h) },
  { id: "REQ-EPS-017", confidence: 0.96, risk: "low", origin: "document", ruleStatus: "confirmed",
    text: "Battery voltage must never exceed 8.4 V.",
    source: "EPS-SRD §4.3.2",
    check: h => h.every(s => s.v <= 8.4 + 1e-9) },
  { id: "REQ-EPS-041", confidence: 0.92, risk: "low", origin: "code", ruleStatus: "inferred",
    text: "Battery voltage is reported as a valid number in every telemetry sample.",
    source: "eps_telemetry.c (inferred from code)",
    check: h => h.every(s => typeof s.v === "number" && !isNaN(s.v)) },
  { id: "REQ-EPS-033", confidence: 0.90, risk: "low", origin: "code", ruleStatus: "conflict",
    text: "Battery voltage telemetry is sampled every 10 s.",
    source: "EPS-SRD §4.5 says 10 s, eps_config.h says 30 s",
    check: h => true },
  { id: "REQ-EPS-009", confidence: 0.58, risk: "low", origin: "document", ruleStatus: "inferred",
    text: "Return to NOMINAL after the battery is sufficiently charged.",
    source: "EPS-SRD §4.4.1 (ambiguous: no threshold given)",
    check: h => true },
  { id: "REQ-EPS-025", confidence: 0.51, risk: "low", origin: "document", ruleStatus: "inferred",
    text: "EPS should react promptly to a low bus voltage condition.",
    source: "EPS-SRD §4.4.2 (ambiguous: 'promptly' not quantified)",
    check: h => true }
];

// Targeted questions to the engineer (knowledge gaps)
const QUESTIONS = [
  "Telemetry sampling: documentation says 10 s, code uses 30 s. Which is correct?",
  "REQ-EPS-009: what voltage threshold allows return to NOMINAL?",
  "REQ-EPS-025: what does 'promptly' mean in seconds?"
];

const PATCHES = {
  A: { name: "Patch 2.3.1: EPS logic refactor",
       params: { safeThreshold: 7.0 },
       coverage: 100,
       staticChecks: [],   // no constants changed
       diff: "- if (vbat < THRESH_SAFE)\n+ if (vbat < config.safeThreshold)   // refactor, value unchanged" },
  B: { name: "Patch 2.3.2: power consumption optimization",
       params: { safeThreshold: 6.0 },
       coverage: 80,
       staticChecks: [{ constant: "THRESH_SAFE", from: "7.0", to: "6.0", rule: "REQ-EPS-014" }],
       diff: "- THRESH_SAFE = 7.0f;\n+ THRESH_SAFE = 6.0f;   // longer operation in NOMINAL mode" },
  C: { name: "Patch 2.3.3: thermal fix for SAFE_MODE",
       params: { safeThreshold: 7.0, safeModeFactor: 0.8 },
       coverage: 0,        // 0% of changed elements are linked to a rule (the only changed constant has no rule)
       staticChecks: [{ constant: "SAFE_MODE_LOAD_FACTOR", from: "0.4", to: "0.8", rule: null }],   // changed, but not linked to any rule
       diff: "- SAFE_MODE_LOAD_FACTOR = 0.4f;\n+ SAFE_MODE_LOAD_FACTOR = 0.8f;   // keep battery heater on in SAFE_MODE (cold-case fix)" }
};