const User = require("../models/user.model")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const crypto = require("crypto")
const emailService = require("../services/email.service")

// Sign up controller
exports.signup = async (req, res) => {
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
}

// Login controller
exports.login = async (req, res) => {
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
}

// Logout controller
exports.logout = (req, res) => {
  res.clearCookie("token")
  res.status(200).json({ message: "Logged out successfully" })
}

// Get current user controller
exports.getCurrentUser = (req, res) => {
  res.status(200).json({
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
    },
  })
}

// Forgot password controller
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body

    // Verify email service configuration
    const isEmailConfigured = await emailService.verifyConfiguration()
    if (!isEmailConfigured) {
      console.error("Email service is not properly configured")
      return res.status(500).json({ message: "Email service is not available at the moment. Please try again later." })
    }

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
    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3001"}/reset-password.html?token=${token}`

    console.log("Reset URL:", resetUrl)

    try {
      // Send email
      const mailOptions = {
        to: user.email,
        subject: "Mutalia - Password Reset",
        text: `
          You are receiving this email because you (or someone else) requested a password reset for your Mutalia account.
          Please click the link below or paste it into your browser to reset your password:
          ${resetUrl}
          If you did not request this, please ignore this email and your password will remain unchanged.
          This link will expire in 1 hour.
        `,
        html: `
          <h1>Reset Your Password</h1>
          <p>You are receiving this email because you (or someone else) requested a password reset for your Mutalia account.</p>
          <p>Please click the link below or paste it into your browser to reset your password:</p>
          <a href="${resetUrl}">${resetUrl}</a>
          <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
          <p>This link will expire in 1 hour.</p>
        `,
      }

      await emailService.sendEmail(mailOptions)
      console.log("Password reset email sent to:", user.email)

      res.status(200).json({
        message: "If an account with that email exists, we have sent password reset instructions.",
      })
    } catch (emailError) {
      console.error("Error sending password reset email:", emailError)
      
      // Don't expose the error to the client for security reasons
      res.status(200).json({
        message: "If an account with that email exists, we have sent password reset instructions.",
      })
    }
  } catch (error) {
    console.error("Forgot password error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Verify reset token controller
exports.verifyToken = async (req, res) => {
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
}

// Reset password controller
exports.resetPassword = async (req, res) => {
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

    try {
      // Send confirmation email
      const mailOptions = {
        to: user.email,
        subject: "Mutalia - Password Reset Successful",
        text: `
          Your password has been successfully reset.
          If you did not make this change, please contact our support team immediately.
        `,
        html: `
          <h1>Password Reset Successful</h1>
          <p>Your password has been successfully reset.</p>
          <p>If you did not make this change, please contact our support team immediately.</p>
        `,
      }

      await emailService.sendEmail(mailOptions)
      console.log("Password reset confirmation email sent to:", user.email)
    } catch (emailError) {
      console.error("Error sending password reset confirmation email:", emailError)
      // Continue with the response even if the email fails
    }

    res.status(200).json({ message: "Password has been reset successfully" })
  } catch (error) {
    console.error("Reset password error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Test email route for debugging
exports.testEmail = async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ message: "Email is required" })
    }

    // Verify email service configuration
    const isEmailConfigured = await emailService.verifyConfiguration()
    if (!isEmailConfigured) {
      return res.status(500).json({ message: "Email service is not properly configured" })
    }

    // Send test email
    const mailOptions = {
      to: email,
      subject: "Mutalia - Test Email",
      text: "This is a test email from Mutalia.",
      html: "<h1>Test Email</h1><p>This is a test email from Mutalia.</p>",
    }

    await emailService.sendEmail(mailOptions)

    res.status(200).json({ message: "Test email sent successfully" })
  } catch (error) {
    console.error("Test email error:", error)
    res.status(500).json({ message: error.message || "Failed to send test email" })
  }
}
