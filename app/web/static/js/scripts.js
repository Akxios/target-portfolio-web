alert("scripts.js loaded");
console.log("scripts.js loaded");

let selectedItem = null;

async function loadPortfolio() {
  const response = await fetch("/api/portfolio");
  if (!response.ok) {
    alert("Ошибка загрузки портфеля");
    return;
  }

  const data = await response.json();
  const tbody = document.getElementById("portfolio-body");
  tbody.innerHTML = "";

  for (const item of data) {
    const row = document.createElement("tr");

    const progress =
      item.target_qty > 0
        ? Math.min((item.current_qty / item.target_qty) * 100, 100)
        : 0;

    row.innerHTML = `
      <td><strong>${item.ticker}</strong></td>
      <td>${item.type === "share" ? "Акция" : "Облигация"}</td>
      <td>${item.price?.toFixed(2) ?? "-"} ₽</td>
      <td>${item.current_qty}</td>
      <td>${item.target_qty}</td>
      <td>${item.value?.toFixed(2) ?? "-"} ₽</td>
      <td>
        <div class="progress">
          <div class="bar" style="width:${progress}%"></div>
        </div>
      </td>
    `;

    row.onclick = () => openEditPanel(item);
    tbody.appendChild(row);
  }
}

const editOverlay = document.getElementById("edit-overlay");

function openEditPanel(item) {
  selectedItem = item;

  document.getElementById("edit-ticker").value = item.ticker;
  document.getElementById("edit-type").value =
    item.type === "share" ? "Акция" : "Облигация";
  document.getElementById("edit-current").value = item.current_qty;
  document.getElementById("edit-target").value = item.target_qty;

  editOverlay.classList.remove("hidden");
}

editOverlay.onclick = (e) => {
  if (e.target === editOverlay) closeEditPanel();
};

document.getElementById("close-edit").onclick = closeEditPanel;

function closeEditPanel() {
  editOverlay.classList.add("hidden");
  selectedItem = null;
}

document.getElementById("save-edit").onclick = async () => {
  if (!selectedItem) return;

  const ticker = selectedItem.ticker;
  const current_qty = Number(document.getElementById("edit-current").value);
  const target_qty = Number(document.getElementById("edit-target").value);

  await fetch(
    `/api/portfolio/assets/${ticker}/current?current_qty=${current_qty}`,
    { method: "PATCH" },
  );

  await fetch(
    `/api/portfolio/assets/${ticker}/target?target_qty=${target_qty}`,
    { method: "PATCH" },
  );

  closeEditPanel();
  await loadPortfolio();
};

document.getElementById("delete-edit").onclick = async () => {
  if (!selectedItem) return;

  const ticker = selectedItem.ticker;
  if (!confirm(`Удалить ${ticker}?`)) return;

  await fetch(`/api/portfolio/assets/${ticker}`, {
    method: "DELETE",
  });

  closeEditPanel();
  await loadPortfolio();
};

const addOverlay = document.getElementById("add-overlay");

document.getElementById("add-btn").onclick = () =>
  addOverlay.classList.remove("hidden");

document.getElementById("close-add").onclick = () =>
  addOverlay.classList.add("hidden");

addOverlay.onclick = (e) => {
  if (e.target === addOverlay) addOverlay.classList.add("hidden");
};

document.getElementById("submit-add").onclick = async () => {
  const ticker = document.getElementById("add-ticker").value.trim();
  const type = document.getElementById("add-type").value;
  const current_qty = Number(document.getElementById("add-current").value);
  const target_qty = Number(document.getElementById("add-target").value);

  if (!ticker) {
    alert("Введите тикер");
    return;
  }

  const resp = await fetch("/api/portfolio/positions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticker, type, current_qty, target_qty }),
  });

  if (!resp.ok) {
    const err = await resp.json();
    alert(err.detail ?? "Ошибка при добавлении актива");
    return;
  }

  document.getElementById("add-ticker").value = "";
  document.getElementById("add-current").value = "";
  document.getElementById("add-target").value = "";

  addOverlay.classList.add("hidden");
  await loadPortfolio();
};

document.getElementById("refresh-btn").onclick = loadPortfolio;

loadPortfolio();
