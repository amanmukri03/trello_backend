const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const authRoutes = require("./routes/authRoutes");
const boardRoutes = require("./routes/boardRoutes");
const columnRoutes = require("./routes/columnRoutes");
const taskRoutes = require("./routes/taskRoutes");
const { initSocket } = require("./socket/socket");

dotenv.config();

const connectDB = require("./config/db");
connectDB();

const app = express();
const server = http.createServer(app);

// Add Socket
initSocket(server);

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173', 
    'https://amanmukri03.github.io'
  ],
  credentials: true
}));
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/boards", boardRoutes);
app.use("/api/columns", columnRoutes);
app.use("/api/tasks", taskRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("Project Management API Running");
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
