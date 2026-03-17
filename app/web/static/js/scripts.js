// static/js/scripts.js
(() => {
  "use strict";

  // --- Утилиты ---
  const $ = (id) => document.getElementById(id);
  const num = (v) => {
    if (v == null || v === "") return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

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

  async function fetchJSON(url, opts = {}) {
    const res = await fetch(url, opts);
    if (!res.ok) {
      let text = "";
      try {
        text = await res.text();
      } catch (e) {
        // ignore
      }
      let json = null;
      try {
        json = JSON.parse(text);
      } catch (e) {
        // ignore
      }
      throw new Error(
        json?.detail || text || res.statusText || "Network error",
      );
    }
    if (res.status === 204) return null;
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  // executeApi: принимает либо промис, либо функцию, возвращающую промис
  async function executeApi(requestOrFn, successMsg, closeElementId = null) {
    try {
      const promise =
        typeof requestOrFn === "function" ? requestOrFn() : requestOrFn;
      await promise;
      toast(successMsg);
      if (closeElementId && $(closeElementId))
        $(closeElementId).style.display = "none";
      refreshAll();
    } catch (e) {
      console.error(e);
      toast(e?.message || "Ошибка");
    }
  }

  // Форматирование валют (поддержка валюты в item.currency)
  function formatCurrency(value, currency = "RUB") {
    if (typeof value !== "number" || !isFinite(value)) return "—";
    const cur = (currency || "RUB").toUpperCase();
    try {
      if (cur === "RUB") {
        // Форматируем по-русски и добавляем ₽
        return (
          new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(
            value,
          ) + " ₽"
        );
      } else {
        return new Intl.NumberFormat("ru-RU", {
          style: "currency",
          currency: cur,
          maximumFractionDigits: 2,
        }).format(value);
      }
    } catch {
      // fallback
      return (
        value.toLocaleString("ru-RU", { maximumFractionDigits: 2 }) +
        (cur === "RUB" ? " ₽" : ` ${cur}`)
      );
    }
  }

  const dtf = new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  });

  const ASSET_TYPE_LABEL = {
    share: "Акция",
    bond: "Облигация",
    fund: "Фонд",
    currency: "Валюта",
  };

  // --- СОСТОЯНИЕ ---
  let portfolio = [];
  let selectedItem = null;
  let sortKey = "ticker";
  let sortDir = 1;
  let currentView = "all";

  const getVisiblePortfolio = () =>
    currentView === "all"
      ? portfolio
      : portfolio.filter((p) => (p.type || "share") === currentView);

  // --- РЕНДЕР СТАТИСТИКИ ---
  function renderStats() {
    const items = getVisiblePortfolio();

    // Группируем по валюте
    const totalsByCurrency = items.reduce((acc, item) => {
      const cur = (item.currency || "RUB").toUpperCase();
      acc[cur] = (acc[cur] || 0) + num(item.value);
      return acc;
    }, {});

    // total-value: показываем все валюты через запятую
    const totalValueEl = $("total-value");
    if (totalValueEl) {
      const parts = Object.keys(totalsByCurrency).length
        ? Object.entries(totalsByCurrency).map(
            ([cur, sum]) =>
              `${formatCurrency(sum, cur)}${cur !== "RUB" ? ` (${cur})` : ""}`,
          )
        : ["—"];
      totalValueEl.textContent = parts.join(", ");
    }

    // achieved-value: суммируем все значения в выбранных валютах (без конвертации) / target (в рублях без конвертации)
    const totalTarget = items.reduce(
      (s, i) => s + num(i.target_qty) * num(i.price),
      0,
    );
    const achievedEl = $("achieved-value");
    if (achievedEl) {
      const totalSum = Object.values(totalsByCurrency).reduce(
        (a, b) => a + b,
        0,
      );
      achievedEl.textContent =
        totalTarget > 0
          ? `${Math.round((totalSum / totalTarget) * 100)} %`
          : "0 %";
    }

    // average-price
    const prices = items.map((i) => num(i.price)).filter((p) => p > 0);
    const avgPrice = prices.length
      ? prices.reduce((a, b) => a + b, 0) / prices.length
      : 0;
    const avgEl = $("average-price");
    if (avgEl) avgEl.textContent = formatCurrency(Math.round(avgPrice));

    const countEl = $("total-count");
    if (countEl) countEl.textContent = items.length;
  }

  // --- ТАБЛИЦА ---
  function createRowNode(item) {
    const tpl = $("row-template");
    let tr;
    if (tpl && tpl.content) {
      tr = tpl.content.cloneNode(true).querySelector("tr");
    } else {
      tr = document.createElement("tr");
      tr.innerHTML = `<td class="col-asset"><strong class="row-ticker">—</strong><span class="asset-type hint">—</span></td>
        <td class="col-num">—</td><td class="col-num">0</td><td class="col-num">0</td><td class="col-num strong">—</td><td class="col-progress"><div class="progress"><div class="bar" style="width:0%"></div></div><div class="progress-percent">0%</div></td>`;
    }

    const ticker = item.ticker || item.secid || "—";
    const name = item.name || item.shortname || ticker;
    const typeLabel = ASSET_TYPE_LABEL[item.type] || item.type || "—";
    const currency = (item.currency || "RUB").toUpperCase();

    const tickerNode = tr.querySelector(".row-ticker");
    if (tickerNode) tickerNode.textContent = name || ticker;

    const assetTypeNode = tr.querySelector(".asset-type");
    if (assetTypeNode) assetTypeNode.textContent = `${ticker} · ${typeLabel}`;

    const cols = tr.querySelectorAll("td");
    if (cols.length >= 6) {
      cols[1].textContent = formatCurrency(num(item.price), currency);
      cols[2].textContent = num(item.current_qty);
      cols[3].textContent = num(item.target_qty);
      cols[4].textContent = formatCurrency(num(item.value), currency);

      const progress =
        num(item.target_qty) > 0
          ? Math.min((num(item.current_qty) / num(item.target_qty)) * 100, 100)
          : 0;
      const progressBar = cols[5].querySelector(".bar");
      const progressText = cols[5].querySelector(".progress-percent");
      if (progressBar) progressBar.style.width = `${Math.round(progress)}%`;
      if (progressText) progressText.textContent = `${Math.round(progress)}%`;
    }

    tr.dataset.ticker = item.ticker || "";
    tr.dataset.type = item.type || "";

    tr.onclick = () => {
      selectedItem = item;
      if ($("edit-ticker")) $("edit-ticker").value = item.ticker || "";
      if ($("edit-type")) $("edit-type").value = item.type || "share";
      if ($("edit-current")) $("edit-current").value = num(item.current_qty);
      if ($("edit-target")) $("edit-target").value = num(item.target_qty);
      if ($("modal-root")) $("modal-root").style.display = "flex";
    };

    return tr;
  }

  function sortComparator(a, b) {
    const av = a[sortKey] ?? "";
    const bv = b[sortKey] ?? "";
    const an = Number(av);
    const bn = Number(bv);
    if (!Number.isNaN(an) && !Number.isNaN(bn)) return (an - bn) * sortDir;
    return (
      String(av).localeCompare(String(bv), "ru", { sensitivity: "base" }) *
      sortDir
    );
  }

  function renderTable() {
    const tbody = $("portfolio-body");
    if (!tbody) return;
    const rows = [...getVisiblePortfolio()].sort(sortComparator);
    tbody.innerHTML = "";
    const nodes = rows.map(createRowNode);
    tbody.append(...nodes);
  }

  function render() {
    renderStats();
    renderTable();
    try {
      window.pieChart?.update?.(getVisiblePortfolio());
    } catch (e) {
      console.warn("pieChart update failed", e);
    }
  }

  // --- ЗАГРУЗКА ДАННЫХ ---
  async function fetchPortfolio() {
    try {
      portfolio = (await fetchJSON("/api/portfolio")) || [];
      render();
    } catch (e) {
      console.error(e);
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
      if (!history.length) {
        tbody.innerHTML =
          '<tr><td colspan="4" style="text-align:center;color:var(--muted);">История пуста</td></tr>';
        return;
      }
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
    } catch (e) {
      console.error(e);
      tbody.innerHTML =
        '<tr><td colspan="4" style="text-align:center;color:var(--danger);">Ошибка загрузки</td></tr>';
    }
  }

  function refreshAll() {
    fetchPortfolio();
    loadHistory();
  }

  // --- ПОИСК И ТИП АКТИВА ---
  // Надежное получение выбранного типа: сначала скрытое поле (если синхронизировано), иначе active button
  const getSelectedAssetType = () =>
    ($("add-type") && $("add-type").value) ||
    ($(".asset-type-btn.active")?.dataset &&
      document.querySelector(".asset-type-btn.active")?.dataset.type) ||
    "share";

  // searchAssetsGlobal: используем запрошенный тип для data-type, чтобы UI не "прыгал" при ответе API
  async function searchAssetsGlobal(q) {
    const resultsBox = $("asset-search-results");
    if (!resultsBox) return;
    const trimmed = q?.trim() || "";
    if (!trimmed || trimmed.length < 2)
      return (resultsBox.style.display = "none");

    const requestedType =
      ($("add-type") && $("add-type").value) ||
      document.querySelector(".asset-type-btn.active")?.dataset.type ||
      "share";

    try {
      const items =
        (await fetchJSON(
          `/api/moex/search?ticker=${encodeURIComponent(trimmed)}&type=${encodeURIComponent(requestedType)}`,
        )) || [];

      if (!items.length) {
        resultsBox.innerHTML = `<div style="padding:10px;color:var(--muted)">Ничего не найдено</div>`;
      } else {
        resultsBox.innerHTML = items
          .map((it) => {
            const t = it.ticker || it.secid || "";
            const name = it.name || it.shortname || t;
            const price = it.price
              ? formatCurrency(num(it.price), it.currency || "RUB")
              : "—";
            // ВАЖНО: для data-type используем запрошенный тип, а не it.type
            const dataType = requestedType;
            const dataCurrency = (it.currency || "RUB").toUpperCase();
            return `<div class="asset-search-item" data-ticker="${escapeHtml(t)}" data-type="${escapeHtml(dataType)}" data-name="${escapeHtml(name)}" data-currency="${escapeHtml(dataCurrency)}">
                      <div class="ticker">${escapeHtml(t) || "—"}</div>
                      <div class="name">${escapeHtml(name)}</div>
                      <div class="price">${price}</div>
                    </div>`;
          })
          .join("");
      }
      resultsBox.style.display = "block";
    } catch (e) {
      console.error(e);
      resultsBox.style.display = "none";
    }
  }

  // --- ИНИЦИАЛИЗАЦИЯ ---
  document.addEventListener("DOMContentLoaded", () => {
    // Инициализация pieChart, если есть
    try {
      window.pieChart?.init?.();
    } catch (e) {
      console.warn("pieChart init failed", e);
    }
    window.addEventListener("resize", () => window.pieChart?.resize?.());

    // Делегирование клика по результатам поиска
    const resultsBox = $("asset-search-results");
    resultsBox?.addEventListener("click", (e) => {
      const item = e.target.closest?.(".asset-search-item");
      if (!item) return;
      const ticker = item.dataset.ticker || "";
      const type =
        item.dataset.type ||
        $("add-type")?.value ||
        document.querySelector(".asset-type-btn.active")?.dataset.type ||
        "share";
      const name = item.dataset.name || "";
      const currency = item.dataset.currency || "RUB";

      if ($("add-ticker")) $("add-ticker").value = ticker;
      if ($("asset-search-input")) $("asset-search-input").value = ticker;
      if ($("add-type")) $("add-type").value = type;
      if ($("asset-search-type")) $("asset-search-type").value = type;

      // переключаем UI-кнопки типа
      document
        .querySelectorAll("#add-type-switch .asset-type-btn")
        .forEach((b) => {
          b.classList.toggle("active", b.dataset.type === type);
        });

      // (опционально можно заполнить дополнительные поля, если они есть)
      // if ($("add-name")) $("add-name").value = name;
      // if ($("add-currency")) $("add-currency").value = currency;

      resultsBox.style.display = "none";
    });

    // Фильтры
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".filter-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        currentView = btn.dataset.filter || "all";
        render();
      });
    });

    // Сортировка
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

    // Модалки
    const closeAdd = () => {
      if ($("add-root")) $("add-root").style.display = "none";
      if ($("add-ticker")) $("add-ticker").value = "";
      if ($("asset-search-input")) $("asset-search-input").value = "";
      if ($("asset-search-results"))
        $("asset-search-results").style.display = "none";
      if ($("add-current")) $("add-current").value = "0";
      if ($("add-target")) $("add-target").value = "0";
      // Сохраняем тип как share по умолчанию
      if ($("add-type")) $("add-type").value = "share";
      if ($("asset-search-type")) $("asset-search-type").value = "share";
      document
        .querySelectorAll("#add-type-switch .asset-type-btn")
        .forEach((b) =>
          b.classList.toggle("active", b.dataset.type === "share"),
        );
    };

    $("open-add-modal")?.addEventListener("click", () => {
      if ($("add-root")) $("add-root").style.display = "flex";
      setTimeout(() => $("asset-search-input")?.focus(), 100);
    });
    $("close-add")?.addEventListener("click", closeAdd);
    $("add-root")?.addEventListener(
      "click",
      (e) => e.target === $("add-root") && closeAdd(),
    );
    $("close-edit")?.addEventListener(
      "click",
      () => ($("modal-root").style.display = "none"),
    );
    $("modal-root")?.addEventListener(
      "click",
      (e) =>
        e.target === $("modal-root") &&
        ($("modal-root").style.display = "none"),
    );

    // Кнопки выбора типа в окне добавления
    document
      .querySelectorAll("#add-type-switch .asset-type-btn")
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          document
            .querySelectorAll("#add-type-switch .asset-type-btn")
            .forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          const newType = btn.dataset.type;
          if ($("add-type")) $("add-type").value = newType;
          if ($("asset-search-type")) $("asset-search-type").value = newType;

          const q = $("asset-search-input")?.value.trim();
          if (q && q.length >= 2) searchAssetsGlobal(q);
        });
      });

    // Поиск
    if ($("asset-search-input")) {
      $("asset-search-input").oninput = debounce(
        (e) => searchAssetsGlobal(e.target.value),
        300,
      );
    }

    // --- CRUD ---
    $("submit-add")?.addEventListener("click", () => {
      const ticker = (
        ($("add-ticker") && $("add-ticker").value) ||
        ($("asset-search-input") && $("asset-search-input").value) ||
        ""
      ).trim();
      if (!ticker) return toast("Введите тикер");

      const payload = {
        ticker,
        type: ($("add-type") && $("add-type").value) || "share",
        current_qty: num($("add-current")?.value),
        target_qty: num($("add-target")?.value),
        // опционально currency/name если в форме есть поля: не используют если отсутствуют
        // currency: ($("add-currency")?.value || "RUB").toUpperCase(),
        // name: $("add-name")?.value || undefined,
      };

      executeApi(
        () =>
          fetchJSON("/api/portfolio/positions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }),
        "Актив добавлен",
        "add-root",
      );
    });

    $("save-edit")?.addEventListener("click", () => {
      if (!selectedItem) return;
      const ticker = selectedItem.ticker;
      const newCurrent = num($("edit-current")?.value);
      const newTarget = num($("edit-target")?.value);

      executeApi(
        () =>
          Promise.all([
            fetchJSON(
              `/api/portfolio/assets/${encodeURIComponent(ticker)}/current?current_qty=${newCurrent}`,
              { method: "PATCH" },
            ),
            fetchJSON(
              `/api/portfolio/assets/${encodeURIComponent(ticker)}/target?target_qty=${newTarget}`,
              { method: "PATCH" },
            ),
          ]),
        "Сохранено",
        "modal-root",
      );
    });

    $("delete-edit")?.addEventListener("click", () => {
      if (!selectedItem) return;
      if (
        !confirm(
          `Удалить ${selectedItem.ticker || selectedItem.name || "актив"}?`,
        )
      )
        return;
      executeApi(
        () =>
          fetchJSON(
            `/api/portfolio/assets/${encodeURIComponent(selectedItem.ticker)}`,
            {
              method: "DELETE",
            },
          ),
        "Удалено",
        "modal-root",
      );
    });

    // Кнопки обновления
    $("refresh-btn")?.addEventListener("click", refreshAll);
    $("refresh-history-btn")?.addEventListener("click", loadHistory);

    // Экспорт CSV
    $("bulk-export")?.addEventListener("click", () => {
      const items = getVisiblePortfolio();
      if (!items.length) return toast("Нет данных");
      const csv = [
        "ticker,type,price,currency,current_qty,target_qty,value",
        ...items.map((p) =>
          [
            p.ticker || "",
            p.type || "",
            num(p.price),
            (p.currency || "RUB").toUpperCase(),
            num(p.current_qty),
            num(p.target_qty),
            num(p.value),
          ].join(","),
        ),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "portfolio.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast("CSV скачан");
    });

    // Initial load
    refreshAll();
  });
})();
