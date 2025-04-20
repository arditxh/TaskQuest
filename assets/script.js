// Make sure the Firebase SDKs are already loaded in your HTML <head>:
// - firebase-app.js
// - firebase-auth.js
// - firebase-firestore.js

// ✅ Firebase config (you already copied this correctly)
const firebaseConfig = {
  apiKey: "AIzaSyABUVEc_3zvLLxPZCo5cA2yToQ6nOOyjkE",
  authDomain: "taskquest-5561f.firebaseapp.com",
  projectId: "taskquest-5561f",
  storageBucket: "taskquest-5561f.appspot.com",
  messagingSenderId: "297466771120",
  appId: "1:297466771120:web:3dbd16281be60c3fe56d75",
  measurementId: "G-Q8HHF7LJLF"
};

// ✅ Initialize Firebase
firebase.initializeApp(firebaseConfig);

// ✅ Initialize Firestore and Auth using global firebase object
const db = firebase.firestore();
const auth = firebase.auth();

// DOM elements
const authModal = document.getElementById("accountModal");
const emailInput = document.getElementById("authEmail");
const passwordInput = document.getElementById("authPassword");
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");

// Login
loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  try {
    await auth.signInWithEmailAndPassword(email, password);
    console.log("✅ Logged in as:", email);
  } catch (err) {
    alert("Login failed: " + err.message);
  }
});

// Signup
signupBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  try {
    await auth.createUserWithEmailAndPassword(email, password);
    console.log("✅ Account created for:", email);
  } catch (err) {
    alert("Signup failed: " + err.message);
  }
});

// Auth state listener
auth.onAuthStateChanged(user => {
  if (user) {
    authModal.style.display = "none";
    console.log("🔐 User is logged in:", user.email);
    // Optional: load tasks for user here
  } else {
    authModal.style.display = "flex";
  }
});


// Firebase auth functions
function signup(email, password) {
  return auth.createUserWithEmailAndPassword(email, password);
}

function login(email, password) {
  return auth.signInWithEmailAndPassword(email, password);
}

// Listen for login state changes
auth.onAuthStateChanged(async (user) => {
  const modal = document.getElementById("accountModal");
  if (user) {
    modal.style.display = "none";
    const tasks = await loadTasksFromDB(user.uid);
    data.tasks = tasks;
    renderList("tasks");
  } else {
    modal.style.display = "flex";
    data.tasks = [];
    renderList("tasks");
  }
});


async function loadTasksFromDB(uid) {
  const snapshot = await db.collection("users").doc(uid).collection("tasks").get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function saveTaskToDB(uid, task) {
  await db.collection("users").doc(uid).collection("tasks").doc(task.id).set(task);
}

async function deleteTaskFromDB(uid, taskId) {
  await db.collection("users").doc(uid).collection("tasks").doc(taskId).delete();
}



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

document.getElementById("modalSave").addEventListener("click", async () => {
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
if (auth.currentUser && currentPage === "tasks") {
  await saveTaskToDB(auth.currentUser.uid, newItem);
}

  }

  saveData();
  renderList(currentPage);
  closeModal();
});

async function deleteItem(page, id) {
  if (!confirm("Delete this item?")) return;
  data[page] = data[page].filter((t) => t.id !== id);
  if (auth.currentUser && page === "tasks") {
    await deleteTaskFromDB(auth.currentUser.uid, id);
  }
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
const acctModal = document.getElementById("accountModal");
const userNameInput = document.getElementById("userNameInput");
const acctCancel = document.getElementById("acctCancel");
const acctSave = document.getElementById("acctSave");

// Temporary password logic for simplicity (you can improve this later)
const DEFAULT_PASSWORD = "taskquest123";

acctCancel.addEventListener("click", () => {
  acctModal.style.display = "none";
});

acctSave.addEventListener("click", async () => {
  const email = userNameInput.value.trim();
  const password = DEFAULT_PASSWORD;

  if (!email.includes("@")) {
    alert("Please enter a valid email (e.g. user@example.com)");
    return;
  }

  try {
    // Attempt login
    await login(email, password);
  } catch (err) {
    if (err.code === "auth/user-not-found") {
      // User doesn't exist: create it
      try {
        await signup(email, password);
        console.log("✅ Account created for", email);
      } catch (signupError) {
        console.error("Signup failed:", signupError.message);
        alert("Signup failed: " + signupError.message);
      }
    } else if (err.code === "auth/wrong-password") {
      alert("Password is incorrect for this account.");
    } else if (err.code === "auth/invalid-email") {
      alert("That’s not a valid email address.");
    } else {
      console.error(err);
      alert("Login failed: " + err.message);
    }
  }
});




/* ------------------------ INIT ------------------------ */
loadData();
renderAll();
