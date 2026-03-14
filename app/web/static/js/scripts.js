const $ = (id) => document.getElementById(id);
const num = (v) => Number(v) || 0; // Хелпер для чисел

const toast = (msg, time = 2200) => {
  const t = $("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), time);
};

const debounce = (fn, delay = 400) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {}
    throw new Error(json?.detail || text || res.statusText || "Network error");
  }
  return res.status === 204 ? null : res.json().catch(() => null);
}

// Обертка для всех CRUD-операций с API
async function executeApi(requestPromise, successMsg, closeElementId = null) {
  try {
    await requestPromise;
    toast(successMsg);
    if (closeElementId) $(closeElementId).style.display = "none";
    refreshAll();
  } catch (e) {
    toast(e.message || "Ошибка");
  }
}

const formatCurrency = (v) =>
  typeof v !== "number" || isNaN(v)
    ? "—"
    : v.toLocaleString("ru-RU", { maximumFractionDigits: 2 }) + " ₽";
const dtf = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "short",
  timeStyle: "short",
});

// --- СОСТОЯНИЕ ---
let portfolio = [],
  selectedItem = null,
  sortKey = "ticker",
  sortDir = 1,
  currentView = "all";
const getVisiblePortfolio = () =>
  currentView === "all"
    ? portfolio
    : portfolio.filter((p) => p.type === currentView);

// --- РЕНДЕР СТАТИСТИКИ ---
function renderStats() {
  const items = getVisiblePortfolio();
  const totalValue = items.reduce((s, i) => s + num(i.value), 0);
  const totalTarget = items.reduce(
    (s, i) => s + num(i.target_qty) * num(i.price),
    0,
  );
  const avgPrice = items.length
    ? items.reduce((s, i) => s + num(i.price), 0) / items.length
    : 0;

  $("total-value").textContent = formatCurrency(totalValue);
  $("achieved-value").textContent =
    totalTarget > 0
      ? `${Math.round((totalValue / totalTarget) * 100)} %`
      : "0 %";
  $("average-price").textContent = formatCurrency(Math.round(avgPrice));
  $("total-count").textContent = items.length;
}

// --- РЕНДЕР ТАБЛИЦЫ ПОРТФЕЛЯ ---
function createRowNode(item) {
  const tpl = $("row-template");
  if (!tpl) return document.createElement("tr");

  const tr = tpl.content.cloneNode(true).querySelector("tr");
  const cols = tr.querySelectorAll("td");

  tr.querySelector(".row-ticker").textContent = item.name || item.ticker || "—";
  tr.querySelector(".asset-type").textContent =
    `${item.ticker || "—"} · ${item.type === "share" ? "Акция" : "Облигация"}`;

  if (cols.length >= 6) {
    cols[1].textContent = formatCurrency(num(item.price));
    cols[2].textContent = item.current_qty || 0;
    cols[3].textContent = item.target_qty || 0;
    cols[4].textContent = formatCurrency(num(item.value));

    const progress =
      item.target_qty > 0
        ? Math.min((item.current_qty / item.target_qty) * 100, 100)
        : 0;
    cols[5].querySelector(".bar").style.width = cols[5].querySelector(
      ".progress-percent",
    ).textContent = `${Math.round(progress)}%`;
  }

  tr.onclick = () => {
    selectedItem = item;
    $("edit-ticker").value = item.ticker || "";
    $("edit-type").value = item.type || "share";
    $("edit-current").value = item.current_qty || 0;
    $("edit-target").value = item.target_qty || 0;
    $("modal-root").style.display = "flex";
  };
  return tr;
}

function renderTable() {
  const tbody = $("portfolio-body");
  if (!tbody) return;
  const sorted = [...getVisiblePortfolio()].sort((a, b) => {
    const av = a[sortKey] ?? "",
      bv = b[sortKey] ?? "";
    return (
      (!isNaN(av) && !isNaN(bv)
        ? av - bv
        : String(av).localeCompare(String(bv))) * sortDir
    );
  });
  tbody.innerHTML = "";
  tbody.append(...sorted.map(createRowNode));
}

function render() {
  renderStats();
  renderTable();
  window.pieChart?.update(getVisiblePortfolio());
}

// --- ЗАГРУЗКА ДАННЫХ ---
async function fetchPortfolio() {
  try {
    portfolio = (await fetchJSON("/api/portfolio")) || [];
    render();
  } catch {
    toast("Не удалось загрузить портфель");
  }
}

const ACTION_MAP = {
  ADD_POSITION: { text: "Добавлен актив", cls: "action-success" },
  REMOVE_POSITION: { text: "Удален актив", cls: "action-danger" },
  UPDATE_CURRENT_QTY: { text: "Сделка", cls: "action-info" },
  UPDATE_TARGET_QTY: { text: "Изменение цели", cls: "action-warning" },
};

async function loadHistory() {
  const tbody = $("history-body");
  if (!tbody) return;
  try {
    const history = (await fetchJSON("/api/portfolio/history")) || [];
    if (!history.length)
      return (tbody.innerHTML =
        '<tr><td colspan="4" style="text-align:center;color:var(--muted);">История пуста</td></tr>');

    tbody.innerHTML = history
      .map((tx) => {
        const action = ACTION_MAP[tx.action] || {
          text: tx.action,
          cls: "action-info",
        };
        return `<tr>
        <td class="hint">${dtf.format(new Date(tx.timestamp))}</td>
        <td><span class="ticker-pill">${tx.ticker}</span></td>
        <td><span class="action-badge ${action.cls}">${action.text}</span></td>
        <td class="col-num strong">${tx.previous_qty} → ${tx.new_qty}</td>
      </tr>`;
      })
      .join("");
  } catch {
    tbody.innerHTML =
      '<tr><td colspan="4" style="text-align:center;color:var(--danger);">Ошибка загрузки</td></tr>';
  }
}

function refreshAll() {
  fetchPortfolio();
  loadHistory();
}

// --- ПОИСК И АКТИВЫ ---
const getSelectedAssetType = () =>
  document.querySelector(".asset-type-btn.active")?.dataset.type || "share";

async function searchAssetsGlobal(q) {
  const resultsBox = $("asset-search-results");
  if (!q || q.length < 2) return (resultsBox.style.display = "none");

  try {
    const items = await fetchJSON(
      `/api/moex/search?ticker=${encodeURIComponent(q)}&type=${getSelectedAssetType()}`,
    );
    if (!items?.length) {
      resultsBox.innerHTML = `<div style="padding:10px;color:var(--muted)">Ничего не найдено</div>`;
    } else {
      resultsBox.innerHTML = items
        .map(
          (it) => `
        <div class="asset-search-item" data-ticker="${it.ticker || it.secid}" data-type="${it.type || getSelectedAssetType()}">
          <div class="ticker">${it.ticker || it.secid || "—"}</div>
          <div class="name">${it.name || it.shortname || "—"}</div>
          <div class="price">${it.price ? formatCurrency(num(it.price)) : "—"}</div>
        </div>
      `,
        )
        .join("");
    }
    resultsBox.style.display = "block";
  } catch {
    resultsBox.style.display = "none";
  }
}

// --- ИНИЦИАЛИЗАЦИЯ (ON LOAD) ---
document.addEventListener("DOMContentLoaded", () => {
  window.pieChart?.init();
  window.addEventListener("resize", () => window.pieChart?.resize());

  // Делегирование событий для поиска (вместо цикла onclick)
  $("asset-search-results").addEventListener("click", (e) => {
    const item = e.target.closest(".asset-search-item");
    if (!item) return;
    $("add-ticker").value = $("asset-search-input").value = item.dataset.ticker;
    $("add-type").value = item.dataset.type;
    document
      .querySelectorAll("#add-type-switch .asset-type-btn")
      .forEach((b) =>
        b.classList.toggle("active", b.dataset.type === item.dataset.type),
      );
    $("asset-search-results").style.display = "none";
  });

  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.onclick = () => {
      document
        .querySelectorAll(".filter-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentView = btn.dataset.filter;
      render();
    };
  });

  document.querySelectorAll("th[data-key]").forEach((th) => {
    th.onclick = () => {
      document
        .querySelectorAll("th[data-key]")
        .forEach((h) => h.classList.remove("sorted-asc", "sorted-desc"));
      sortDir = sortKey === th.dataset.key ? -sortDir : 1;
      sortKey = th.dataset.key;
      th.classList.add(sortDir === 1 ? "sorted-asc" : "sorted-desc");
      renderTable();
    };
  });

  // Модалки
  const closeAdd = () => {
    $("add-root").style.display = "none";
    $("add-ticker").value = $("asset-search-input").value = "";
    $("asset-search-results").style.display = "none";
    $("add-current").value = $("add-target").value = "0";
  };

  $("open-add-modal").onclick = () => {
    $("add-root").style.display = "flex";
    setTimeout(() => $("asset-search-input").focus(), 100);
  };
  $("close-add").onclick = closeAdd;
  $("add-root").onclick = (e) => e.target === $("add-root") && closeAdd();
  $("close-edit").onclick = () => ($("modal-root").style.display = "none");
  $("modal-root").onclick = (e) =>
    e.target === $("modal-root") && ($("modal-root").style.display = "none");

  document
    .querySelectorAll("#add-type-switch .asset-type-btn")
    .forEach((btn) => {
      btn.onclick = () => {
        document
          .querySelectorAll("#add-type-switch .asset-type-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        $("add-type").value = btn.dataset.type;
        const q = $("asset-search-input").value.trim();
        if (q.length >= 2) searchAssetsGlobal(q);
      };
    });

  $("asset-search-input").oninput = debounce((e) =>
    searchAssetsGlobal(e.target.value),
  );

  // CRUD ОПЕРАЦИИ (Существенно сокращены за счет executeApi)
  $("submit-add").onclick = () => {
    const ticker =
      $("add-ticker").value.trim() ||
      $("asset-search-input").value.trim().toUpperCase();
    if (!ticker) return toast("Введите тикер");

    executeApi(
      fetchJSON("/api/portfolio/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker,
          type: $("add-type").value,
          current_qty: num($("add-current").value),
          target_qty: num($("add-target").value),
        }),
      }),
      "Актив добавлен",
      "add-root",
    );
  };

  $("save-edit").onclick = () => {
    if (!selectedItem) return;
    executeApi(
      Promise.all([
        fetchJSON(
          `/api/portfolio/assets/${encodeURIComponent(selectedItem.ticker)}/current?current_qty=${num($("edit-current").value)}`,
          { method: "PATCH" },
        ),
        fetchJSON(
          `/api/portfolio/assets/${encodeURIComponent(selectedItem.ticker)}/target?target_qty=${num($("edit-target").value)}`,
          { method: "PATCH" },
        ),
      ]),
      "Сохранено",
      "modal-root",
    );
  };

  $("delete-edit").onclick = () => {
    if (!selectedItem || !confirm(`Удалить ${selectedItem.ticker}?`)) return;
    executeApi(
      fetchJSON(
        `/api/portfolio/assets/${encodeURIComponent(selectedItem.ticker)}`,
        { method: "DELETE" },
      ),
      "Удалено",
      "modal-root",
    );
  };

  $("refresh-btn").onclick = refreshAll;
  if ($("refresh-history-btn")) $("refresh-history-btn").onclick = loadHistory;

  $("bulk-export").onclick = () => {
    const items = getVisiblePortfolio();
    if (!items.length) return toast("Нет данных");
    const csv = [
      "ticker,type,price,current_qty,target_qty,value",
      ...items.map(
        (p) =>
          `${p.ticker || ""},${p.type || ""},${num(p.price)},${p.current_qty || 0},${p.target_qty || 0},${num(p.value)}`,
      ),
    ].join("\n");
    Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
      download: "portfolio.csv",
    }).click();
    toast("CSV скачан");
  };

  refreshAll();
});
