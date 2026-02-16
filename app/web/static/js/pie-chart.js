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
    center: { x: 0, y: 0 },
  };

  function ensureTooltip() {
    if (tooltip) return tooltip;
    tooltip = document.createElement("div");
    tooltip.className = "pie-tooltip";
    Object.assign(tooltip.style, {
      position: "fixed",
      display: "none",
      background: "rgba(23, 23, 33, 0.95)",
      color: "#fff",
      padding: "8px 12px",
      borderRadius: "8px",
      fontSize: "13px",
      pointerEvents: "none",
      zIndex: "1000",
      backdropFilter: "blur(4px)",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      border: "1px solid rgba(255,255,255,0.1)",
    });
    document.body.appendChild(tooltip);
    return tooltip;
  }

  function formatMoney(v) {
    if (v === 0) return "0 ₽";
    if (!v) return "—";
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
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
  }

  function render(progress = 1) {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) / 2 - 20;
    const thickness = 25;

    if (!state.total || state.total === 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.lineWidth = thickness;
      ctx.strokeStyle = "#f3f4f6";
      ctx.stroke();
      ctx.fillStyle = "#9ca3af";
      ctx.font = "500 13px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Нет данных", cx, cy);
      return;
    }

    let startAngle = -Math.PI / 2;

    state.slices.forEach((slice, i) => {
      const sliceAngle = (slice.value / state.total) * Math.PI * 2 * progress;
      const endAngle = startAngle + sliceAngle;

      const isHovered = i === state.hovered;
      const currentThickness = isHovered ? thickness + 6 : thickness;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.strokeStyle = slice.color;
      ctx.lineWidth = currentThickness;
      ctx.lineCap = "butt";
      ctx.stroke();

      // Разделитель
      if (state.slices.length > 1) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius, endAngle - 0.03, endAngle);
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = currentThickness + 2;
        ctx.stroke();
      }
      startAngle = endAngle;
    });

    // Центр
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#6b7280";
    ctx.font = "500 12px Inter, sans-serif";
    ctx.fillText("Всего", cx, cy - 10);
    ctx.fillStyle = "#111827";
    ctx.font = "700 15px Inter, sans-serif";

    const valueToShow =
      state.hovered !== -1 ? state.slices[state.hovered].value : state.total;
    ctx.fillText(formatMoney(valueToShow), cx, cy + 10);
  }

  function animate(duration = 800) {
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
    // Превращаем данные в удобный формат
    let items = portfolio
      .map((p) => ({
        label: p.name || p.ticker || "—",
        ticker: p.ticker,
        value: Number(p.value) || 0,
      }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value);

    state.total = items.reduce((s, i) => s + i.value, 0);

    // Логика группировки "Прочее"
    const MAX_SLICES = 8; // Показываем 8 цветных, остальные в "Прочее"

    if (items.length > MAX_SLICES) {
      const topItems = items.slice(0, MAX_SLICES);
      const otherItems = items.slice(MAX_SLICES);

      const otherValue = otherItems.reduce((sum, it) => sum + it.value, 0);

      // Добавляем "Прочее" в конец
      topItems.push({
        label: "Прочее",
        ticker: `+${otherItems.length}`,
        value: otherValue,
        isOther: true, // Метка, чтобы покрасить в серый
      });

      items = topItems;
    }

    // Раздаем цвета
    state.slices = items.map((it, i) => {
      let color;
      if (it.isOther) {
        color = "#d1d5db"; // Светло-серый для "Прочее"
      } else {
        // Берем цвет из палитры по кругу
        color = PALETTE[i % PALETTE.length];
      }

      return {
        ...it,
        pct: state.total ? (it.value / state.total) * 100 : 0,
        color: color,
      };
    });
  }

  function renderLegend() {
    if (!legendEl) return;
    legendEl.innerHTML = "";

    // Показываем всё, что есть в slices
    state.slices.forEach((s, i) => {
      const el = document.createElement("div");
      el.className = "pie-legend-item";

      el.style.display = "flex";
      el.style.justifyContent = "space-between";
      el.style.alignItems = "center";
      el.style.marginBottom = "8px";
      el.style.cursor = "pointer";
      el.style.padding = "6px 8px";
      el.style.borderRadius = "6px";
      el.style.transition = "background 0.2s";

      // Если это "Прочее", делаем текст курсивом
      const labelStyle = s.isOther
        ? "font-style: italic; color: #666;"
        : "color:#374151;";

      el.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px; min-width: 0;">
                    <span style="background:${s.color}; width:10px; height:10px; border-radius:50%; flex-shrink: 0;"></span>
                    <span style="font-size:13px; ${labelStyle} white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${s.label}
                    </span>
                </div>
                <span style="font-weight:600; font-size:13px; margin-left: 10px; color:#111827;">
                    ${s.pct.toFixed(1)}%
                </span>
            `;

      el.addEventListener("mouseenter", () => {
        state.hovered = i;
        el.style.background = "#f3f4f6";
        render(state.animation);
      });

      el.addEventListener("mouseleave", () => {
        state.hovered = -1;
        el.style.background = "transparent";
        render(state.animation);
      });

      legendEl.appendChild(el);
    });
  }

  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    let angle = Math.atan2(y, x);

    angle += Math.PI / 2;
    if (angle < 0) angle += Math.PI * 2;

    let start = 0;
    let found = -1;

    for (let i = 0; i < state.slices.length; i++) {
      const sliceAngle = (state.slices[i].value / state.total) * Math.PI * 2;
      if (angle >= start && angle < start + sliceAngle) {
        found = i;
        break;
      }
      start += sliceAngle;
    }

    const w = rect.width;
    const h = rect.height;
    const radius = Math.min(w, h) / 2 - 20;
    const dist = Math.sqrt(x * x + y * y);

    if (dist < radius - 20 || dist > radius + 20) {
      found = -1;
    }

    if (state.hovered !== found) {
      state.hovered = found;
      render(state.animation);
    }

    const t = ensureTooltip();
    if (found !== -1) {
      const s = state.slices[found];
      const title = s.label;
      // Если это "Прочее", не показываем тикер
      const tickerText =
        s.ticker && !s.isOther
          ? `<span style="opacity:0.6; font-size:11px"> ${s.ticker}</span>`
          : "";

      t.innerHTML = `
                <div style="font-weight:600; margin-bottom:2px">${title}${tickerText}</div>
                <div>${formatMoney(s.value)} <span style="opacity:0.7">(${s.pct.toFixed(1)}%)</span></div>
            `;
      t.style.display = "block";
      t.style.left = e.clientX + 12 + "px";
      t.style.top = e.clientY + 12 + "px";
    } else {
      t.style.display = "none";
    }
  });

  canvas.addEventListener("mouseleave", () => {
    state.hovered = -1;
    const t = ensureTooltip();
    t.style.display = "none";
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
