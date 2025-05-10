const express = require("express")
const router = express.Router()
const authController = require("../controllers/auth.controller")
const authenticateToken = require("../middleware/auth.middleware")

// Auth routes
router.post("/signup", authController.signup)
router.post("/login", authController.login)
router.post("/logout", authController.logout)
router.get("/user", authenticateToken, authController.getCurrentUser)
router.post("/forgot-password", authController.forgotPassword)
router.get("/verify-token", authController.verifyToken)
router.post("/reset-password", authController.resetPassword)

// Test email route for debugging
router.post("/test-email", authController.testEmail)

module.exports = router
