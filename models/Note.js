import mongoose from "mongoose";

const noteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  description: String,
  category: { type: String, default: "General" },
  dueDate: { type: Date, default: null }, 
  priority: { 
    type: String, 
    enum: ['High', 'Medium', 'Low'], // Enforce specific values
    default: 'Low' 
  },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Note", noteSchema);
