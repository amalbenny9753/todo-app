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

// Show all notes
// router.get("/notes", isAuth, async (req, res) => {
//   const notes = await Note.find({ userId: req.session.user.id }).sort({ createdAt: -1 });
//   res.render("notes", { user: req.session.user, notes });
// });

// Show all notes (Handles Search, Filter, and Sort)
router.get("/notes", isAuth, async (req, res) => {
  const { search, category, sort } = req.query; // Get parameters
  const userId = req.session.user.id;
  
  // 1. Build the Query Filter
  const filter = { userId: userId };
  
  // Search Notes (Title/Description)
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } }, // Case-insensitive title search
      { description: { $regex: search, $options: 'i' } } // Case-insensitive description search
    ];
  }
  // Categorize Notes (Filter by category)
  if (category && category !== 'All') {
    filter.category = category;
  }
  
  // 2. Build the Sort Options
  let sortOptions = { createdAt: -1 }; // Default: Newest first
  
  // Sort by Due Date or Priority
  if (sort === 'date') {
    sortOptions = { dueDate: 1, createdAt: -1 }; // Sort by ascending due date (so nearest date is first)
  } else if (sort === 'priority') {
    // Sort by custom priority order (High > Medium > Low)
    sortOptions = { 
        priority: -1, // High is usually first, so -1 if you store 'High' as the highest value
        createdAt: -1
    };
  }

  // 3. Execute Query
  const notes = await Note.find(filter).sort(sortOptions);
  
  // Pass state variables back to the view to maintain filter/sort selections
  res.render("notes", { 
      user: req.session.user, 
      notes, 
      currentSearch: search || '', 
      currentCategory: category || 'All',
      currentSort: sort || 'newest'
  });
});

// Add note form
router.get("/notes/new", isAuth, (req, res) => {
  res.render("newNote");
});

// Save new note
router.post("/notes", isAuth, async (req, res) => {
    const { title, description, category, dueDate, priority } = req.body; // Destructure new fields
  await Note.create({
    userId: req.session.user.id,
    title: req.body.title,
    description: req.body.description,
        category,
    dueDate: dueDate || null, // Ensure empty date string saves as null
    priority
  });
  res.redirect("/notes");
});

// Edit form
router.get("/notes/edit/:id", isAuth, async (req, res) => {
  const note = await Note.findOne({ _id: req.params.id, userId: req.session.user.id });
  if (!note) return res.send("Note not found");
  res.render("editNote", { note });
});

// Update note
router.post("/notes/edit/:id", isAuth, async (req, res) => {
  const { title, description, category, dueDate, priority } = req.body; // Destructure new fields
    await Note.updateOne(
    { _id: req.params.id, userId: req.session.user.id },
    { title: req.body.title, description: req.body.description, category, dueDate: dueDate || null, priority }
  );
  res.redirect("/notes");
});

// Delete note
router.post("/notes/delete/:id", isAuth, async (req, res) => {
  await Note.deleteOne({ _id: req.params.id, userId: req.session.user.id });
  res.redirect("/notes");
});

export default router;
