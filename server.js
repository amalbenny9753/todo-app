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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(expressLayouts);
app.set("view engine", "ejs");
app.set("layout", "layout");

// Connect MongoDB
(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");
    
    // Start push notification reminder scheduler with error handling
    try {
      const { startReminderScheduler } = await import('./services/notificationService.js');
      startReminderScheduler();
    } catch (error) {
      console.log('Notification scheduler not started (OK for now)');
    }

  } catch (err) {
    console.error("DB Connection Error:", err);
    process.exit(1);
  }
})();

// Middlewares
app.use(express.json());  
app.use(express.urlencoded({ extended: true }));  
app.use(express.static(path.join(__dirname, "public")));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: "sessions"
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", 
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax" 
  }
}));

app.use("/", authRoutes);
app.use("/", notesRoutes);
app.use("/", notificationRoutes);

// Routes
app.get("/", (req, res) => {
  res.render("index", { user: req.session.user || null });
});

// Test email route - add this temporarily
app.get("/test-email", async (req, res) => {
  try {
    const { sendOTPEmail } = await import('./services/emailService.js');
    const success = await sendOTPEmail("test@example.com", "123456");
    res.send(`Email test: ${success ? "Success" : "Failed"}`);
  } catch (error) {
    res.send(`Email error: ${error.message}`);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).render('error', { 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', { 
    message: 'Page not found',
    error: {}
  });
});

// Start server on all network interfaces
const PORT = process.env.PORT || 3000;

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});