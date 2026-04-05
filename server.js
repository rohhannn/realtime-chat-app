const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// ================= MIDDLEWARE =================

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

// ✅ SESSION FIX (important for deployment)
app.use(session({
  secret: "secret123",
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Render safe
}));

// ================= TEMP DATABASE =================

let users = [];
let onlineUsers = [];

// ================= ROUTES =================

// Home
app.get("/", (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  res.sendFile(path.join(__dirname, "public", "chat.html"));
});

// Login page
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "login.html"));
});

// Signup page
app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "signup.html"));
});

// SIGNUP
app.post("/signup", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.send("All fields required");
  }

  const existing = users.find(u => u.username === username);
  if (existing) return res.send("User already exists");

  const hashed = await bcrypt.hash(password, 10);

  users.push({
    username,
    password: hashed
  });

  console.log("Users:", users);

  res.redirect("/login");
});

// LOGIN
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = users.find(u => u.username === username);

  if (!user) return res.send("User not found");

  const match = await bcrypt.compare(password, user.password);

  if (!match) return res.send("Wrong password");

  req.session.user = username;

  res.redirect("/");
});

// LOGOUT
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

// ================= SOCKET =================

io.on("connection", (socket) => {
  console.log("User connected");

  socket.on("join", (username) => {
    socket.username = username;

    // Prevent duplicate users
    if (!onlineUsers.includes(username)) {
      onlineUsers.push(username);
    }

    io.emit("onlineUsers", onlineUsers);

    io.emit("message", {
      user: "System",
      text: `${username} joined the chat`,
      time: new Date().toLocaleTimeString()
    });
  });

  socket.on("typing", () => {
    socket.broadcast.emit("typing", `${socket.username} is typing...`);
  });

  socket.on("message", (msg) => {
    if (!msg || !socket.username) return;

    const data = {
      user: socket.username,
      text: msg,
      time: new Date().toLocaleTimeString()
    };

    io.emit("message", data);
  });

  socket.on("disconnect", () => {
    onlineUsers = onlineUsers.filter(u => u !== socket.username);

    io.emit("onlineUsers", onlineUsers);

    if (socket.username) {
      io.emit("message", {
        user: "System",
        text: `${socket.username} left the chat`,
        time: new Date().toLocaleTimeString()
      });
    }
  });
});

// ================= SERVER =================

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});