const Task = require('../models/Task');
const User = require('../models/User');
const Board = require('../models/Board');
const { getIO } = require("../socket/socket");

// Create Task
// POST: /api/tasks
exports.createTask = async (req, res) => {
    const { title, description, boardId, columnId, assignedTo, priority, dueDate } = req.body;

    if (!title || !boardId || !columnId) {
        return res.status(400).json({ message: "Missing required fields!" });
    }

    try {
        const userId = req.user.id;
        const userRole = req.user.role;

        // ✅ Only Admin and Manager can create tasks
        if (userRole !== 'Admin' && userRole !== 'Manager') {
            return res.status(403).json({ 
                message: "Only Admin and Manager can create tasks" 
            });
        }

        let assignedToUser = null;

        // Find user by email or name
        if (assignedTo && assignedTo.trim()) {
            assignedToUser = await User.findOne({
                $or: [
                    { email: assignedTo.trim() },
                    { name: assignedTo.trim() }
                ]
            });

            if (!assignedToUser) {
                console.log(`User not found for: ${assignedTo}`);
            }
        }

        // Add assigned user to board members if not already
        if (assignedToUser) {
            const board = await Board.findById(boardId);
            
            if (board && !board.members.includes(assignedToUser._id)) {
                board.members.push(assignedToUser._id);
                await board.save();
                console.log(`Added ${assignedToUser.name} to board members`);
            }
        }

        // Create task with all fields
        const task = await Task.create({
            title,
            description: description || "",
            boardId,
            columnId,
            assignedTo: assignedToUser ? assignedToUser._id : null,
            createdBy: userId, // Who created/assigned the task
            priority: priority || "Medium",
            dueDate: dueDate || null,
        });

        // ✅ Populate all necessary fields before sending
        const populatedTask = await task.populate([
            { path: "assignedTo", select: "name email" },
            { path: "createdBy", select: "name email role" } // ✅ assignedBy
        ]);

        // Socket EMIT
        const io = getIO();
        io.to(boardId.toString()).emit("taskCreated", populatedTask);

        res.status(201).json(populatedTask);
    } catch (error) {
        console.error("Create Task Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// Get Tasks by Board
// GET: /api/tasks/:boardId
exports.getTasks = async (req, res) => {
    try {
        const boardId = req.params.boardId;
        const userId = req.user.id;
        const userRole = req.user.role;

        // Check if board exists
        const board = await Board.findById(boardId);
        
        if (!board) {
            return res.status(404).json({ message: "Board not found" });
        }

        let tasks;

        // ✅ Role-based filtering
        if (userRole === 'Admin' || userRole === 'Manager') {
            // Admin aur Manager ko SAARE tasks
            tasks = await Task.find({ boardId })
                .populate("assignedTo", "name email")
                .populate("createdBy", "name email role") // ✅ assignedBy
                .sort("createdAt");
        } else {
            // Member ko SIRF apne assigned tasks
            tasks = await Task.find({ 
                boardId,
                assignedTo: userId
            })
                .populate("assignedTo", "name email")
                .populate("createdBy", "name email role") // ✅ assignedBy
                .sort("createdAt");
        }

        res.json(tasks);
    } catch (error) {
        console.error("Get Tasks Error:", error);
        res.status(500).json({ message: error.message });
    }
}

// Update the task
// PUT: /api/tasks/:id
exports.updateTask = async (req, res) => {
    try {
        const taskId = req.params.id;
        const userId = req.user.id;
        const userRole = req.user.role;
        const updates = req.body;

        const task = await Task.findById(taskId);
        
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        // ✅ Permission check
        const isAdminOrManager = userRole === 'Admin' || userRole === 'Manager';
        const isAssignedMember = task.assignedTo && task.assignedTo.toString() === userId.toString();

        if (!isAdminOrManager && !isAssignedMember) {
            return res.status(403).json({ 
                message: "You don't have permission to update this task" 
            });
        }

        // ✅ RESTRICTION: Member can only update columnId (move task between columns)
        // Admin/Manager can update everything
        if (!isAdminOrManager) {
            // Member ke liye sirf columnId allow hai
            const allowedFields = ['columnId', 'isCompleted', 'completedAt'];
            const requestedFields = Object.keys(updates);
            
            const hasUnallowedFields = requestedFields.some(
                field => !allowedFields.includes(field)
            );

            if (hasUnallowedFields) {
                return res.status(403).json({ 
                    message: "Members can only move tasks between columns. Contact Admin/Manager for other changes." 
                });
            }
        }

        // ✅ FIX: If assignedTo is being updated, convert email/name to ObjectId
        if (updates.assignedTo && isAdminOrManager) {
            // Check if assignedTo is already an ObjectId or email/name
            const mongoose = require('mongoose');
            
            // If it's not a valid ObjectId, find user by email or name
            if (!mongoose.Types.ObjectId.isValid(updates.assignedTo)) {
                const assignedUser = await User.findOne({
                    $or: [
                        { email: updates.assignedTo.trim() },
                        { name: updates.assignedTo.trim() }
                    ]
                });

                if (assignedUser) {
                    updates.assignedTo = assignedUser._id;
                    
                    // Add to board members if not already
                    const board = await Board.findById(task.boardId);
                    if (board && !board.members.includes(assignedUser._id)) {
                        board.members.push(assignedUser._id);
                        await board.save();
                    }
                } else {
                    return res.status(404).json({ 
                        message: `User not found: ${updates.assignedTo}` 
                    });
                }
            } else {
                // It's already an ObjectId, just add to board members
                const board = await Board.findById(task.boardId);
                if (board && !board.members.includes(updates.assignedTo)) {
                    board.members.push(updates.assignedTo);
                    await board.save();
                }
            }
        }

        // Update task
        Object.keys(updates).forEach(key => {
            task[key] = updates[key];
        });

        await task.save();

        // Populate before sending
        const populatedTask = await task.populate([
            { path: "assignedTo", select: "name email" },
            { path: "createdBy", select: "name email role" }
        ]);

        const io = getIO();
        io.to(task.boardId.toString()).emit("taskUpdated", populatedTask);

        res.json(populatedTask);
    } catch (error) {
        console.error("Update Task Error:", error);
        res.status(500).json({ message: error.message });
    }
}

// Delete Task
// DELETE: /api/tasks/:id
exports.deleteTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        const userRole = req.user.role;

        // ✅ Only Admin and Manager can delete
        if (userRole !== 'Admin' && userRole !== 'Manager') {
            return res.status(403).json({ 
                message: "Only Admin and Manager can delete tasks" 
            });
        }

        const boardId = task.boardId;
        const taskId = task._id;

        await Task.findByIdAndDelete(req.params.id);

        const io = getIO();
        io.to(boardId.toString()).emit("taskDeleted", taskId);

        res.json({ message: "Task Deleted Successfully" });
    } catch (error) {
        console.error("Delete Task Error:", error);
        res.status(500).json({ message: error.message });
    }
}

// ✅ ENHANCED: Start Timer with Session Tracking
// POST: /api/tasks/:id/start-timer
exports.startTimer = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        const userId = req.user.id;
        const userRole = req.user.role;

        // Only assigned user can start timer
        if (userRole !== 'Admin' && userRole !== 'Manager') {
            if (!task.assignedTo || task.assignedTo.toString() !== userId.toString()) {
                return res.status(403).json({ 
                    message: "You can only start timer for your assigned tasks" 
                });
            }
        }

        // If timer is not already running
        if (!task.timer.isRunning) {
            const now = new Date();
            
            task.timer.isRunning = true;
            task.timer.startedAt = now;
            
            // ✅ Create new session
            task.timer.sessions.push({
                startTime: now,
                endTime: null,
                durationSeconds: 0
            });
            
            await task.save();
        }

        res.json(task);
    } catch (error) {
        console.error("Start Timer Error:", error);
        res.status(500).json({ message: error.message });
    }
}

// ✅ ENHANCED: Stop Timer and Save Session
// POST: /api/tasks/:id/stop-timer
exports.stopTimer = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        const userId = req.user.id;
        const userRole = req.user.role;

        // Only assigned user can stop timer
        if (userRole !== 'Admin' && userRole !== 'Manager') {
            if (!task.assignedTo || task.assignedTo.toString() !== userId.toString()) {
                return res.status(403).json({ 
                    message: "You can only stop timer for your assigned tasks" 
                });
            }
        }

        if (task.timer.isRunning) {
            const now = new Date();
            const sessionDuration = Math.floor((now - task.timer.startedAt) / 1000);
            
            // ✅ Update current session
            const currentSession = task.timer.sessions[task.timer.sessions.length - 1];
            currentSession.endTime = now;
            currentSession.durationSeconds = sessionDuration;
            
            // Update total time
            task.timer.totalSeconds += sessionDuration;
            task.timer.isRunning = false;
            task.timer.startedAt = null;
            
            await task.save();
        }

        res.json(task);
    } catch (error) {
        console.error("Stop Timer Error:", error);
        res.status(500).json({ message: error.message });
    }
}

// ✅ NEW: Get Timer Status (for live updates)
// GET: /api/tasks/:id/timer
exports.getTimerStatus = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id).select('timer');

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        let currentDuration = task.timer.totalSeconds;

        // If timer is running, add current session time
        if (task.timer.isRunning && task.timer.startedAt) {
            const currentSessionTime = Math.floor((Date.now() - task.timer.startedAt.getTime()) / 1000);
            currentDuration += currentSessionTime;
        }

        res.json({
            isRunning: task.timer.isRunning,
            totalSeconds: currentDuration,
            sessions: task.timer.sessions,
            startedAt: task.timer.startedAt
        });
    } catch (error) {
        console.error("Get Timer Error:", error);
        res.status(500).json({ message: error.message });
    }
}