const nodemailer = require("nodemailer")

// Create email transporter
let transporter = null

// Initialize transporter
const initTransporter = () => {
  console.log("Initializing email transporter with service:", process.env.EMAIL_SERVICE)
  
  // For Gmail
  if (process.env.EMAIL_SERVICE?.toLowerCase() === 'gmail') {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD, // This should be an app password, not your regular password
      },
    })
  } 
  // For other services like Outlook, Yahoo, etc.
  else if (process.env.EMAIL_SERVICE) {
    transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    })
  } 
  // For SMTP configuration
  else if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    })
  }
  // Fallback to a test account
  else {
    console.warn("No email configuration found. Using Ethereal test account.")
    // Create a test account on ethereal.email
    nodemailer.createTestAccount().then(testAccount => {
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      })
      console.log("Test account created:", testAccount.user)
    }).catch(err => {
      console.error("Failed to create test account:", err)
    })
  }
}

// Initialize the transporter when the service is loaded
initTransporter()

// Verify the transporter configuration
const verifyTransporter = async () => {
  if (!transporter) {
    console.error("Email transporter not initialized")
    return false
  }
  
  try {
    const verification = await transporter.verify()
    console.log("Transporter verification successful:", verification)
    return true
  } catch (error) {
    console.error("Transporter verification failed:", error)
    return false
  }
}

// Email service
const emailService = {
  sendEmail: async (mailOptions) => {
    if (!transporter) {
      console.error("Email transporter not initialized")
      throw new Error("Email service not configured properly")
    }

    try {
      console.log("Attempting to send email to:", mailOptions.to)
      
      const info = await transporter.sendMail({
        from: process.env.EMAIL_USER || 'noreply@mutalia.com',
        ...mailOptions,
      })
      
      console.log("Email sent successfully!")
      console.log("Message ID:", info.messageId)
      
      // If using Ethereal, log the URL where the message can be viewed
      if (info.messageId && info.messageId.includes('ethereal')) {
        console.log("Preview URL:", nodemailer.getTestMessageUrl(info))
      }
      
      return true
    } catch (error) {
      console.error("Error sending email:", error)
      throw error
    }
  },
  
  verifyConfiguration: async () => {
    return await verifyTransporter()
  }
}

module.exports = emailService
