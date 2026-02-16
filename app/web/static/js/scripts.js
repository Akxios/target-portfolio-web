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

async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let json = null;
    try {
      json = JSON.parse(text || "{}");
    } catch {}
    const err = json?.detail || text || res.statusText || "network error";
    const e = new Error(err);
    e.status = res.status;
    e.body = json;
    throw e;
  }
  if (res.status === 204) return null;
  return res.json().catch(() => null);
}

let portfolio = [];
let selectedItem = null;
let sortKey = "ticker";
let sortDir = 1;

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
  $("total-value") &&
    ($("total-value").textContent = formatCurrency(t.totalValue));
  $("achieved-value") && ($("achieved-value").textContent = t.achieved + " %");
  $("average-price") &&
    ($("average-price").textContent = formatCurrency(t.avgPrice));
  $("total-count") && ($("total-count").textContent = portfolio.length);
}

function createRowNode(item) {
  const tpl = document.getElementById("row-template");
  if (!tpl) return document.createElement("tr"); // Fallback

  const clone = tpl.content.cloneNode(true);
  const tr = clone.querySelector("tr");

  const nameEl = clone.querySelector(".row-ticker");
  if (nameEl) nameEl.textContent = item.name ?? item.ticker ?? "—";

  const assetMeta = clone.querySelector(".asset-type");
  if (assetMeta)
    assetMeta.textContent = `${item.ticker ?? "—"} · ${
      item.type === "share" ? "Акция" : "Облигация"
    }`;

  const cols = clone.querySelectorAll("td");

  if (cols.length >= 6) {
    cols[1].textContent = formatCurrency(Number(item.price));
    cols[2].textContent = item.current_qty ?? 0;
    cols[3].textContent = item.target_qty ?? 0;
    cols[4].textContent = formatCurrency(Number(item.value));
    const progress =
      item.target_qty > 0
        ? Math.min((item.current_qty / item.target_qty) * 100, 100)
        : 0;
    const progressBar = cols[5].querySelector(".bar");
    const progressPercent = cols[5].querySelector(".progress-percent");
    if (progressBar) progressBar.style.width = `${Math.round(progress)}%`;
    if (progressPercent)
      progressPercent.textContent = `${Math.round(progress)}%`;
  }

  tr.addEventListener("click", () => openEditModal(item));

  return tr;
}

function renderTable() {
  const tbody = $("portfolio-body");
  if (!tbody) return;

  const q = "";

  let items = portfolio;

  items.sort((a, b) => {
    const av = a[sortKey] ?? "";
    const bv = b[sortKey] ?? "";
    if (!isNaN(Number(av)) && !isNaN(Number(bv))) {
      return (Number(av) - Number(bv)) * sortDir;
    }
    return av.toString().localeCompare(bv.toString()) * sortDir;
  });

  const frag = document.createDocumentFragment();
  for (const it of items) {
    frag.appendChild(createRowNode(it));
  }
  tbody.innerHTML = "";
  tbody.appendChild(frag);
}

function render() {
  renderStats();
  renderTable();
  if (window.pieChart?.update) window.pieChart.update(portfolio);
}

async function fetchPortfolio() {
  try {
    const data = await fetchJSON("/api/portfolio");
    portfolio = Array.isArray(data) ? data : [];
    render();
  } catch (e) {
    console.error(e);
    toast("Не удалось загрузить портфель");
  }
}

function openEditModal(item) {
  selectedItem = item;
  const root = $("modal-root");
  if (!root) return;
  root.style.display = "flex";
  if ($("edit-ticker")) $("edit-ticker").value = item.ticker ?? "";
  if ($("edit-type")) $("edit-type").value = item.type ?? "share";
  if ($("edit-current")) $("edit-current").value = item.current_qty ?? "";
  if ($("edit-target")) $("edit-target").value = item.target_qty ?? "";
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
  // Фокус на поле поиска при открытии
  setTimeout(() => $("asset-search-input")?.focus(), 100);
}

function closeAddModal() {
  const root = $("add-root");
  if (!root) return;
  root.style.display = "none";

  // Сброс полей
  const typeBtns = document.querySelectorAll(
    "#add-type-switch .asset-type-btn",
  );
  typeBtns.forEach((b) => b.classList.remove("active"));
  if (typeBtns[0]) typeBtns[0].classList.add("active");

  if ($("add-type")) $("add-type").value = "share";
  if ($("add-ticker")) $("add-ticker").value = "";
  if ($("asset-search-input")) $("asset-search-input").value = "";
  if ($("asset-search-results"))
    $("asset-search-results").style.display = "none";
  if ($("add-current")) $("add-current").value = "0";
  if ($("add-target")) $("add-target").value = "0";
}

const assetSearchInput = $("asset-search-input");
const assetSearchResults = $("asset-search-results");

function getSelectedAssetType() {
  return (
    document.querySelector(".asset-type-btn.active")?.dataset.type ||
    $("add-type")?.value ||
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
      `/api/moex/search?ticker=${encodeURIComponent(
        q,
      )}&type=${encodeURIComponent(type)}`,
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

  const frag = document.createDocumentFragment();
  items.forEach((it) => {
    const div = document.createElement("div");
    div.className = "asset-search-item";

    const ticker = it.ticker ?? it.secid ?? it.isin ?? "—";
    const name = it.name ?? it.shortname ?? "—";
    const type = it.type ?? getSelectedAssetType();

    div.innerHTML = `
      <div class="ticker">${ticker}</div>
      <div class="name">${name}</div>
      <div class="price">${
        it.price ? formatCurrency(Number(it.price)) : "—"
      }</div>
    `;

    div.addEventListener("click", () => {
      // Заполняем скрытый input тикером
      if ($("add-ticker")) $("add-ticker").value = ticker;
      // Показываем тикер в поле поиска для наглядности
      if ($("asset-search-input")) $("asset-search-input").value = ticker;

      if ($("add-type")) $("add-type").value = type;

      // Обновляем визуальные кнопки
      document
        .querySelectorAll("#add-type-switch .asset-type-btn")
        .forEach((b) => {
          const isActive = b.dataset.type === type;
          b.classList.toggle("active", isActive);
        });

      assetSearchResults.style.display = "none";
    });

    frag.appendChild(div);
  });

  assetSearchResults.appendChild(frag);
  assetSearchResults.style.display = "block";
}

document.addEventListener("DOMContentLoaded", () => {
  window.pieChart?.init();
  window.addEventListener("resize", () => window.pieChart?.resize());

  // Сортировка таблицы
  document.querySelectorAll("th[data-key]").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.key;
      document
        .querySelectorAll("th[data-key]")
        .forEach((h) => h.classList.remove("sorted-asc", "sorted-desc"));
      if (sortKey === key) sortDir = -sortDir;
      else {
        sortKey = key;
        sortDir = 1;
      }
      th.classList.add(sortDir === 1 ? "sorted-asc" : "sorted-desc");
      renderTable();
    });
  });

  // Обработчик кнопки "+ Добавить"
  $("open-add-modal")?.addEventListener("click", openAddModal);
  $("close-add")?.addEventListener("click", closeAddModal);

  // Закрытие по клику на фон
  $("add-root")?.addEventListener("click", (e) => {
    if (e.target === $("add-root")) closeAddModal();
  });

  $("close-edit")?.addEventListener("click", closeEditModal);
  $("modal-root")?.addEventListener("click", (e) => {
    if (e.target === $("modal-root")) closeEditModal();
  });

  // Переключение типов (Акция/Облигация) в модалке добавления
  document
    .querySelectorAll("#add-type-switch .asset-type-btn")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll("#add-type-switch .asset-type-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        if ($("add-type")) $("add-type").value = btn.dataset.type;

        // Если в поле поиска что-то есть, повторяем поиск с новым типом
        const q = assetSearchInput?.value.trim() ?? "";
        if (q.length >= 2) searchAssetsGlobal(q);
      });
    });

  // Живой поиск
  if (assetSearchInput)
    assetSearchInput.addEventListener(
      "input",
      debounce((e) => searchAssetsGlobal(e.target.value)),
    );

  // ОТПРАВКА ФОРМЫ ДОБАВЛЕНИЯ
  $("submit-add")?.addEventListener("click", async () => {
    let ticker = $("add-ticker")?.value.trim();
    const manualInput = $("asset-search-input")?.value.trim().toUpperCase();

    if (!ticker && manualInput) {
      ticker = manualInput;
    }

    const type = $("add-type")?.value;
    const current_qty = Number($("add-current")?.value || 0);
    const target_qty = Number($("add-target")?.value || 0);

    if (!ticker) {
      toast("Введите тикер");
      return;
    }

    try {
      await fetchJSON("/api/portfolio/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, type, current_qty, target_qty }),
      });
      toast("Актив добавлен");
      closeAddModal();
      await fetchPortfolio();
    } catch (e) {
      console.error(e);
      toast(e.message || "Ошибка при добавлении актива");
    }
  });

  // Сохранение редактирования
  $("save-edit")?.addEventListener("click", async () => {
    if (!selectedItem) return;
    const ticker = selectedItem.ticker;
    const current_qty = Number($("edit-current")?.value || 0);
    const target_qty = Number($("edit-target")?.value || 0);
    try {
      await fetchJSON(
        `/api/portfolio/assets/${encodeURIComponent(
          ticker,
        )}/current?current_qty=${current_qty}`,
        { method: "PATCH" },
      );
      await fetchJSON(
        `/api/portfolio/assets/${encodeURIComponent(
          ticker,
        )}/target?target_qty=${target_qty}`,
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

  // Удаление
  $("delete-edit")?.addEventListener("click", async () => {
    if (!selectedItem) return;
    if (!confirm(`Удалить ${selectedItem.ticker}?`)) return;
    try {
      await fetchJSON(
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

  // Экспорт
  $("bulk-export")?.addEventListener("click", () => {
    if (!portfolio || portfolio.length === 0) {
      toast("Нет данных для экспорта");
      return;
    }
    const header = [
      "ticker",
      "type",
      "price",
      "current_qty",
      "target_qty",
      "value",
    ];
    const csv = [header.join(",")];
    for (const p of portfolio) {
      csv.push(
        [
          p.ticker ?? "",
          p.type ?? "",
          Number(p.price) || "",
          p.current_qty ?? "",
          p.target_qty ?? "",
          Number(p.value) || "",
        ].join(","),
      );
    }
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
});
