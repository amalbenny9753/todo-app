import express from "express";
import User from "../models/User.js";

const router = express.Router();

// Middleware: check if logged in
function isAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

// Get VAPID public key
router.get("/vapid-public-key", (req, res) => {
  if (!process.env.VAPID_PUBLIC_KEY) {
    return res.status(500).json({ 
      error: 'VAPID public key not configured' 
    });
  }
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// Subscribe to push notifications
router.post("/subscribe", isAuth, async (req, res) => {
  try {
    const subscription = req.body;
    
    await User.updateOne(
      { _id: req.session.user.id },
      { pushSubscription: subscription }
    );
    
    res.json({ success: true, message: 'Subscribed to notifications!' });
  } catch (error) {
    console.error('Error subscribing:', error);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

// Unsubscribe from push notifications
router.post("/unsubscribe", isAuth, async (req, res) => {
  try {
    await User.updateOne(
      { _id: req.session.user.id },
      { pushSubscription: null }
    );
    
    res.json({ success: true, message: 'Unsubscribed from notifications' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

export default router;