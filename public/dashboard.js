document.addEventListener("DOMContentLoaded", () => {
  // Check if user is authenticated
  checkAuthentication()

  // Initialize sidebar navigation
  initSidebar()

  // Initialize UI interactions
  initUIInteractions()

  // Initialize chatbot
  initChatbot()
})

// Check if user is authenticated
async function checkAuthentication() {
  try {
    const response = await fetch("/api/auth/user", {
      credentials: "include",
    })

    if (!response.ok) {
      // If not authenticated, redirect to login page
      window.location.href = "login.html"
      return
    }

    // Get user data and update UI
    const data = await response.json()
    updateUserInfo(data.user)
  } catch (error) {
    console.error("Authentication check failed:", error)
    window.location.href = "login.html"
  }
}

// Update user information in the UI
function updateUserInfo(user) {
  const userGreeting = document.getElementById("user-greeting")
  if (userGreeting && user) {
    userGreeting.textContent = `Welcome, ${user.username}`
  }
}

// Initialize sidebar navigation
function initSidebar() {
  const sidebarItems = document.querySelectorAll(".sidebar-item[data-section]")
  const contentSections = document.querySelectorAll(".content-section")

  sidebarItems.forEach((item) => {
    item.addEventListener("click", function (e) {
      e.preventDefault()

      // Get the section to show
      const sectionId = this.getAttribute("data-section")

      // Remove active class from all sidebar items and content sections
      sidebarItems.forEach((item) => item.classList.remove("active"))
      contentSections.forEach((section) => section.classList.remove("active"))

      // Add active class to clicked item and corresponding section
      this.classList.add("active")
      document.getElementById(sectionId).classList.add("active")
    })
  })

  // Handle hamburger menu for mobile
  const hamburgerMenu = document.querySelector(".hamburger-menu")
  const sidebar = document.querySelector(".sidebar")

  if (hamburgerMenu && sidebar) {
    hamburgerMenu.addEventListener("click", () => {
      sidebar.classList.toggle("active")
    })
  }

  // Handle logout
  const logoutButton = document.getElementById("logout-button")
  if (logoutButton) {
    logoutButton.addEventListener("click", async (e) => {
      e.preventDefault()
      await logout()
    })
  }
}

// Logout function
async function logout() {
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    })

    if (response.ok) {
      window.location.href = "index.html"
    } else {
      console.error("Logout failed")
    }
  } catch (error) {
    console.error("Error during logout:", error)
  }
}

// Initialize UI interactions
function initUIInteractions() {
  // Document upload
  const uploadDocumentBtn = document.getElementById("upload-document-btn")
  const documentUploadForm = document.querySelector(".document-upload-form")
  const cancelUploadBtn = document.getElementById("cancel-upload-btn")
  const documentForm = document.getElementById("document-form")

  if (uploadDocumentBtn && documentUploadForm) {
    uploadDocumentBtn.addEventListener("click", function () {
      documentUploadForm.style.display = "block"
      this.style.display = "none"
    })
  }

  if (cancelUploadBtn && uploadDocumentBtn) {
    cancelUploadBtn.addEventListener("click", () => {
      documentUploadForm.style.display = "none"
      uploadDocumentBtn.style.display = "block"
    })
  }

  if (documentForm) {
    documentForm.addEventListener("submit", (e) => {
      e.preventDefault()
      // This would normally submit the form to the server
      // For now, just show a mock success message
      alert("Document upload feature will be implemented in the future.")
      documentUploadForm.style.display = "none"
      uploadDocumentBtn.style.display = "block"
      documentForm.reset()
    })
  }

  // Note creation
  const createNoteBtn = document.getElementById("create-note-btn")
  const noteEditor = document.querySelector(".note-editor")
  const cancelNoteBtn = document.getElementById("cancel-note-btn")
  const noteForm = document.getElementById("note-form")

  if (createNoteBtn && noteEditor) {
    createNoteBtn.addEventListener("click", function () {
      noteEditor.style.display = "block"
      this.style.display = "none"
    })
  }

  if (cancelNoteBtn && createNoteBtn) {
    cancelNoteBtn.addEventListener("click", () => {
      noteEditor.style.display = "none"
      createNoteBtn.style.display = "block"
    })
  }

  if (noteForm) {
    noteForm.addEventListener("submit", (e) => {
      e.preventDefault()
      // This would normally submit the form to the server
      // For now, just show a mock success message
      alert("Note creation feature will be implemented in the future.")
      noteEditor.style.display = "none"
      createNoteBtn.style.display = "block"
      noteForm.reset()
    })
  }

  // Forum topic creation
  const createTopicBtn = document.getElementById("create-topic-btn")
  if (createTopicBtn) {
    createTopicBtn.addEventListener("click", () => {
      alert("Forum feature will be implemented in the future.")
    })
  }
}

// Initialize chatbot
function initChatbot() {
  const chatMessages = document.getElementById("chat-messages")
  const userMessageInput = document.getElementById("user-message")
  const sendMessageBtn = document.getElementById("send-message-btn")

  if (sendMessageBtn && userMessageInput && chatMessages) {
    sendMessageBtn.addEventListener("click", () => {
      sendMessage()
    })

    userMessageInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        sendMessage()
      }
    })
  }

  function sendMessage() {
    const message = userMessageInput.value.trim()
    if (message === "") return

    // Add user message to chat
    addMessage(message, "user")
    userMessageInput.value = ""

    // Simulate bot response (this would normally call an AI API)
    setTimeout(() => {
      const botResponses = [
        "I'm still learning about that topic. Can you tell me more?",
        "That's an interesting question! Let me think about it...",
        "Based on my knowledge, this is a complex topic with multiple perspectives.",
        "I'd recommend checking your course materials for more detailed information on this.",
        "Great question! In simple terms, this concept refers to...",
        "I'm here to help with your studies. What specific aspect would you like to know more about?",
      ]
      const randomResponse = botResponses[Math.floor(Math.random() * botResponses.length)]
      addMessage(randomResponse, "bot")
    }, 1000)
  }

  function addMessage(text, sender) {
    const messageDiv = document.createElement("div")
    messageDiv.className = `message ${sender}-message`

    const avatarDiv = document.createElement("div")
    avatarDiv.className = "message-avatar"
    avatarDiv.textContent = sender === "user" ? "👤" : "🤖"

    const contentDiv = document.createElement("div")
    contentDiv.className = "message-content"

    const paragraph = document.createElement("p")
    paragraph.textContent = text

    contentDiv.appendChild(paragraph)
    messageDiv.appendChild(avatarDiv)
    messageDiv.appendChild(contentDiv)

    chatMessages.appendChild(messageDiv)

    // Scroll to bottom of chat
    chatMessages.scrollTop = chatMessages.scrollHeight
  }
}
