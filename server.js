import 'dotenv/config';
import express from "express";
import mongoose from "mongoose";
import session from "express-session";
import MongoStore from "connect-mongo";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.js";
import notesRoutes from "./routes/notes.js";
import notificationRoutes from "./routes/notifications.js";
import expressLayouts from "express-ejs-layouts";
import { startReminderScheduler } from "./services/notificationService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(expressLayouts);
app.set("view engine", "ejs");
app.set("layout", "layout");

// ✅ Connect MongoDB
(async () => {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/notesApp");
    console.log("✅ MongoDB connected");
    
    // Start push notification reminder scheduler
    startReminderScheduler();
  } catch (err) {
    console.error("❌ DB Connection Error:", err);
  }
})();

// ✅ Middlewares
app.use(express.json());  
app.use(express.urlencoded({ extended: true }));  
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

// ✅ Session
app.use(session({
  secret: process.env.SESSION_SECRET || "mysecretkey",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/notesApp",
    collectionName: "sessions"
  }),
  cookie: {
    maxAge: 1000 * 60 * 60,
    httpOnly: true,
    secure: false
  }
}));

app.use("/", authRoutes);
app.use("/", notesRoutes);
app.use("/", notificationRoutes);

// ✅ Routes
app.get("/", (req, res) => {
  res.render("index", { user: req.session.user || null });
});

// Start server on all network interfaces
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});