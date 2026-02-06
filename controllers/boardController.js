const Board = require("../models/Board");
const Task = require("../models/Task"); // ✅ Import Task model

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

// Get My Board
// ✅ UPDATED: Ab ye boards bhi dikhayega jahan user ko tasks assigned hain
exports.getBoards = async (req, res) => {
    try {
        // Step 1: Find boards where user is a member
        const memberBoards = await Board.find({
            members: req.user.id,
        }).populate("createdBy", "name email");

        // Step 2: Find all tasks assigned to this user
        const assignedTasks = await Task.find({
            assignedTo: req.user.id
        }).select('boardId');

        // Step 3: Get unique board IDs from assigned tasks
        const assignedBoardIds = [...new Set(assignedTasks.map(task => task.boardId.toString()))];

        // Step 4: Find boards where user has assigned tasks but is not a member
        const assignedBoards = await Board.find({
            _id: { $in: assignedBoardIds },
            members: { $ne: req.user.id } // Only boards where user is NOT already a member
        }).populate("createdBy", "name email");

        // Step 5: Combine both arrays and remove duplicates
        const allBoards = [...memberBoards, ...assignedBoards];
        
        // Remove duplicates based on board _id
        const uniqueBoards = allBoards.filter((board, index, self) =>
            index === self.findIndex((b) => b._id.toString() === board._id.toString())
        );

        res.json(uniqueBoards);
    } catch (error) {
        res.status(500).json({message: error.message})
    }
}