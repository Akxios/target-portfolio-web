(function () {
  const $ = (id) => document.getElementById(id);

  const canvas = $("pie-chart");
  const legendEl = $("pie-legend");

  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  let tooltip = null;

  const state = {
    slices: [],
    total: 0,
    animation: 0,
    hovered: -1,
    solo: -1,
  };

  function ensureTooltip() {
    if (tooltip) return tooltip;
    tooltip = document.createElement("div");
    tooltip.className = "pie-tooltip";
    tooltip.style.display = "none";
    document.body.appendChild(tooltip);
    return tooltip;
  }

  function formatMoney(v) {
    if (!v) return "—";
    if (v >= 1e9) return (v / 1e9).toFixed(2) + "B ₽";
    if (v >= 1e6) return (v / 1e6).toFixed(2) + "M ₽";
    if (v >= 1e3) return (v / 1e3).toFixed(1) + "k ₽";
    return v.toLocaleString("ru-RU") + " ₽";
  }

  function colorFor(i, total) {
    const baseHue = 255;
    const step = 360 / Math.max(6, total);
    return `hsl(${(baseHue + i * step) % 360} 75% 60%)`;
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function render(progress = 1) {
    const { width: w, height: h } = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) / 2 - 6;
    const inner = r * 0.55;

    if (!state.total) {
      ctx.fillStyle = "#f3f2ff";
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#7b61ff";
      ctx.font = "12px Inter";
      ctx.textAlign = "center";
      ctx.fillText("Нет данных", cx, cy);
      return;
    }

    let start = -Math.PI / 2;
    const visible = state.slices
      .map((_, i) => i)
      .filter((i) => state.solo === -1 || state.solo === i);

    for (const i of visible) {
      const s = state.slices[i];
      const angle = (s.value / state.total) * Math.PI * 2 * progress;
      const end = start + angle;

      const mid = (start + end) / 2;
      const explode = i === state.hovered ? 10 : 0;

      const ox = Math.cos(mid) * explode;
      const oy = Math.sin(mid) * explode;

      ctx.beginPath();
      ctx.moveTo(cx + ox, cy + oy);
      ctx.arc(cx + ox, cy + oy, r, start, end);
      ctx.closePath();
      ctx.fillStyle = s.color;
      ctx.fill();

      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.stroke();

      start = end;
    }

    ctx.beginPath();
    ctx.arc(cx, cy, inner, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();

    ctx.fillStyle = "#151522";
    ctx.font = "600 13px Inter";
    ctx.textAlign = "center";
    ctx.fillText("Всего", cx, cy - 8);
    ctx.font = "700 14px Inter";
    ctx.fillText(formatMoney(state.total), cx, cy + 12);
  }

  function animate(duration = 700) {
    const start = performance.now();
    function step(t) {
      const p = Math.min(1, (t - start) / duration);
      state.animation = 1 - Math.pow(1 - p, 3);
      render(state.animation);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function computeSlices(portfolio) {
    const items = portfolio
      .map((p) => ({
        label: p.name || p.ticker || "—",
        value: Number(p.value) || 0,
      }))
      .filter((x) => x.value > 0);

    state.total = items.reduce((s, i) => s + i.value, 0);

    state.slices = items.map((it, i) => ({
      ...it,
      pct: state.total ? (it.value / state.total) * 100 : 0,
      color: colorFor(i, items.length),
    }));
  }

  function renderLegend() {
    if (!legendEl) return;
    legendEl.innerHTML = "";

    state.slices.forEach((s, i) => {
      const el = document.createElement("div");
      el.className = "pie-legend-item";
      el.innerHTML = `
        <span class="legend-swatch" style="background:${s.color}"></span>
        <span class="legend-label">${s.label}</span>
        <span class="legend-value">${s.pct.toFixed(1)}%</span>
      `;

      el.addEventListener("mouseenter", () => {
        state.hovered = i;
        render(state.animation);
      });

      el.addEventListener("mouseleave", () => {
        state.hovered = -1;
        render(state.animation);
      });

      el.addEventListener("click", () => {
        state.solo = state.solo === i ? -1 : i;
        animate(450);
        renderLegend();
      });

      legendEl.appendChild(el);
    });
  }

  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const a = Math.atan2(y, x);

    let angle = a < -Math.PI / 2 ? a + Math.PI * 2 : a;
    let start = -Math.PI / 2;

    state.hovered = -1;
    for (let i = 0; i < state.slices.length; i++) {
      const slice = (state.slices[i].value / state.total) * Math.PI * 2;
      if (angle >= start && angle < start + slice) {
        state.hovered = i;
        break;
      }
      start += slice;
    }

    render(state.animation);
  });

  canvas.addEventListener("mouseleave", () => {
    state.hovered = -1;
    render(state.animation);
  });

  window.pieChart = {
    init() {
      resizeCanvas();
      ensureTooltip();
    },
    update(portfolio) {
      computeSlices(portfolio || []);
      renderLegend();
      animate();
    },
    resize() {
      resizeCanvas();
      render(state.animation);
    },
  };
})();
