const express = require("express");
const {
  createColumn,
  getColumns,
  updateColumn,
  deleteColumn,
} = require("../controllers/columnController");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

// Admin and Manager can create the column
router.post("/", protect, authorizeRoles("Admin", "Manager"), createColumn);

// All Roles can get columns
router.get("/:boardId", protect, getColumns);

// Update Column (Admin & Manager only)
router.put("/:id", protect, authorizeRoles("Admin", "Manager"), updateColumn);

// Delete Column (Admin & Manager only)
router.delete("/:id", protect, authorizeRoles("Admin", "Manager"), deleteColumn);

module.exports = router;