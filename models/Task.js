const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    boardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      required: true,
    },
    columnId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Column",
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // ✅ NEW: Priority field
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },
    // ✅ NEW: Due date field
    dueDate: {
      type: Date,
      default: null,
    },
    // ✅ UPDATED: Timer with multiple sessions tracking
    timer: {
      isRunning: {
        type: Boolean,
        default: false,
      },
      startedAt: {
        type: Date,
        default: null,
      },
      totalSeconds: {
        type: Number,
        default: 0,
      },
      // ✅ NEW: Track multiple work sessions
      sessions: [
        {
          startTime: {
            type: Date,
            required: true,
          },
          endTime: {
            type: Date,
            default: null,
          },
          durationSeconds: {
            type: Number,
            default: 0,
          },
        },
      ],
    },
    // Task completion status
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt automatically
  }
);

// ✅ Index for faster queries
TaskSchema.index({ boardId: 1, columnId: 1 });
TaskSchema.index({ assignedTo: 1 });
TaskSchema.index({ createdBy: 1 });

module.exports = mongoose.model("Task", TaskSchema);