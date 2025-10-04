import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { sendOTPEmail, sendPasswordChangedEmail } from "../services/emailService.js";

const router = express.Router();

// Generate random OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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
    req.session.successMessage = "Signed up successfully!, Please login.";
    res.redirect("/login");
  } catch (err) {
    console.error(err);
    req.session.errorMessage = "Signup failed. Try again.";
    res.redirect("/signup");
  }
});

// Login (GET form)
router.get("/login", (req, res) => {
  res.render("login", {
    successMessage: req.session.successMessage || null,
    errorMessage: req.session.errorMessage || null
  });

  // clear messages after showing them
  req.session.successMessage = null;
  req.session.errorMessage = null;
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
        req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.send("Session error: " + err.message);
      }
      console.log("Session saved successfully");
      res.redirect("/");
    });
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

// Forgot Password - Step 1: Request OTP
router.get("/forgot-password", (req, res) => {
  res.render("forgotPassword", { 
    errorMessage: req.session.errorMessage || null,
    successMessage: req.session.successMessage || null
  });
  
  // Clear messages after showing them
  req.session.errorMessage = null;
  req.session.successMessage = null;
});

// Forgot Password - Step 2: Send OTP
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      req.session.errorMessage = "No account found with this email address.";
      return res.redirect("/forgot-password");
    }
    
    // Generate OTP and set expiration (10 minutes)
    const otp = generateOTP();
    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpires = Date.now() + 10 * 60 * 1000;
    
    await user.save();
    
    // Send OTP email
    const emailSent = await sendOTPEmail(email, otp);
    
    if (!emailSent) {
      req.session.errorMessage = "Failed to send OTP email. Please try again.";
      return res.redirect("/forgot-password");
    }
    
    // Store email in session for verification
    req.session.resetEmail = email;
    req.session.successMessage = "OTP sent to your email address!";
    res.redirect("/verify-otp");
    
  } catch (error) {
    req.session.errorMessage = "An error occurred. Please try again.";
    console.log("Error occurred, redirecting back to /forgot-password");
    res.redirect("/forgot-password");
  }
});

// Verify OTP - Step 3: Enter OTP
router.get("/verify-otp", (req, res) => {
  if (!req.session.resetEmail) {
    return res.redirect("/forgot-password");
  }
  
  res.render("verifyOTP", { 
    errorMessage: req.session.errorMessage || null,
    email: req.session.resetEmail 
  });
  
  req.session.errorMessage = null;
});

// Verify OTP - Step 4: Validate OTP
router.post("/verify-otp", async (req, res) => {
  try {
    const { otp } = req.body;
    const email = req.session.resetEmail;
    
    if (!email) {
      return res.redirect("/forgot-password");
    }
    
    // Find user and validate OTP
    const user = await User.findOne({ 
      email,
      resetPasswordOTP: otp,
      resetPasswordOTPExpires: { $gt: Date.now() } // Check if OTP not expired
    });
    
    if (!user) {
      req.session.errorMessage = "Invalid or expired OTP. Please try again.";
      return res.redirect("/verify-otp");
    }
    
    // OTP is valid, proceed to reset password
    req.session.otpVerified = true;
    res.redirect("/reset-password");
    
  } catch (error) {
    req.session.errorMessage = "An error occurred. Please try again.";
    res.redirect("/verify-otp");
  }
});

// Reset Password - Step 5: Enter new password
router.get("/reset-password", (req, res) => {
  if (!req.session.otpVerified || !req.session.resetEmail) {
    return res.redirect("/forgot-password");
  }
  
  res.render("resetPassword", { 
    errorMessage: req.session.errorMessage || null 
  });
  
  req.session.errorMessage = null;
});

// Reset Password - Step 6: Update password
router.post("/reset-password", async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;
    const email = req.session.resetEmail;
    
    if (!req.session.otpVerified || !email) {
      return res.redirect("/forgot-password");
    }
    
    // Validate passwords match
    if (password !== confirmPassword) {
      req.session.errorMessage = "Passwords do not match.";
      return res.redirect("/reset-password");
    }
    
    // Find user and update password
    const user = await User.findOne({ email });
    if (!user) {
      req.session.errorMessage = "User not found.";
      return res.redirect("/forgot-password");
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    
    // Clear OTP fields
    user.resetPasswordOTP = null;
    user.resetPasswordOTPExpires = null;
    
    await user.save();
    
    // Send confirmation email
    await sendPasswordChangedEmail(email);
    
    // Clear session
    req.session.resetEmail = null;
    req.session.otpVerified = null;
    
    req.session.successMessage = "Password reset successfully! You can now login with your new password.";
    res.redirect("/login");
    
  } catch (error) {
    req.session.errorMessage = "An error occurred. Please try again.";
    res.redirect("/reset-password");
  }
})

// Add this temporary test route
router.get("/test-email/:email", async (req, res) => {
  try {
    const { sendOTPEmail } = await import('../services/emailService.js');
    const email = req.params.email;
    const success = await sendOTPEmail(email, "123456");
    res.send(`Email test to ${email}: ${success ? "SUCCESS" : "FAILED"}`);
  } catch (error) {
    res.send(`Email error: ${error.message}`);
  }
});

export default router;
