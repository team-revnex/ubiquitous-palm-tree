const expres = require("express")
const router = expres.Router()

const Author = require("../controllers/Author")
const Message = require("../controllers/Message")
const { Authentication } = require("../middleware/Authentication")

router.get("/keep-alive", Author.keepAlive)
router.post("/Auth/sign-in", Author.loginUser)
router.post("/Auth/register", Author.registerUser)
router.post("/Image/upload", Author.uploadImage)
router.get("/Message/active", Author.activeMessage)

router.get("/Image/:id", Author.fetchImage)
router.post("/Image/toggle-copy", Authentication, Author.togglePaste)
router.post("/Image/enable-tracking", Authentication, Author.enableTracking)
router.post("/Image/has-paste", Authentication, Author.socketPaste)
router.post("/Image/track-boat", Authentication, Author.messageStatus)

router.post("/Message/create-recipient", Authentication, Message.createRecipient)
router.post("/Message/fetch-recipient", Authentication, Message.fetchRecipients)
router.post("/Message/fetch-messages", Authentication, Message.fetchMessages)
router.post("/Message/create-message", Authentication, Message.createMessage)
router.post("/Message/save-message", Authentication, Message.discardMessage)
router.post("/Message/seen-opens", Authentication, Message.readNotification)

module.exports = router
