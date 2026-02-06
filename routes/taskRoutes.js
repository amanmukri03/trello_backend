const express = require("express");

const {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  startTimer,
  stopTimer,
  getTimerStatus, // ✅ NEW
} = require("../controllers/taskController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Create Task (Admin/Manager only)
router.post("/", protect, createTask);

// Get Tasks by Board
router.get("/:boardId", protect, getTasks);

// Update Task
router.put("/:id", protect, updateTask);

// Delete Task (Admin/Manager only)
router.delete("/:id", protect, deleteTask);

// Start Timer
router.post("/:id/start-timer", protect, startTimer);

// Stop Timer
router.post("/:id/stop-timer", protect, stopTimer);

// ✅ NEW: Get Timer Status (for live updates)
router.get("/:id/timer", protect, getTimerStatus);

module.exports = router;