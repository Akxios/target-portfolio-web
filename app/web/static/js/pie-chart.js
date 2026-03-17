// static/js/pie-chart.js
(function () {
  const $ = (id) => document.getElementById(id);
  const canvas = $("pie-chart");
  const legendEl = $("pie-legend");

  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  // Палитра цветов для секторов
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

  // Создаём тултип (с базовыми inline-стилями на случай отсутствия CSS)
  function ensureTooltip() {
    if (tooltip) return tooltip;
    tooltip = document.createElement("div");
    tooltip.className = "pie-tooltip";
    tooltip.style.position = "fixed";
    tooltip.style.zIndex = 9999;
    tooltip.style.pointerEvents = "none";
    tooltip.style.display = "none";
    tooltip.style.padding = "8px 10px";
    tooltip.style.borderRadius = "6px";
    tooltip.style.background = "rgba(15, 23, 42, 0.95)";
    tooltip.style.color = "#fff";
    tooltip.style.fontSize = "13px";
    tooltip.style.boxShadow = "0 6px 20px rgba(2,6,23,0.3)";
    document.body.appendChild(tooltip);
    return tooltip;
  }

  // Форматирование суммы в читаемый вид
  function formatMoney(v) {
    const n = Number(v) || 0;
    if (n >= 1e9) return (n / 1e9).toFixed(2) + " млрд";
    if (n >= 1e6) return (n / 1e6).toFixed(1) + " млн";
    return n.toLocaleString("ru-RU") + " ₽";
  }

  // Безопасная экранировка текста (для легенды/тултипа)
  function escapeHtml(str = "") {
    return String(str).replace(
      /[&<>"']/g,
      (s) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[s],
    );
  }

  // Надёжный ресайз канваса: подстраиваем реальное разрешение и используем setTransform
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.floor(rect.width * dpr));
    const h = Math.max(1, Math.floor(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    // Устанавливаем трансформ так, чтобы координаты в canvas соответствовали CSS-пикселям
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Основной рендер
  function render(progress = 1) {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    // Очищаем область в CSS-пикселях
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) / 2 - 20;
    const thickness = 25;

    // Нет данных
    if (!state.total || !state.slices.length) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.lineWidth = thickness;
      ctx.strokeStyle = "#f1f5f9";
      ctx.stroke();

      ctx.fillStyle = "#64748b";
      ctx.font = "500 13px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Нет данных", cx, cy);
      return;
    }

    let startAngle = -Math.PI / 2;

    state.slices.forEach((slice, i) => {
      const sliceAngle =
        (Number(slice.value) / Number(state.total)) * Math.PI * 2 * progress;
      const endAngle = startAngle + sliceAngle;
      const isHovered = i === state.hovered;
      const currentThickness = isHovered ? thickness + 6 : thickness;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.strokeStyle = slice.color;
      ctx.lineWidth = currentThickness;
      ctx.lineCap = "butt";
      ctx.stroke();

      // Разделитель для читаемости
      if (state.slices.length > 1) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius, endAngle - 0.01, endAngle);
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
    ctx.fillText(formatMoney(Number(valueToShow)), cx, cy + 10);
  }

  // Анимация появления
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

  // Подготовка слайсов: учитываем разные поля (name, shortname, secid)
  function computeSlices(portfolio) {
    let items = (portfolio || [])
      .map((p) => {
        const value = parseFloat(p.value);
        return {
          label: String(p.name || p.shortname || p.secid || p.ticker || "—"),
          ticker: String(p.ticker || p.secid || ""),
          value: Number.isFinite(value) ? value : 0,
        };
      })
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

  // Рендер легенды (безопасно)
  function renderLegend() {
    if (!legendEl) return;
    legendEl.innerHTML = "";

    if (!state.slices.length) {
      const empty = document.createElement("div");
      empty.className = "pie-legend-empty hint";
      empty.textContent = "Нет данных";
      legendEl.appendChild(empty);
      return;
    }

    state.slices.forEach((s, i) => {
      const el = document.createElement("div");
      el.className = "pie-legend-item";

      const swatch = document.createElement("div");
      swatch.className = "legend-swatch";
      swatch.style.background = s.color;

      const label = document.createElement("div");
      label.className = "legend-label";
      if (s.isOther) {
        label.style.fontStyle = "italic";
        label.style.color = "var(--muted)";
      }
      label.textContent = s.label;

      const val = document.createElement("div");
      val.className = "legend-value";
      val.textContent = `${s.pct.toFixed(1)}%`;

      el.appendChild(swatch);
      el.appendChild(label);
      el.appendChild(val);

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

  // Обработка движения мыши: угол синхронизирован со стартом в -PI/2
  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const x = e.clientX - cx;
    const y = e.clientY - cy;

    // Угол в системе render: 0 на -PI/2
    const mouseAngle = Math.atan2(y, x); // -PI..PI
    const startAngle = -Math.PI / 2;
    let angleFromStart = mouseAngle - startAngle;
    while (angleFromStart < 0) angleFromStart += Math.PI * 2;
    while (angleFromStart >= Math.PI * 2) angleFromStart -= Math.PI * 2;

    const rectMin = Math.min(rect.width, rect.height);
    const radius = rectMin / 2 - 20;
    const thickness = 25;
    const innerRadius = radius - thickness / 2 - 2;
    const outerRadius = radius + thickness / 2 + 2;

    const dist = Math.sqrt(x * x + y * y);

    let found = -1;
    if (dist >= innerRadius && dist <= outerRadius && state.total > 0) {
      let acc = 0;
      for (let i = 0; i < state.slices.length; i++) {
        const sliceAngle =
          (Number(state.slices[i].value) / Number(state.total)) * Math.PI * 2;
        if (angleFromStart >= acc && angleFromStart < acc + sliceAngle) {
          found = i;
          break;
        }
        acc += sliceAngle;
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
          ? ` <span style="opacity:0.75; font-size:11px">${escapeHtml(s.ticker)}</span>`
          : "";
      t.innerHTML = `<div style="font-weight:600; margin-bottom:4px">${escapeHtml(s.label)}${tickerHtml}</div><div>${formatMoney(s.value)} <span style="opacity:0.75">(${s.pct.toFixed(1)}%)</span></div>`;
      t.style.display = "block";
      // Ограничиваем положение тултипа, чтобы не вылезал за экран
      const left = Math.min(
        window.innerWidth - 12 - t.offsetWidth,
        Math.max(12, e.clientX + 12),
      );
      const top = Math.min(
        window.innerHeight - 12 - t.offsetHeight,
        Math.max(12, e.clientY + 12),
      );
      t.style.left = `${left}px`;
      t.style.top = `${top}px`;
    } else {
      if (tooltip) tooltip.style.display = "none";
    }
  });

  canvas.addEventListener("mouseleave", () => {
    state.hovered = -1;
    if (tooltip) tooltip.style.display = "none";
    render(state.animation);
  });

  // Публичный API
  window.pieChart = {
    init() {
      resizeCanvas();
      ensureTooltip();
      render(0);
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

  // Перерисовываем при изменении размера окна
  window.addEventListener("resize", () => {
    resizeCanvas();
    render(state.animation);
  });
})();
