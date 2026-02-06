const express = require("express");
const { createColumn, getColumns } = require("../controllers/columnController");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

// Admin and Manager can create the column
router.post("/", protect, authorizeRoles("Admin", "Manager"), createColumn);

// All Roles can get columns
router.get("/:boardId", protect, getColumns);

module.exports = router;
