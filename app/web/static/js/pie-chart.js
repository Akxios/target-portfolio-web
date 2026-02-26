(function () {
  const $ = (id) => document.getElementById(id);
  const canvas = $("pie-chart");
  const legendEl = $("pie-legend");

  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  // Палитра
  const PALETTE = [
    "#4361ee",
    "#3a0ca3",
    "#7209b7",
    "#f72585",
    "#4cc9f0",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#6b7280",
  ];

  let tooltip = null;

  const state = {
    slices: [],
    total: 0,
    animation: 0,
    hovered: -1,
  };

  // Инициализация тултипа (стили теперь живут в CSS: .pie-tooltip)
  function ensureTooltip() {
    if (tooltip) return tooltip;
    tooltip = document.createElement("div");
    tooltip.className = "pie-tooltip";
    document.body.appendChild(tooltip);
    return tooltip;
  }

  function formatMoney(v) {
    if (!v) return "0 ₽";
    if (v >= 1e9) return (v / 1e9).toFixed(2) + " млрд";
    if (v >= 1e6) return (v / 1e6).toFixed(1) + " млн";
    return v.toLocaleString("ru-RU") + " ₽";
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
  }

  function render(progress = 1) {
    const { width: w, height: h } = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) / 2 - 20;
    const thickness = 25;

    // Состояние "Нет данных"
    if (!state.total) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.lineWidth = thickness;
      ctx.strokeStyle = "#f1f5f9"; // Цвет из вашей новой CSS-темы
      ctx.stroke();

      ctx.fillStyle = "#64748b";
      ctx.font = "500 13px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Нет данных", cx, cy);
      return;
    }

    let startAngle = -Math.PI / 2;

    // Отрисовка долей
    state.slices.forEach((slice, i) => {
      const sliceAngle = (slice.value / state.total) * Math.PI * 2 * progress;
      const endAngle = startAngle + sliceAngle;
      const isHovered = i === state.hovered;
      const currentThickness = isHovered ? thickness + 6 : thickness;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.strokeStyle = slice.color;
      ctx.lineWidth = currentThickness;
      ctx.stroke();

      // Разделитель (если кусков больше одного)
      if (state.slices.length > 1) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius, endAngle - 0.03, endAngle);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = currentThickness + 2;
        ctx.stroke();
      }
      startAngle = endAngle;
    });

    // Текст в центре
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#64748b";
    ctx.font = "500 12px Inter, sans-serif";
    ctx.fillText("Всего", cx, cy - 10);

    ctx.fillStyle = "#0f172a";
    ctx.font = "700 15px Inter, sans-serif";
    const valueToShow =
      state.hovered !== -1 ? state.slices[state.hovered].value : state.total;
    ctx.fillText(formatMoney(valueToShow), cx, cy + 10);
  }

  function animate(duration = 800) {
    const start = performance.now();
    function step(t) {
      const p = Math.min(1, (t - start) / duration);
      state.animation = 1 - Math.pow(1 - p, 3); // easeOutCubic
      render(state.animation);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function computeSlices(portfolio) {
    let items = portfolio
      .map((p) => ({
        label: p.name || p.ticker || "—",
        ticker: p.ticker,
        value: Number(p.value) || 0,
      }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value);

    state.total = items.reduce((sum, i) => sum + i.value, 0);

    const MAX_SLICES = 8;
    if (items.length > MAX_SLICES) {
      const topItems = items.slice(0, MAX_SLICES);
      const otherItems = items.slice(MAX_SLICES);

      topItems.push({
        label: "Прочее",
        ticker: `+${otherItems.length}`,
        value: otherItems.reduce((sum, it) => sum + it.value, 0),
        isOther: true,
      });
      items = topItems;
    }

    state.slices = items.map((it, i) => ({
      ...it,
      pct: state.total ? (it.value / state.total) * 100 : 0,
      color: it.isOther ? "#cbd5e1" : PALETTE[i % PALETTE.length],
    }));
  }

  function renderLegend() {
    if (!legendEl) return;
    legendEl.innerHTML = "";

    state.slices.forEach((s, i) => {
      const el = document.createElement("div");
      el.className = "pie-legend-item";

      // Используем классы вместо inline-стилей
      el.innerHTML = `
        <div class="legend-swatch" style="background: ${s.color};"></div>
        <div class="legend-label" style="${s.isOther ? "font-style: italic; color: var(--muted);" : ""}">
            ${s.label}
        </div>
        <div class="legend-value">${s.pct.toFixed(1)}%</div>
      `;

      el.addEventListener("mouseenter", () => {
        state.hovered = i;
        render(state.animation);
      });

      el.addEventListener("mouseleave", () => {
        state.hovered = -1;
        render(state.animation);
      });

      legendEl.appendChild(el);
    });
  }

  // Обработка движения мыши над графиком
  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    let angle = Math.atan2(y, x) + Math.PI / 2;
    if (angle < 0) angle += Math.PI * 2;

    const radius = Math.min(rect.width, rect.height) / 2 - 20;
    const dist = Math.sqrt(x * x + y * y);

    let found = -1;
    if (dist >= radius - 20 && dist <= radius + 20) {
      let start = 0;
      for (let i = 0; i < state.slices.length; i++) {
        const sliceAngle = (state.slices[i].value / state.total) * Math.PI * 2;
        if (angle >= start && angle < start + sliceAngle) {
          found = i;
          break;
        }
        start += sliceAngle;
      }
    }

    if (state.hovered !== found) {
      state.hovered = found;
      render(state.animation);
    }

    const t = ensureTooltip();
    if (found !== -1) {
      const s = state.slices[found];
      const tickerHtml =
        s.ticker && !s.isOther
          ? `<span style="opacity:0.6; font-size:11px"> ${s.ticker}</span>`
          : "";

      t.innerHTML = `
        <div style="font-weight:600; margin-bottom:2px">${s.label}${tickerHtml}</div>
        <div>${formatMoney(s.value)} <span style="opacity:0.7">(${s.pct.toFixed(1)}%)</span></div>
      `;
      t.style.display = "block";
      t.style.left = `${e.clientX + 12}px`;
      t.style.top = `${e.clientY + 12}px`;
    } else {
      t.style.display = "none";
    }
  });

  canvas.addEventListener("mouseleave", () => {
    state.hovered = -1;
    ensureTooltip().style.display = "none";
    render(state.animation);
  });

  // Экспорт API
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
