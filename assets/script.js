/* ------------------------ DATA ------------------------ */
const STORAGE_KEY = "taskquest-data-v2";
let data = {
  tasks: [],
  goals: [],
  shopping: [],
  note: { title: "", content: "" },
};

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch (e) {
      console.error("Failed to parse data", e);
    }
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* ------------------------ UTILITIES ------------------------ */
function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

function formatDate(str) {
  if (!str) return "No deadline";
  return new Date(str).toLocaleDateString();
}

function toggleEmptyState(page) {
  const listEl = document.getElementById(page + "List");
  const emptyEl = document.getElementById(page + "Empty");
  emptyEl.style.display = listEl.children.length ? "none" : "block";
}

/* ------------------------ RENDERING ------------------------ */
function renderList(page) {
  const listEl = document.getElementById(page + "List");
  listEl.innerHTML = "";
  data[page].forEach((item) => {
    const li = document.createElement("li");
    li.className = "task-item";

    const info = document.createElement("div");
    info.className = "task-info";
    info.innerHTML = `
       <span class="task-title">${item.title}</span>
       ${
         page !== "shopping"
           ? `<span class="task-meta">${formatDate(
               item.deadline
             )} · Priority: ${item.priority}</span>`
           : ""
       }
     `;

    const actions = document.createElement("div");
    actions.className = "task-actions";
    actions.innerHTML = `
       <button title="Edit">✏️</button>
       <button title="Delete">🗑️</button>
     `;

    actions.children[0].addEventListener("click", () =>
      openModal(page, item.id)
    );
    actions.children[1].addEventListener("click", () =>
      deleteItem(page, item.id)
    );

    li.appendChild(info);
    li.appendChild(actions);
    listEl.appendChild(li);
  });
  toggleEmptyState(page);
}

function renderAll() {
  ["tasks", "goals", "shopping"].forEach(renderList);
  // note
  document.getElementById("noteTitle").value = data.note.title;
  document.getElementById("noteContent").innerHTML = data.note.content;
}

/* ------------------------ CRUD via MODAL ------------------------ */
const itemModal = document.getElementById("itemModal");
const modalTitleEl = document.getElementById("modalTitle");
const titleInput = document.getElementById("itemTitle");
const deadlineInput = document.getElementById("itemDeadline");
const prioritySelect = document.getElementById("itemPriority");
const deadlineRow = document.getElementById("deadlineRow");
const priorityRow = document.getElementById("priorityRow");

let currentPage = "tasks";
let editingId = null;

function openModal(page, id = null) {
  currentPage = page;
  editingId = id;
  const isEdit = id !== null;
  modalTitleEl.textContent = isEdit
    ? "Edit " + capitalize(page.slice(0, -1))
    : "New " + capitalize(page.slice(0, -1));

  const showMeta = page !== "shopping";
  deadlineRow.style.display = showMeta ? "flex" : "none";
  priorityRow.style.display = page === "tasks" ? "flex" : "none";

  if (isEdit) {
    const item = data[page].find((t) => t.id === id);
    titleInput.value = item.title;
    deadlineInput.value = item.deadline || "";
    prioritySelect.value = item.priority || "Medium";
  } else {
    titleInput.value = "";
    deadlineInput.value = "";
    prioritySelect.value = "Medium";
  }

  itemModal.style.display = "flex";
  titleInput.focus();
}

function closeModal() {
  itemModal.style.display = "none";
}

document.getElementById("modalCancel").addEventListener("click", closeModal);

document.getElementById("modalSave").addEventListener("click", () => {
  const title = titleInput.value.trim();
  if (!title) {
    alert("Title is required");
    return;
  }
  const deadline = deadlineInput.value || null;
  const priority = prioritySelect.value;

  if (editingId) {
    const item = data[currentPage].find((t) => t.id === editingId);
    item.title = title;
    if (currentPage !== "shopping") item.deadline = deadline;
    if (currentPage === "tasks") item.priority = priority;
  } else {
    const newItem = { id: generateId(), title };
    if (currentPage !== "shopping") newItem.deadline = deadline;
    if (currentPage === "tasks") newItem.priority = priority;
    data[currentPage].push(newItem);
  }

  saveData();
  renderList(currentPage);
  closeModal();
});

function deleteItem(page, id) {
  if (!confirm("Delete this item?")) return;
  data[page] = data[page].filter((t) => t.id !== id);
  saveData();
  renderList(page);
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ------------------------ PAGE NAVIGATION ------------------------ */
const pages = ["tasks", "quick", "goals", "shopping"];

function showPage(page) {
  pages.forEach((p) => {
    document.getElementById(p + "Page").classList.toggle("active", p === page);
    document
      .querySelector(`.sidebar-item[data-page="${p}"]`)
      .classList.toggle("active", p === page);
  });
}

document.querySelectorAll(".sidebar-item").forEach((item) => {
  item.addEventListener("click", () => showPage(item.dataset.page));
});

/* ------------------------ NOTE AUTO-SAVE ------------------------ */
const noteTitleEl = document.getElementById("noteTitle");
const noteContentEl = document.getElementById("noteContent");

function saveNote() {
  data.note.title = noteTitleEl.value;
  data.note.content = noteContentEl.innerHTML;
  saveData();
}

noteTitleEl.addEventListener("input", saveNote);
noteContentEl.addEventListener("input", saveNote);

/* ------------------------ FAB BEHAVIOR ------------------------ */
const fab = document.getElementById("fab");
fab.addEventListener("click", () => {
  const activePage = pages.find((p) =>
    document.getElementById(p + "Page").classList.contains("active")
  );
  if (["tasks", "goals", "shopping"].includes(activePage)) {
    openModal(activePage);
  } else {
    alert("Nothing to add on this page");
  }
});

/* ------------------------ EXPORT & CLEAR ------------------------ */
document.getElementById("exportBtn").addEventListener("click", () => {
  navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  alert("Data copied to clipboard!");
});

document.getElementById("clearBtn").addEventListener("click", () => {
  if (confirm("Clear all local data?")) {
    localStorage.removeItem(STORAGE_KEY);
    data = {
      tasks: [],
      goals: [],
      shopping: [],
      note: { title: "", content: "" },
    };
    renderAll();
  }
});

/* ------------------------ INIT ------------------------ */
loadData();
renderAll();
