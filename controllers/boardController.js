const Board = require("../models/Board");
const Column = require("../models/Column");
const Task = require("../models/Task");

// Create Board
exports.createBoard = async (req, res) => {
  try {
    const board = await Board.create({
      name: req.body.name,
      description: req.body.description,
      createdBy: req.user.id,
      members: [req.user.id],
    });
    console.log("USER: ", req.user);
    res.status(201).json(board);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get My Boards
exports.getBoards = async (req, res) => {
  try {
    // Step 1: Find boards where user is a member
    const memberBoards = await Board.find({
      members: req.user.id,
    }).populate("createdBy", "name email");

    // Step 2: Find all tasks assigned to this user
    const assignedTasks = await Task.find({
      assignedTo: req.user.id,
    }).select("boardId");

    // Step 3: Get unique board IDs from assigned tasks
    const assignedBoardIds = [
      ...new Set(assignedTasks.map((task) => task.boardId.toString())),
    ];

    // Step 4: Find boards where user has assigned tasks but is not a member
    const assignedBoards = await Board.find({
      _id: { $in: assignedBoardIds },
      members: { $ne: req.user.id },
    }).populate("createdBy", "name email");

    // Step 5: Combine both arrays and remove duplicates
    const allBoards = [...memberBoards, ...assignedBoards];

    const uniqueBoards = allBoards.filter(
      (board, index, self) =>
        index === self.findIndex((b) => b._id.toString() === board._id.toString())
    );

    res.json(uniqueBoards);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Update Board
exports.updateBoard = async (req, res) => {
  try {
    const { name, description } = req.body;

    const board = await Board.findById(req.params.id);

    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // Check if user is the creator
    if (board.createdBy.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this board" });
    }

    board.name = name || board.name;
    board.description = description || board.description;

    await board.save();

    res.json(board);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Delete Board
exports.deleteBoard = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);

    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // Check if user is the creator
    if (board.createdBy.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this board" });
    }

    // Delete all columns and tasks associated with this board
    await Column.deleteMany({ boardId: req.params.id });
    await Task.deleteMany({ boardId: req.params.id });

    await Board.findByIdAndDelete(req.params.id);

    res.json({ message: "Board deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};