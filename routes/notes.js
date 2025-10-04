import express from "express";
import Note from "../models/Note.js";

const router = express.Router();

// Middleware: check if logged in
function isAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  next();
}

// Show all notes (Handles Search, Filter, and Sort)
router.get("/notes", isAuth, async (req, res) => {
  const { search, category, sort } = req.query;
  const userId = req.session.user.id;
  
  // 1. Build the Query Filter
  const filter = { userId: userId };
  
  // Search Notes (Title/Description)
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }
  
  // Categorize Notes (Filter by category)
  if (category && category !== 'All') {
    filter.category = category;
  }

  try {
    let notes;

    // Handle priority sorting with aggregation
    if (sort === 'priority') {
      notes = await Note.aggregate([
        { $match: filter },
        { $addFields: {
          priorityOrder: {
            $switch: {
              branches: [
                { case: { $eq: ["$priority", "High"] }, then: 1 },
                { case: { $eq: ["$priority", "Medium"] }, then: 2 },
                { case: { $eq: ["$priority", "Low"] }, then: 3 }
              ],
              default: 4
            }
          }
        }},
        { $sort: { priorityOrder: 1, createdAt: -1 } }
      ]);
    } else {
      // Handle other sorting options
      let sortOptions = { createdAt: -1 };
      
      if (sort === 'date') {
        sortOptions = { dueDate: 1, createdAt: -1 };
      }
      
      notes = await Note.find(filter).sort(sortOptions);
    }

    // Pass state variables back to the view
    res.render("notes", { 
      user: req.session.user, 
      notes, 
      currentSearch: search || '', 
      currentCategory: category || 'All',
      currentSort: sort || 'newest'
    });
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.render("notes", { 
      user: req.session.user, 
      notes: [], 
      currentSearch: search || '', 
      currentCategory: category || 'All',
      currentSort: sort || 'newest',
      error: 'Failed to load notes'
    });
  }
});

// Add note form
router.get("/notes/new", isAuth, (req, res) => {
  res.render("newNote");
});

// Save new note with validation
router.post("/notes", isAuth, async (req, res) => {
  try {
    const { title, description, category, dueDate, priority } = req.body;
    
    // Basic validation
    if (!title || title.trim() === '') {
      return res.render("newNote", { 
        error: "Title is required",
        formData: req.body
      });
    }

    await Note.create({
      userId: req.session.user.id,
      title: title.trim(),
      description: description ? description.trim() : '',
      category: category || 'General',
      dueDate: dueDate || null,
      priority: priority || 'Low'
    });
    
    res.redirect("/notes");
  } catch (error) {
    console.error('Error creating note:', error);
    res.render("newNote", { 
      error: "Failed to create note",
      formData: req.body
    });
  }
});

// Edit form
router.get("/notes/edit/:id", isAuth, async (req, res) => {
  try {
    const note = await Note.findOne({ 
      _id: req.params.id, 
      userId: req.session.user.id 
    });
    
    if (!note) {
      return res.status(404).render("error", { 
        message: "Note not found" 
      });
    }
    
    res.render("editNote", { note });
  } catch (error) {
    console.error('Error fetching note for edit:', error);
    res.status(500).render("error", { 
      message: "Failed to load note" 
    });
  }
});

// Update note with validation
router.post("/notes/edit/:id", isAuth, async (req, res) => {
  try {
    const { title, description, category, dueDate, priority } = req.body;
    
    // Basic validation
    if (!title || title.trim() === '') {
      const note = await Note.findOne({ 
        _id: req.params.id, 
        userId: req.session.user.id 
      });
      return res.render("editNote", { 
        note,
        error: "Title is required"
      });
    }

    const result = await Note.updateOne(
      { _id: req.params.id, userId: req.session.user.id },
      { 
        title: title.trim(), 
        description: description ? description.trim() : '', 
        category: category || 'General', 
        dueDate: dueDate || null, 
        priority: priority || 'Low',
        updatedAt: new Date()
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).render("error", { 
        message: "Note not found" 
      });
    }

    res.redirect("/notes");
  } catch (error) {
    console.error('Error updating note:', error);
    const note = await Note.findOne({ 
      _id: req.params.id, 
      userId: req.session.user.id 
    });
    res.render("editNote", { 
      note,
      error: "Failed to update note"
    });
  }
});

// Delete note with better error handling
router.post("/notes/delete/:id", isAuth, async (req, res) => {
  try {
    const result = await Note.deleteOne({ 
      _id: req.params.id, 
      userId: req.session.user.id 
    });

    if (result.deletedCount === 0) {
      return res.status(404).render("error", { 
        message: "Note not found" 
      });
    }

    res.redirect("/notes");
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).render("error", { 
      message: "Failed to delete note" 
    });
  }
});

export default router;