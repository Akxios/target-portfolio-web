const $ = (id) => document.getElementById(id);

const toast = (msg, time = 2200) => {
  const t = $("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), time);
};

function debounce(fn, delay = 400) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

let portfolio = [];
let selectedItem = null;
let sortKey = "ticker";
let sortDir = 1;

async function fetchPortfolio() {
  try {
    const resp = await fetch("/api/portfolio");
    if (!resp.ok) throw new Error("network");
    portfolio = await resp.json();
    render();
  } catch (e) {
    console.error(e);
    toast("Не удалось загрузить портфель");
  }
}

function formatCurrency(v) {
  if (typeof v !== "number" || Number.isNaN(v)) return "—";
  return v.toLocaleString("ru-RU", { maximumFractionDigits: 2 }) + " ₽";
}

function computeTotals() {
  const totalValue = portfolio.reduce((s, i) => s + (Number(i.value) || 0), 0);
  const totalTarget = portfolio.reduce(
    (s, i) => s + (Number(i.target_qty) || 0) * (Number(i.price) || 0),
    0,
  );

  return {
    totalValue,
    achieved:
      totalTarget > 0 ? Math.round((totalValue / totalTarget) * 100) : 0,
    avgPrice:
      portfolio.length > 0
        ? Math.round(
            portfolio.reduce((s, i) => s + (Number(i.price) || 0), 0) /
              portfolio.length,
          )
        : 0,
  };
}

function renderStats() {
  const t = computeTotals();
  const elTotal = $("total-value");
  const elAchieved = $("achieved-value");
  const elAvg = $("average-price");
  const elCount = $("total-count");
  if (elTotal) elTotal.textContent = formatCurrency(t.totalValue);
  if (elAchieved) elAchieved.textContent = t.achieved + " %";
  if (elAvg) elAvg.textContent = formatCurrency(t.avgPrice);
  if (elCount) elCount.textContent = portfolio.length;
}

function renderTable() {
  const tbody = $("portfolio-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  const q = $("search-input")?.value.trim().toLowerCase() ?? "";
  const filter = $("filter-type")?.value ?? "all";

  let items = portfolio.filter((it) => {
    if (filter !== "all" && it.type !== filter) return false;
    if (q && !(it.ticker ?? "").toLowerCase().includes(q)) return false;
    return true;
  });

  items.sort((a, b) => {
    const av = a[sortKey] ?? "";
    const bv = b[sortKey] ?? "";
    if (!isNaN(Number(av)) && !isNaN(Number(bv))) {
      return (Number(av) - Number(bv)) * sortDir;
    }
    return av.toString().localeCompare(bv.toString()) * sortDir;
  });

  for (const it of items) {
    const progress =
      it.target_qty > 0
        ? Math.min((it.current_qty / it.target_qty) * 100, 100)
        : 0;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="col-asset">
        <strong>${it.ticker ?? "—"}</strong>
        <span class="asset-type">${it.type === "share" ? "Акция" : "Облигация"}</span>
      </td>

      <td class="col-num">${formatCurrency(Number(it.price))}</td>
      <td class="col-num">${it.current_qty ?? 0}</td>
      <td class="col-num">${it.target_qty ?? 0}</td>
      <td class="col-num strong">${formatCurrency(Number(it.value))}</td>

      <td class="col-progress">
        <div class="progress" aria-valuenow="${Math.round(progress)}">
          <div class="bar" style="width:${progress}%"></div>
        </div>
      </td>
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
  if (!total) {
    ctx.fillStyle = "#f3f2ff";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#7b61ff";
    ctx.font = "12px Inter, system-ui";
    ctx.fillText("Нет данных", 18, h / 2);
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

function openEditModal(item) {
  selectedItem = item;
  const root = $("modal-root");
  if (!root) return;
  root.style.display = "flex";
  $("edit-ticker").value = item.ticker ?? "";
  $("edit-type").value = item.type ?? "share";
  $("edit-current").value = item.current_qty ?? "";
  $("edit-target").value = item.target_qty ?? "";
}

function closeEditModal() {
  selectedItem = null;
  const root = $("modal-root");
  if (!root) return;
  root.style.display = "none";
}

function openAddModal() {
  const root = $("add-root");
  if (!root) return;
  root.style.display = "flex";
}

function closeAddModal() {
  const root = $("add-root");
  if (!root) return;
  root.style.display = "none";

  // reset fields
  const typeBtns = document.querySelectorAll("#add-type-switch .type-btn");
  typeBtns.forEach((b) => b.classList.remove("active"));
  if (typeBtns[0]) typeBtns[0].classList.add("active");

  $("add-type").value = "share";
  $("add-ticker").value = "";
  $("add-current").value = "";
  $("add-target").value = "";
}

const assetSearchInput = $("asset-search-input");
const assetSearchResults = $("asset-search-results");

function getSelectedAssetType() {
  // prefer the active button in asset-search-type, fallback to add-type
  return (
    document.querySelector(".asset-type-btn.active")?.dataset.type ||
    document.querySelector("#add-type")?.value ||
    "share"
  );
}

async function searchAssetsGlobal(q) {
  if (!assetSearchResults) return;
  if (!q || q.length < 2) {
    assetSearchResults.style.display = "none";
    return;
  }

  try {
    const type = getSelectedAssetType();
    const resp = await fetch(
      `/api/moex/search?ticker=${encodeURIComponent(q)}&type=${encodeURIComponent(type)}`,
    );
    if (!resp.ok) {
      assetSearchResults.style.display = "none";
      return;
    }
    const items = await resp.json();
    renderAssetResults(items);
  } catch (e) {
    console.error("search error:", e);
    assetSearchResults.style.display = "none";
  }
}

function renderAssetResults(items) {
  if (!assetSearchResults) return;
  assetSearchResults.innerHTML = "";

  if (!items || items.length === 0) {
    assetSearchResults.innerHTML = `<div style="padding:10px;color:#777">Ничего не найдено</div>`;
    assetSearchResults.style.display = "block";
    return;
  }

  items.forEach((it) => {
    const div = document.createElement("div");
    div.className = "asset-search-item";

    const ticker = it.ticker ?? it.secid ?? it.isin ?? "—";
    const name = it.name ?? it.shortname ?? "—";
    const type = it.type ?? getSelectedAssetType();

    div.innerHTML = `
      <div class="ticker">${ticker}</div>
      <div class="name">${name}</div>
      <div class="price">${it.price ? formatCurrency(Number(it.price)) : "—"}</div>
    `;

    div.addEventListener("click", () => {
      openAddModal();
      $("add-ticker").value = ticker;
      $("add-type").value = type;

      document.querySelectorAll("#add-type-switch .type-btn").forEach((b) => {
        b.classList.toggle("active", b.dataset.type === type);
      });

      assetSearchResults.style.display = "none";
    });

    assetSearchResults.appendChild(div);
  });

  assetSearchResults.style.display = "block";
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("th[data-key]").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.key;

      document
        .querySelectorAll("th[data-key]")
        .forEach((h) => h.classList.remove("sorted-asc", "sorted-desc"));

      if (sortKey === key) {
        sortDir = -sortDir;
      } else {
        sortKey = key;
        sortDir = 1;
      }

      th.classList.add(sortDir === 1 ? "sorted-asc" : "sorted-desc");
      renderTable();
    });
  });

  $("search-input")?.addEventListener("input", () => renderTable());
  $("filter-type")?.addEventListener("change", () => renderTable());

  $("add-btn")?.addEventListener("click", openAddModal);
  $("close-add")?.addEventListener("click", closeAddModal);
  $("add-root")?.addEventListener("click", (e) => {
    if (e.target === $("add-root")) closeAddModal();
  });

  $("close-edit")?.addEventListener("click", closeEditModal);
  $("modal-root")?.addEventListener("click", (e) => {
    if (e.target === $("modal-root")) closeEditModal();
  });

  document.querySelectorAll("#add-type-switch .type-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll("#add-type-switch .type-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      $("add-type").value = btn.dataset.type;
    });
  });

  document.querySelectorAll(".asset-type-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".asset-type-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const q = assetSearchInput?.value.trim() ?? "";
      if (q.length >= 2) searchAssetsGlobal(q);
    });
  });

  if (assetSearchInput) {
    assetSearchInput.addEventListener(
      "input",
      debounce((e) => searchAssetsGlobal(e.target.value)),
    );
  }

  $("submit-add")?.addEventListener("click", async () => {
    const ticker = $("add-ticker")?.value.trim();
    const type = $("add-type")?.value;
    const current_qty = Number($("add-current")?.value || 0);
    const target_qty = Number($("add-target")?.value || 0);

    if (!ticker) {
      toast("Введите тикер");
      return;
    }

    try {
      const resp = await fetch("/api/portfolio/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, type, current_qty, target_qty }),
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

  $("save-edit")?.addEventListener("click", async () => {
    if (!selectedItem) return;
    const ticker = selectedItem.ticker;
    const current_qty = Number($("edit-current")?.value || 0);
    const target_qty = Number($("edit-target")?.value || 0);
    try {
      await fetch(
        `/api/portfolio/assets/${encodeURIComponent(ticker)}/current?current_qty=${current_qty}`,
        { method: "PATCH" },
      );
      await fetch(
        `/api/portfolio/assets/${encodeURIComponent(ticker)}/target?target_qty=${target_qty}`,
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

  $("delete-edit")?.addEventListener("click", async () => {
    if (!selectedItem) return;
    if (!confirm(`Удалить ${selectedItem.ticker}?`)) return;
    try {
      await fetch(
        `/api/portfolio/assets/${encodeURIComponent(selectedItem.ticker)}`,
        { method: "DELETE" },
      );
      toast("Удалено");
      closeEditModal();
      await fetchPortfolio();
    } catch (e) {
      console.error(e);
      toast("Ошибка при удалении");
    }
  });

  $("refresh-btn")?.addEventListener("click", fetchPortfolio);
  $("bulk-export")?.addEventListener("click", () => {
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
    const blob = new Blob([csv.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "portfolio.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast("CSV скачан");
  });

  fetchPortfolio();

  window.addEventListener("resize", drawPie);
});
