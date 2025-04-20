/* ------------------------ DATA ------------------------ */
const STORAGE_KEY = "taskquest-data-v2";
let data = {
  tasks: [],
  goals: [],
  shopping: [],
  note: { title: "", content: "" },
  profile: {
    xp: 0,
    badges: [],
    rewards: []
  }
};

const badgeCriteria = [
  {
    id: "firstTask",
    name: "First Task Done!",
    condition: data => data.profile.xp >= 5
  },
  {
    id: "taskMaster",
    name: "Task Master",
    condition: data => data.profile.xp >= 100
  }
];

const rewardCriteria = [
  {
    id: "darkMode",
    name: "Dark Mode Theme",
    condition: data => data.profile.xp >= 50
  },
  {
    id: "goldenBadge",
    name: "Golden Badge Set",
    condition: data => data.profile.badges.length >= 2
  }
];

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
    let exclamations = "";
    if (page === "tasks") {
      if (item.priority === "High") {
        exclamations = '<span class="exclamations">❗❗</span>';
      } else if (item.priority === "Medium") {
        exclamations = '<span class="exclamations">❗</span>';
      }
    }

    const info = document.createElement("div");
    info.className = "task-info";
    info.innerHTML = `
  <span class="task-title">${item.title}</span>
  ${
    page !== "shopping"
      ? `<span class="task-meta">${formatDate(item.deadline)} · Priority: ${
          item.priority
        } ${exclamations}</span>`
      : ""
  }
`;

    const actions = document.createElement("div");
    actions.className = "task-actions";
    actions.innerHTML = `
       <button title="Complete">✅</button>
       <button title="Edit">✏️</button>
       <button title="Delete">🗑️</button>
     `;

    actions.children[0].addEventListener("click", () =>
      completeTask(item.id)
    );
    actions.children[1].addEventListener("click", () =>
      openModal(page, item.id)
    );
    actions.children[2].addEventListener("click", () =>
      deleteItem(page, item.id)
    );

    li.appendChild(info);
    li.appendChild(actions);
    listEl.appendChild(li);
  });
  toggleEmptyState(page);
  renderGamification();
}

function renderAll() {
  ["tasks", "goals", "shopping"].forEach(renderList);
  document.getElementById("noteTitle").value = data.note.title;
  document.getElementById("noteContent").innerHTML = data.note.content;
  renderGamification();

  // ✅ Apply dark mode if reward was unlocked
  if (data.profile.rewards.includes("darkMode")) {
    enableDarkMode();
  }
}


function renderGamification() {
  const xpEl = document.getElementById("xpDisplay");
  const badgeEl = document.getElementById("badgeDisplay");
  xpEl.textContent = `XP: ${data.profile.xp}`;
  badgeEl.innerHTML = data.profile.badges.map(id => `🏅 ${id}`).join(" ");
}
function enableDarkMode() {
  document.body.classList.add("dark");
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

function completeTask(id) {
  const task = data.tasks.find(t => t.id === id);
  if (!task) return;

  let xpGained = 0;
  if (task.priority === "Low") xpGained = 5;
  else if (task.priority === "Medium") xpGained = 10;
  else if (task.priority === "High") xpGained = 20;

  data.profile.xp += xpGained;
  checkBadgesAndRewards();
  checkRewards();
  data.tasks = data.tasks.filter(t => t.id !== id);
  saveData();
  renderList("tasks");
}

function checkBadgesAndRewards() {
  badgeCriteria.forEach(badge => {
    if (!data.profile.badges.includes(badge.id) && badge.condition(data)) {
      data.profile.badges.push(badge.id);
      alert(`🎉 New Badge Unlocked: ${badge.name}!`);
    }
  });
}

function checkRewards() {
  rewardCriteria.forEach(reward => {
    if (!data.profile.rewards.includes(reward.id) && reward.condition(data)) {
      data.profile.rewards.push(reward.id);
      alert(`🎁 New Reward Unlocked: ${reward.name}!`);
      if (reward.id === "darkMode") enableDarkMode(); // ⬅️ apply dark mode
    }
  });
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
      profile: {
        xp: 0,
        badges: [],
        rewards: []
      }
    };
    renderAll();
  }
});

/* ------------------------ INIT ------------------------ */
loadData();
renderAll();
