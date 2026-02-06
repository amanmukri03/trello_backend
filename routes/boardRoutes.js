const express = require("express");

const {
  createBoard,
  getBoards,
  updateBoard,
  deleteBoard,
} = require("../controllers/boardController");
const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

// Admin & Manager only
router.post("/", protect, authorizeRoles("Admin", "Manager"), createBoard);

// All logged in users
router.get("/", protect, getBoards);

// Update Board (Admin & Manager only)
router.put("/:id", protect, authorizeRoles("Admin", "Manager"), updateBoard);

// Delete Board (Admin & Manager only)
router.delete("/:id", protect, authorizeRoles("Admin", "Manager"), deleteBoard);

module.exports = router;