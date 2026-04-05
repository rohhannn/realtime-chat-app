const socket = io();

// ================= USER =================

let username = prompt("Enter your name");

if (!username || username.trim() === "") {
  username = "User_" + Math.floor(Math.random() * 1000);
}

document.getElementById("currentUser").innerText = username;

socket.emit("join", username);

// ================= ELEMENTS =================

const messages = document.getElementById("messages");
const input = document.getElementById("msg");
const typingDiv = document.getElementById("typing");
const usersList = document.getElementById("users");

// ================= SEND MESSAGE =================

function sendMessage() {
  const msg = input.value;

  if (!msg.trim()) return;

  socket.emit("message", msg);

  input.value = "";
}

// ENTER KEY
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendMessage();
  } else {
    socket.emit("typing");
  }
});

// ================= RECEIVE MESSAGE =================

socket.on("message", (data) => {

  const wrapper = document.createElement("div");

  wrapper.className = "message " + (data.user === username ? "me" : "other");

  const avatar = data.user.charAt(0).toUpperCase();

  wrapper.innerHTML = `
    <div class="avatar">${avatar}</div>

    <div class="bubble">
      <div class="name">${data.user}</div>
      <div class="text">${data.text}</div>
      <div class="time">${data.time}</div>
    </div>
  `;

  messages.appendChild(wrapper);

  // Auto scroll
  messages.scrollTop = messages.scrollHeight;

  // Notification
  if (data.user !== username) {
    showNotification(data.user, data.text);
  }
});

// ================= TYPING =================

socket.on("typing", (msg) => {
  typingDiv.innerText = msg;

  setTimeout(() => {
    typingDiv.innerText = "";
  }, 1000);
});

// ================= ONLINE USERS =================

socket.on("onlineUsers", (users) => {
  usersList.innerHTML = "";

  users.forEach(u => {
    const li = document.createElement("li");

    li.innerHTML = `
      <span class="dot"></span>
      ${u}
    `;

    usersList.appendChild(li);
  });
});

// ================= SEARCH =================

document.getElementById("search").addEventListener("input", (e) => {
  const value = e.target.value.toLowerCase();

  Array.from(usersList.children).forEach(li => {
    li.style.display = li.innerText.toLowerCase().includes(value)
      ? "block"
      : "none";
  });
});

// ================= NOTIFICATIONS =================

function showNotification(user, text) {
  const note = document.createElement("div");
  note.className = "notification";
  note.innerText = user + ": " + text;

  document.body.appendChild(note);

  setTimeout(() => {
    note.remove();
  }, 3000);
}