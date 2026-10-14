// Draws the battery voltage history up to sample index "upto".
function drawChart(canvas, hist, upto) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const pad = { l: 70, r: 20, t: 20, b: 50 };
  const vMin = 5.5, vMax = 8.6, tMax = hist.length - 1;
  const X = t => pad.l + (t / tMax) * (W - pad.l - pad.r);
  const Y = v => pad.t + (1 - (v - vMin) / (vMax - vMin)) * (H - pad.t - pad.b);

  ctx.clearRect(0, 0, W, H);
  ctx.font = "16px system-ui, Arial";

  // Eclipse shading
  ctx.fillStyle = "rgba(139,148,158,0.15)";
  ctx.fillRect(X(3600), pad.t, X(tMax) - X(3600), H - pad.t - pad.b);
  ctx.fillStyle = "#8b949e";
  ctx.fillText("ECLIPSE", X(3600) + 10, pad.t + 20);

  // Axes and grid
  ctx.strokeStyle = "#30363d"; ctx.fillStyle = "#8b949e"; ctx.lineWidth = 1;
  for (let v = 6; v <= 8.5; v += 0.5) {
    ctx.beginPath(); ctx.moveTo(pad.l, Y(v)); ctx.lineTo(W - pad.r, Y(v)); ctx.stroke();
    ctx.fillText(v.toFixed(1) + " V", 10, Y(v) + 5);
  }
  ctx.fillText("Time [s]", W / 2 - 30, H - 10);

  // Minimum voltage limit (REQ-EPS-021)
  ctx.strokeStyle = "#f85149"; ctx.setLineDash([8, 6]); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(pad.l, Y(6.5)); ctx.lineTo(W - pad.r, Y(6.5)); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#f85149";
  ctx.fillText("6.5 V minimum", W - 160, Y(6.5) - 8);

  // Voltage line (red where limit is violated)
  ctx.lineWidth = 3;
  for (let i = 1; i <= upto && i < hist.length; i++) {
    ctx.strokeStyle = hist[i].v < 6.5 ? "#f85149" : "#58a6ff";
    ctx.beginPath();
    ctx.moveTo(X(hist[i - 1].t), Y(hist[i - 1].v));
    ctx.lineTo(X(hist[i].t), Y(hist[i].v));
    ctx.stroke();
  }

  // SAFE_MODE entry marker
  const k = hist.findIndex(s => s.mode === "SAFE_MODE");
  if (k !== -1 && k <= upto) {
    ctx.strokeStyle = "#d29922"; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(X(k), pad.t); ctx.lineTo(X(k), H - pad.b); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#d29922";
    ctx.fillText("SAFE_MODE entered", X(k) - 140, pad.t + 44);
  }
}