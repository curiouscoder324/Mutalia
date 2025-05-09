const express = require("express")
const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const nodemailer = require("nodemailer")
const crypto = require("crypto")
const cors = require("cors")
const cookieParser = require("cookie-parser")
require("dotenv").config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(express.json())
app.use(cookieParser())
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
)

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err))

// User Schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

const User = mongoose.model("User", userSchema)

// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
})

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const token = req.cookies.token

  if (!token) {
    return res.status(401).json({ message: "Authentication required" })
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" })
    }

    req.user = user
    next()
  })
}

// Routes
// Sign up
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" })
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    })

    if (existingUser) {
      return res.status(409).json({
        message: existingUser.email === email ? "Email already in use" : "Username already taken",
      })
    }

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Create new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
    })

    await newUser.save()

    res.status(201).json({ message: "User registered successfully" })
  } catch (error) {
    console.error("Signup error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" })
    }

    // Find user
    const user = await User.findOne({ email })

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    // Create JWT
    const token = jwt.sign({ id: user._id, username: user.username, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    })

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    })

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Logout
app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("token")
  res.status(200).json({ message: "Logged out successfully" })
})

// Get current user
app.get("/api/auth/user", authenticateToken, (req, res) => {
  res.status(200).json({
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
    },
  })
})

// Forgot password
app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body

    const user = await User.findOne({ email })

    // Don't reveal if user exists or not for security
    if (!user) {
      return res.status(200).json({
        message: "If an account with that email exists, we have sent password reset instructions.",
      })
    }

    // Generate token
    const token = crypto.randomBytes(20).toString("hex")

    // Set token and expiry
    user.resetPasswordToken = token
    user.resetPasswordExpires = Date.now() + 3600000 // 1 hour

    await user.save()

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password/${token}`

    // Send email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Mutalia - Password Reset",
      html: `
        <h1>Reset Your Password</h1>
        <p>You are receiving this email because you (or someone else) requested a password reset for your Mutalia account.</p>
        <p>Please click the link below or paste it into your browser to reset your password:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
        <p>This link will expire in 1 hour.</p>
      `,
    }

    await transporter.sendMail(mailOptions)

    res.status(200).json({
      message: "If an account with that email exists, we have sent password reset instructions.",
    })
  } catch (error) {
    console.error("Forgot password error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Verify reset token
app.get("/api/auth/verify-token", async (req, res) => {
  try {
    const { token } = req.query

    if (!token) {
      return res.status(400).json({ message: "Token is required" })
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    })

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" })
    }

    res.status(200).json({ message: "Token is valid" })
  } catch (error) {
    console.error("Verify token error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Reset password
app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body

    if (!token || !password) {
      return res.status(400).json({ message: "All fields are required" })
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    })

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" })
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Update user
    user.password = hashedPassword
    user.resetPasswordToken = undefined
    user.resetPasswordExpires = undefined

    await user.save()

    res.status(200).json({ message: "Password has been reset successfully" })
  } catch (error) {
    console.error("Reset password error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
