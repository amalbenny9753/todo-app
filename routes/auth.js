import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

const router = express.Router();

// Signup (GET form)
router.get("/signup", (req, res) => {
  res.render("signup");
});

// Signup (POST data)
router.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashed });
    await user.save();
    req.session.user = { id: user._id, email: user.email };
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.send("Error signing up");
  }
});

// Login (GET form)
router.get("/login", (req, res) => {
  res.render("login");
});

// Login (POST data)
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.send("No user found");

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.send("Wrong password");

    req.session.user = { id: user._id, email: user.email };
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.send("Error logging in");
  }
});

// Logout
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

export default router;
