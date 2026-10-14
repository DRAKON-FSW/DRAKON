// Rules inferred once by an LLM from docs/EPS-SRD.md and cached here.
// The "check" functions are the formalization step (rule -> executable test).
const RULES = [
  { id: "REQ-EPS-014", confidence: 0.97, status: "auto",
    text: "When battery voltage < 7.0 V, enter SAFE_MODE within 10 s.",
    source: "EPS-SRD §4.2.1",
    check: h => checkSafeModeEntry(h, 7.0, 10) },
  { id: "REQ-EPS-021", confidence: 0.95, status: "auto",
    text: "Battery voltage must never drop below 6.5 V.",
    source: "EPS-SRD §4.3.1",
    check: h => h.every(s => s.v >= 6.5) },
  { id: "REQ-EPS-017", confidence: 0.96, status: "auto",
    text: "Battery voltage must never exceed 8.4 V.",
    source: "EPS-SRD §4.3.2",
    check: h => h.every(s => s.v <= 8.4 + 1e-9) },
  { id: "REQ-EPS-030", confidence: 0.93, status: "auto",
    text: "No return from SAFE_MODE to NOMINAL during eclipse.",
    source: "EPS-SRD §4.2.2",
    check: h => checkNoReturnInEclipse(h) },
  { id: "REQ-EPS-009", confidence: 0.58, status: "review",
    text: "Return to NOMINAL after the battery is sufficiently charged.",
    source: "EPS-SRD §4.4.1 (ambiguous: no threshold given)",
    check: h => true },
  { id: "REQ-EPS-025", confidence: 0.51, status: "review",
    text: "EPS should react promptly to a low bus voltage condition.",
    source: "EPS-SRD §4.4.2 (ambiguous: 'promptly' not quantified)",
    check: h => true }
];

const PATCHES = {
  A: { name: "Patch 2.3.1: EPS logic refactor",
       params: { safeThreshold: 7.0 },
       diff: "- if (vbat < THRESH_SAFE)\n+ if (vbat < config.safeThreshold)   // refactor, value unchanged" },
  B: { name: "Patch 2.3.2: power consumption optimization",
       params: { safeThreshold: 6.0 },
       diff: "- THRESH_SAFE = 7.0f;\n+ THRESH_SAFE = 6.0f;   // longer operation in NOMINAL mode" }
};