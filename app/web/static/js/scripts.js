async function loadPortfolio() {
  const response = await fetch("/api/portfolio");
  const data = await response.json();

  const tbody = document.getElementById("portfolio-body");
  tbody.innerHTML = "";

  for (const item of data) {
    const row = document.createElement("tr");

    row.innerHTML = `
            <td><strong>${item.ticker}</strong></td>
            <td>${item.type === "share" ? "Акция" : "Облигация"}</td>
            <td>${item.price.toFixed(2)} ₽</td>
            <td>${item.current_qty}</td>
            <td>${item.target_qty}</td>
            <td>${item.value.toFixed(2)} ₽</td>
            <td>
                <div class="progress">
                    <div class="bar" style="width:${item.progress_percent}%"></div>
                </div>
            </td>
        `;

    row.addEventListener("click", () => openEditPanel(item));
    tbody.appendChild(row);
  }
}

function openEditPanel(item) {
  document.getElementById("edit-ticker").value = item.ticker;
  document.getElementById("edit-type").value = item.type;
  document.getElementById("edit-current").value = item.current_qty;
  document.getElementById("edit-target").value = item.target_qty;

  document.getElementById("edit-overlay").classList.remove("hidden");
}

// Закрытие по клику на фон
document.getElementById("edit-overlay").addEventListener("click", (e) => {
  if (e.target.id === "edit-overlay") {
    e.target.classList.add("hidden");
  }
});

loadPortfolio();
const editOverlay = document.getElementById("edit-overlay");
const addOverlay = document.getElementById("add-overlay");

document.getElementById("add-btn").onclick = () => {
  addOverlay.classList.remove("hidden");
};

document.getElementById("close-add").onclick = () => {
  addOverlay.classList.add("hidden");
};

document.getElementById("close-edit").onclick = () => {
  editOverlay.classList.add("hidden");
};

function openEdit(item) {
  document.getElementById("edit-ticker").value = item.ticker;
  document.getElementById("edit-type").value =
    item.type === "share" ? "Акция" : "Облигация";

  document.getElementById("edit-current").value = item.current_qty;
  document.getElementById("edit-target").value = item.target_qty;

  editOverlay.classList.remove("hidden");
}

// закрытие по клику на фон
document.querySelectorAll(".modal-overlay").forEach((overlay) => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.add("hidden");
  });
});
