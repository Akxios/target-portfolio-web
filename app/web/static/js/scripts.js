const $ = (id) => document.getElementById(id);

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

const formatCurrency = (v) =>
  typeof v !== "number" || isNaN(v)
    ? "—"
    : v.toLocaleString("ru-RU", { maximumFractionDigits: 2 }) + " ₽";

// --- СОСТОЯНИЕ ---
let portfolio = [];
let selectedItem = null;
let sortKey = "ticker";
let sortDir = 1;

// --- РЕНДЕР СТАТИСТИКИ ---
function renderStats() {
  const totalValue = portfolio.reduce((s, i) => s + (Number(i.value) || 0), 0);
  const totalTarget = portfolio.reduce(
    (s, i) => s + (Number(i.target_qty) || 0) * (Number(i.price) || 0),
    0,
  );
  const avgPrice = portfolio.length
    ? portfolio.reduce((s, i) => s + (Number(i.price) || 0), 0) /
      portfolio.length
    : 0;
  const achieved =
    totalTarget > 0 ? Math.round((totalValue / totalTarget) * 100) : 0;

  $("total-value").textContent = formatCurrency(totalValue);
  $("achieved-value").textContent = `${achieved} %`;
  $("average-price").textContent = formatCurrency(Math.round(avgPrice));
  $("total-count").textContent = portfolio.length;
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
    cols[1].textContent = formatCurrency(Number(item.price));
    cols[2].textContent = item.current_qty || 0;
    cols[3].textContent = item.target_qty || 0;
    cols[4].textContent = formatCurrency(Number(item.value));

    const progress =
      item.target_qty > 0
        ? Math.min((item.current_qty / item.target_qty) * 100, 100)
        : 0;
    cols[5].querySelector(".bar").style.width = `${Math.round(progress)}%`;
    cols[5].querySelector(".progress-percent").textContent =
      `${Math.round(progress)}%`;
  }

  tr.addEventListener("click", () => {
    selectedItem = item;
    $("edit-ticker").value = item.ticker || "";
    $("edit-type").value = item.type || "share";
    $("edit-current").value = item.current_qty || 0;
    $("edit-target").value = item.target_qty || 0;
    $("modal-root").style.display = "flex";
  });

  return tr;
}

function renderTable() {
  const tbody = $("portfolio-body");
  if (!tbody) return;

  const sorted = [...portfolio].sort((a, b) => {
    const av = a[sortKey] ?? "",
      bv = b[sortKey] ?? "";
    if (!isNaN(av) && !isNaN(bv)) return (av - bv) * sortDir;
    return String(av).localeCompare(String(bv)) * sortDir;
  });

  tbody.innerHTML = "";
  tbody.append(...sorted.map(createRowNode));
}

// --- ЗАГРУЗКА ПОРТФЕЛЯ ---
async function fetchPortfolio() {
  try {
    portfolio = (await fetchJSON("/api/portfolio")) || [];
    renderStats();
    renderTable();
    window.pieChart?.update(portfolio);
  } catch (e) {
    toast("Не удалось загрузить портфель");
  }
}

// --- ЗАГРУЗКА ИСТОРИИ ---
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

    if (!history.length) {
      tbody.innerHTML =
        '<tr><td colspan="4" style="text-align:center;color:var(--muted);">История пуста</td></tr>';
      return;
    }

    tbody.innerHTML = history
      .map((tx) => {
        const d = new Date(tx.timestamp);
        const dateStr = `${d.toLocaleDateString("ru-RU")} ${d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
        const action = ACTION_MAP[tx.action] || {
          text: tx.action,
          cls: "action-info",
        };

        return `
        <tr>
          <td class="hint">${dateStr}</td>
          <td><span class="ticker-pill">${tx.ticker}</span></td>
          <td><span class="action-badge ${action.cls}">${action.text}</span></td>
          <td class="col-num strong">${tx.previous_qty} → ${tx.new_qty}</td>
        </tr>
      `;
      })
      .join("");
  } catch (e) {
    tbody.innerHTML =
      '<tr><td colspan="4" style="text-align:center;color:var(--danger);">Ошибка загрузки</td></tr>';
  }
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
    resultsBox.innerHTML = "";

    if (!items?.length) {
      resultsBox.innerHTML = `<div style="padding:10px;color:var(--muted)">Ничего не найдено</div>`;
    } else {
      items.forEach((it) => {
        const div = document.createElement("div");
        div.className = "asset-search-item";
        div.innerHTML = `
          <div class="ticker">${it.ticker || it.secid || "—"}</div>
          <div class="name">${it.name || it.shortname || "—"}</div>
          <div class="price">${it.price ? formatCurrency(Number(it.price)) : "—"}</div>
        `;
        div.onclick = () => {
          $("add-ticker").value = $("asset-search-input").value =
            it.ticker || it.secid;
          $("add-type").value = it.type || getSelectedAssetType();
          document
            .querySelectorAll("#add-type-switch .asset-type-btn")
            .forEach((b) =>
              b.classList.toggle(
                "active",
                b.dataset.type === $("add-type").value,
              ),
            );
          resultsBox.style.display = "none";
        };
        resultsBox.appendChild(div);
      });
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

  // Сортировка таблицы
  document.querySelectorAll("th[data-key]").forEach((th) => {
    th.addEventListener("click", () => {
      document
        .querySelectorAll("th[data-key]")
        .forEach((h) => h.classList.remove("sorted-asc", "sorted-desc"));
      sortDir = sortKey === th.dataset.key ? -sortDir : 1;
      sortKey = th.dataset.key;
      th.classList.add(sortDir === 1 ? "sorted-asc" : "sorted-desc");
      renderTable();
    });
  });

  // Модалка добавления
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

  // Модалка редактирования
  $("close-edit").onclick = () => ($("modal-root").style.display = "none");
  $("modal-root").onclick = (e) =>
    e.target === $("modal-root") && ($("modal-root").style.display = "none");

  // Переключение типов активов (Акция/Облигация)
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

  // Поиск
  $("asset-search-input").oninput = debounce((e) =>
    searchAssetsGlobal(e.target.value),
  );

  // ДОБАВИТЬ
  $("submit-add").onclick = async () => {
    const ticker =
      $("add-ticker").value.trim() ||
      $("asset-search-input").value.trim().toUpperCase();
    if (!ticker) return toast("Введите тикер");

    try {
      await fetchJSON("/api/portfolio/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker,
          type: $("add-type").value,
          current_qty: Number($("add-current").value),
          target_qty: Number($("add-target").value),
        }),
      });
      toast("Актив добавлен");
      closeAdd();
      await fetchPortfolio();
      await loadHistory();
    } catch (e) {
      toast(e.message || "Ошибка");
    }
  };

  // СОХРАНИТЬ (РЕДАКТИРОВАНИЕ)
  $("save-edit").onclick = async () => {
    if (!selectedItem) return;
    try {
      await fetchJSON(
        `/api/portfolio/assets/${encodeURIComponent(selectedItem.ticker)}/current?current_qty=${Number($("edit-current").value)}`,
        { method: "PATCH" },
      );
      await fetchJSON(
        `/api/portfolio/assets/${encodeURIComponent(selectedItem.ticker)}/target?target_qty=${Number($("edit-target").value)}`,
        { method: "PATCH" },
      );
      toast("Сохранено");
      $("modal-root").style.display = "none";
      await fetchPortfolio();
      await loadHistory();
    } catch {
      toast("Ошибка при сохранении");
    }
  };

  // УДАЛИТЬ
  $("delete-edit").onclick = async () => {
    if (!selectedItem || !confirm(`Удалить ${selectedItem.ticker}?`)) return;
    try {
      await fetchJSON(
        `/api/portfolio/assets/${encodeURIComponent(selectedItem.ticker)}`,
        { method: "DELETE" },
      );
      toast("Удалено");
      $("modal-root").style.display = "none";
      await fetchPortfolio();
      await loadHistory();
    } catch {
      toast("Ошибка при удалении");
    }
  };

  // ОБНОВЛЕНИЕ
  const refreshAll = () => {
    fetchPortfolio();
    loadHistory();
  };
  $("refresh-btn").onclick = refreshAll;
  if ($("refresh-history-btn")) $("refresh-history-btn").onclick = loadHistory;

  // ЭКСПОРТ CSV
  $("bulk-export").onclick = () => {
    if (!portfolio.length) return toast("Нет данных");
    const csv = [
      "ticker,type,price,current_qty,target_qty,value",
      ...portfolio.map(
        (p) =>
          `${p.ticker || ""},${p.type || ""},${Number(p.price) || 0},${p.current_qty || 0},${p.target_qty || 0},${Number(p.value) || 0}`,
      ),
    ].join("\n");

    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "portfolio.csv";
    a.click();
    toast("CSV скачан");
  };

  // ПЕРВЫЙ ЗАПУСК
  refreshAll();
});
