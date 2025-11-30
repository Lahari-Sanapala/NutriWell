const express = require("express");
const router = express.Router();
const User = require("../models/User");
const UserDetails = require("../models/UserDetails");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const jwt = require('jsonwebtoken');
const mongoose = require("mongoose");
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;


const baseURL = process.env.BASE_URL;

// Sign up
router.post("/signup", async (req, res) => {
  console.log("🔹 [DEBUG] Signup request received:", req.body);
  const { fullName, email, password } = req.body;

  try {
    console.log("🔹 [DEBUG] Checking if user exists...");
    const existing = await User.findOne({ email });
    if (existing) {
      console.log("❌ [DEBUG] Email already registered:", email);
      return res.status(400).json({ message: "Email already registered" });
    }

    console.log("🔹 [DEBUG] Hashing password...");
    const hashed = await bcrypt.hash(password, 10);

    console.log("🔹 [DEBUG] Creating new User document...");
    const newUser = new User({ fullName, email, password: hashed });

    console.log("🔹 [DEBUG] Saving User to DB...");
    await newUser.save();
    console.log("✅ [DEBUG] User saved successfully. ID:", newUser._id);

    console.log("🔹 [DEBUG] Creating UserDetails document...");
    const newDetails = new UserDetails({
      _id: newUser._id,   // 💡 Assign same _id
      userId: newUser._id, // Optional, but if you’re using it in code
      // You can also initialize default fields here
    });

    console.log("🔹 [DEBUG] Saving UserDetails to DB...");
    await newDetails.save();
    console.log("✅ [DEBUG] UserDetails saved successfully.");

    res.status(201).json({ message: "Signup successful", user: newUser });
  } catch (err) {
    console.error("❌ [DEBUG] Signup Error:", err);
    res.status(500).json({ message: "Signup failed", error: err.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const userdetails = await UserDetails.findOne({ userId: user._id });
    //console.log("all user details", userdetails);

    if (!userdetails) {
      return res.status(404).json({ message: "User details not found" });
    }

    return res.json({
      user: {
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        details: userdetails,
      },
      token: "Asiya786",
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error", error });
  }
});


// Get user basic info (name, email) by userId
router.get('/:userId/basic-info', async (req, res) => {
  try {
    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    // Find the user in both collections
    const user = await User.findOne({ _id: req.params.userId });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return only the essential info
    res.json({
      fullName: user.fullName,
      email: user.email,
      userId: user._id
    });

  } catch (error) {
    console.error('Error fetching user info:', error);
    res.status(500).json({ error: 'Server error' });
  }
});
// Forgot password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Email not found' });

    const resetToken = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: 'asiyashaik7867@gmail.com',
      to: email,
      subject: 'Password Reset',
      text: `You requested a password reset. Click here to reset: http://${baseURL}/reset-password/${resetToken}`,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Password reset email sent' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset password
router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(400).json({ message: 'Invalid token or user not found' });
  }
});

module.exports = router; // Make sure this is at the end