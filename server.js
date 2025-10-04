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

// ✅ Connect MongoDB
(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connected");
    
       // Start push notification reminder scheduler with error handling
    try {
      const { startReminderScheduler } = await import('./services/notificationService.js');
      startReminderScheduler();
    } catch (error) {
      console.log('⚠️ Notification scheduler not started (OK for now)');
    }
    
  } catch (err) {
    console.error("❌ DB Connection Error:", err);
  }
})();

// ✅ Middlewares
app.use(express.json());  
app.use(express.urlencoded({ extended: true }));  
app.use(express.static(path.join(__dirname, "public")));

// ✅ Session
app.use(session({
  secret: process.env.SESSION_SECRET || "mysecretkey",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: "sessions"
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24,
    httpOnly: true,
    // secure: process.env.NODE_ENV === "production"
    secure: false, // Change this to false temporarily
    sameSite: 'lax' // Change from 'none' to 'lax'
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


// Add before app.listen()
app.get("/test-notification", async (req, res) => {
  if (!req.session.user) {
    return res.send("Please login first");
  }
  
  try {
    const User = (await import('./models/User.js')).default;
    const user = await User.findById(req.session.user.id);
    
    if (!user.pushSubscription) {
      return res.send(`
        <h2>No subscription found</h2>
        <p>Please go to <a href="/notes">Notes page</a> and click "Enable Notifications"</p>
      `);
    }
    
    const { sendNotification } = await import('./services/notificationService.js');
    
    await sendNotification(user.pushSubscription, {
      title: '🔔 Test Notification',
      body: 'If you see this, notifications are working!',
      data: { url: '/notes' }
    });
    
    res.send(`
      <h2>✅ Test notification sent!</h2>
      <p>Check your browser/phone for the notification.</p>
      <p><a href="/notes">Back to Notes</a></p>
    `);
  } catch (error) {
    res.send(`<h2>❌ Error:</h2><pre>${error.message}</pre>`);
  }
});

app.get("/check-files", (req, res) => {
  res.send(`
    <h2>File Check</h2>
    <ul>
      <li><a href="/service-worker.js" target="_blank">Service Worker</a></li>
      <li><a href="/js/notifications.js" target="_blank">Notifications JS</a></li>
    </ul>
    <p>Both links should open JavaScript files. If you get 404, files are missing.</p>
  `);
});

// Add this test route to server.js
app.get("/test-email", async (req, res) => {
  try {
    const { sendOTPEmail } = await import('./services/emailService.js');
    const testEmail = "amalbenny851@gmail.com"; 
    const testOTP = "123456";
    
    const success = await sendOTPEmail(testEmail, testOTP);
    
    if (success) {
      res.send("✅ Test email sent successfully! Check your inbox.");
    } else {
      res.send("❌ Failed to send test email.");
    }
  } catch (error) {
    res.send(`❌ Error: ${error.message}`);
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});