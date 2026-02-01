const $ = (id) => document.getElementById(id);
const toast = (msg, time = 2200) => {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), time);
};

let portfolio = [];
let selectedItem = null;
let sortKey = "ticker";
let sortDir = 1; // 1 asc, -1 desc

async function fetchPortfolio() {
  try {
    const resp = await fetch("/api/portfolio");
    if (!resp.ok) throw new Error("Ошибка сети");
    const data = await resp.json();
    portfolio = data;
    render();
    // small toast suppressed to avoid spam during dev; enable if you like:
    // toast('Портфель обновлён');
  } catch (err) {
    console.error(err);
    toast("Не удалось загрузить портфель");
  }
}

function formatCurrency(v) {
  if (typeof v !== "number" || Number.isNaN(v)) return "-";
  return v.toLocaleString("ru-RU", { maximumFractionDigits: 2 }) + " ₽";
}

function computeTotals() {
  const totalValue = portfolio.reduce(
    (s, it) => s + (Number(it.value) || 0),
    0,
  );
  const totalTarget = portfolio.reduce(
    (s, it) => s + (Number(it.target_qty) || 0) * (Number(it.price) || 0),
    0,
  );
  const achievedPercent =
    totalTarget > 0 ? Math.round((totalValue / totalTarget) * 100) : 0;
  const avgPrice = portfolio.length
    ? Math.round(
        portfolio.reduce((s, it) => s + (Number(it.price) || 0), 0) /
          portfolio.length,
      )
    : 0;
  return { totalValue, achievedPercent, avgPrice, totalTarget };
}

function renderStats() {
  const totals = computeTotals();
  $("total-value").textContent = formatCurrency(totals.totalValue);
  $("achieved-value").textContent = totals.achievedPercent + " %";
  $("average-price").textContent = formatCurrency(totals.avgPrice);
  $("total-count").textContent = portfolio.length;
}

function drawPie() {
  const canvas = $("pie-chart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width,
    h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const values = portfolio
    .map((p) => Number(p.value) || 0)
    .filter((v) => v > 0);
  const total = values.reduce((a, b) => a + b, 0);
  if (total === 0) {
    ctx.fillStyle = "#f3f2ff";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#7b61ff";
    ctx.font = "12px Inter, system-ui";
    ctx.fillText("Нет данных", 18, 80);
    return;
  }
  let start = -Math.PI / 2;
  for (let i = 0; i < values.length; i++) {
    const slice = (values[i] / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(w / 2, h / 2);
    ctx.arc(w / 2, h / 2, Math.min(w, h) / 2 - 6, start, start + slice);
    ctx.closePath();
    ctx.fillStyle = `hsl(${(i * 62) % 360} 70% 60%)`;
    ctx.fill();
    start += slice;
  }
}

function renderTable() {
  const tbody = $("portfolio-body");
  tbody.innerHTML = "";
  const q = $("search-input")
    ? $("search-input").value.trim().toLowerCase()
    : "";
  const filter = $("filter-type") ? $("filter-type").value : "all";

  let items = portfolio.filter((it) => {
    if (filter !== "all" && it.type !== filter) return false;
    if (q && !it.ticker.toLowerCase().includes(q)) return false;
    return true;
  });

  items.sort((a, b) => {
    const av = (a[sortKey] ?? "").toString();
    const bv = (b[sortKey] ?? "").toString();
    if (!isNaN(Number(av)) && !isNaN(Number(bv))) {
      return (Number(av) - Number(bv)) * sortDir;
    }
    return av.localeCompare(bv) * sortDir;
  });

  for (const it of items) {
    const tr = document.createElement("tr");
    const progress =
      it.target_qty > 0
        ? Math.min((it.current_qty / it.target_qty) * 100, 100)
        : 0;
    tr.innerHTML = `
          <td><strong>${it.ticker}</strong></td>
          <td style="width:92px">${it.type === "share" ? "Акция" : "Облигация"}</td>
          <td style="width:120px">${formatCurrency(Number(it.price))}</td>
          <td style="width:90px">${it.current_qty}</td>
          <td style="width:90px">${it.target_qty}</td>
          <td style="width:120px">${formatCurrency(Number(it.value))}</td>
          <td class="progress-wrap" style="width:160px"><div class="progress" aria-valuenow="${Math.round(progress)}" aria-valuemin="0" aria-valuemax="100"><div class="bar" style="width:${progress}%"></div></div></td>
        `;
    tr.addEventListener("click", () => openEditModal(it));
    tbody.appendChild(tr);
  }
}

function render() {
  renderStats();
  renderTable();
  drawPie();
}

// modal helpers
function openEditModal(item) {
  selectedItem = item;
  $("modal-root").style.display = "flex";
  $("edit-ticker").value = item.ticker;
  $("edit-type").value = item.type;
  $("edit-current").value = item.current_qty;
  $("edit-target").value = item.target_qty;
}
function closeEditModal() {
  selectedItem = null;
  $("modal-root").style.display = "none";
}

function openAddModal() {
  $("add-root").style.display = "flex";
}
function closeAddModal() {
  $("add-root").style.display = "none";
  // reset type switch visuals
  const typeSwitch = document.querySelectorAll("#add-type-switch .type-btn");
  typeSwitch.forEach((b) => b.classList.remove("active"));
  if (typeSwitch[0]) typeSwitch[0].classList.add("active");
  $("add-type").value = "share";
  $("add-ticker").value = "";
  $("add-current").value = "";
  $("add-target").value = "";
}

// attach listeners once DOM ready
document.addEventListener("DOMContentLoaded", () => {
  // Sorting handlers
  document.querySelectorAll("th[data-key]").forEach((th) => {
    th.style.cursor = "pointer";
    th.addEventListener("click", () => {
      const key = th.dataset.key;
      if (sortKey === key) sortDir = -sortDir;
      else {
        sortKey = key;
        sortDir = 1;
      }
      renderTable();
    });
  });

  // Search / filter
  const searchInput = $("search-input");
  if (searchInput)
    searchInput.addEventListener("input", () => {
      renderTable();
    });

  const filterSelect = $("filter-type");
  if (filterSelect)
    filterSelect.addEventListener("change", () => {
      renderTable();
    });

  // Open/close modals
  $("add-btn").addEventListener("click", openAddModal);
  $("close-add").addEventListener("click", closeAddModal);
  $("add-root").addEventListener("click", (e) => {
    if (e.target === $("add-root")) closeAddModal();
  });

  $("close-edit").addEventListener("click", closeEditModal);
  $("modal-root").addEventListener("click", (e) => {
    if (e.target === $("modal-root")) closeEditModal();
  });

  // Add type switch
  const typeSwitch = document.querySelectorAll("#add-type-switch .type-btn");
  typeSwitch.forEach((btn) => {
    btn.addEventListener("click", () => {
      typeSwitch.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      $("add-type").value = btn.dataset.type;
    });
  });

  // submit-add
  $("submit-add").addEventListener("click", async () => {
    const ticker = $("add-ticker").value.trim();
    const type = $("add-type").value;
    const current_qty = Number($("add-current").value);
    const target_qty = Number($("add-target").value);

    if (!ticker) {
      toast("Введите тикер");
      return;
    }

    try {
      const resp = await fetch("/api/portfolio/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker,
          type,
          current_qty,
          target_qty,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ detail: "Ошибка" }));
        toast(err.detail ?? "Ошибка при добавлении актива");
        return;
      }
      toast("Актив добавлен");
      closeAddModal();
      await fetchPortfolio();
    } catch (e) {
      console.error(e);
      toast("Ошибка сети при добавлении");
    }
  });

  // save-edit
  $("save-edit").addEventListener("click", async () => {
    if (!selectedItem) return;
    const ticker = selectedItem.ticker;
    const current_qty = Number($("edit-current").value);
    const target_qty = Number($("edit-target").value);
    try {
      await fetch(
        `/api/portfolio/assets/${ticker}/current?current_qty=${current_qty}`,
        { method: "PATCH" },
      );
      await fetch(
        `/api/portfolio/assets/${ticker}/target?target_qty=${target_qty}`,
        { method: "PATCH" },
      );
      toast("Сохранено");
      closeEditModal();
      await fetchPortfolio();
    } catch (e) {
      console.error(e);
      toast("Ошибка при сохранении");
    }
  });

  // delete-edit
  $("delete-edit").addEventListener("click", async () => {
    if (!selectedItem) return;
    if (!confirm(`Удалить ${selectedItem.ticker}?`)) return;
    try {
      await fetch(`/api/portfolio/assets/${selectedItem.ticker}`, {
        method: "DELETE",
      });
      toast("Удалено");
      closeEditModal();
      await fetchPortfolio();
    } catch (e) {
      console.error(e);
      toast("Ошибка при удалении");
    }
  });

  // refresh & export
  $("refresh-btn").addEventListener("click", fetchPortfolio);
  $("bulk-export").addEventListener("click", () => {
    const rows = Array.from(document.querySelectorAll("#portfolio-body tr"));
    if (rows.length === 0) {
      toast("Нет данных для экспорта");
      return;
    }
    const csv = ["ticker,type,price,current_qty,target_qty,value"];
    rows.forEach((r) => {
      const cols = r.querySelectorAll("td");
      const vals = [
        cols[0].innerText.trim(),
        cols[1].innerText.trim(),
        cols[2].innerText.replace(/\s|₽/g, ""),
        cols[3].innerText.trim(),
        cols[4].innerText.trim(),
        cols[5].innerText.replace(/\s|₽/g, ""),
      ];
      csv.push(vals.join(","));
    });
    const blob = new Blob([csv.join("\n")], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "portfolio.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast("CSV скачан");
  });

  // init
  fetchPortfolio();
  window.addEventListener("resize", () => {
    drawPie();
  });
});
