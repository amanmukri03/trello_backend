const Column = require("../models/Column");
const { getIO } = require("../socket/socket"); // ✅ Import socket

// Create Column
// POST: /api/columns
exports.createColumn = async (req, res) => {
  try {
    const { name, boardId } = req.body;

    if (!name || !boardId) {
      return res.status(400).json({ message: "Name and boardId are required" });
    }

    const column = await Column.create({
      name,
      boardId,
      createdBy: req.user.id,
    });

    // ✅ Emit socket event for real-time update
    const io = getIO();
    io.to(boardId.toString()).emit("columnCreated", column);

    res.status(201).json(column);
  } catch (error) {
    console.error("Create Column Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get Columns by Board
// GET: /api/columns/:boardId
exports.getColumns = async (req, res) => {
  try {
    const columns = await Column.find({
      boardId: req.params.boardId,
    }).sort("createdAt");

    res.json(columns);
  } catch (error) {
    console.error("Get Columns Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Update Column
// PUT: /api/columns/:id
exports.updateColumn = async (req, res) => {
  try {
    const column = await Column.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!column) {
      return res.status(404).json({ message: "Column not found" });
    }

    // ✅ Emit socket event
    const io = getIO();
    io.to(column.boardId.toString()).emit("columnUpdated", column);

    res.json(column);
  } catch (error) {
    console.error("Update Column Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Delete Column
// DELETE: /api/columns/:id
exports.deleteColumn = async (req, res) => {
  try {
    const column = await Column.findById(req.params.id);

    if (!column) {
      return res.status(404).json({ message: "Column not found" });
    }

    const boardId = column.boardId;
    const columnId = column._id;

    await Column.findByIdAndDelete(req.params.id);

    // ✅ Emit socket event
    const io = getIO();
    io.to(boardId.toString()).emit("columnDeleted", columnId);

    res.json({ message: "Column deleted successfully" });
  } catch (error) {
    console.error("Delete Column Error:", error);
    res.status(500).json({ message: error.message });
  }
};