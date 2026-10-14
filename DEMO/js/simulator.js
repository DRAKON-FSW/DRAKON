// Simple battery model: 90 min orbit, 30 min eclipse, 1 step = 1 s.
function simulate(params) {
  const hist = [];
  let v = 8.4, mode = "NOMINAL";
  for (let t = 0; t < 5400; t++) {
    const eclipse = t > 3600;
    const rate = eclipse ? -0.0012 : 0.0006;
    v += rate * (mode === "SAFE_MODE" ? 0.4 : 1);   // safe mode reduces power draw
    v = Math.min(v, 8.4);
    if (v < params.safeThreshold && mode === "NOMINAL") mode = "SAFE_MODE";
    hist.push({ t, v, mode, eclipse });
  }
  return hist;
}