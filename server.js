const dotenv = require('dotenv')
const cors = require('cors')
const mongoose = require('mongoose')
const express = require('express')
const app = express()
const router = require("./routes/routes")
const multer = require('multer')

const PORT = process.env.PORT || 5010

// Loads environment variables globally during development
// Using .env file
dotenv.config()

// Client's ip is derived from the x-forwarded-for header
app.set('trust proxy', true)

// Handle file uploads i.e. form data using multer
const formdataParser = multer().fields([])

app.use(formdataParser)

app.use(express.json())
app.use(express.urlencoded({ extended: false }))

app.use('/uploads', express.static("uploads"))

// Allow access
app.use(cors({
    origin: (origin, callback) => {
        console.log(`+ Request origin: ${origin}`)
        callback(null, true)
    },
    optionsSuccessStatus: 200
}))

// Routes
app.use("/api", router)

// Connect to database
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => { console.log("Successfully connected to database") })
    .catch(error => {
        console.log("[-] Mongoose error")
        console.log(error)
    })


app.listen(PORT, () => {
    console.log('Server running on port ' + PORT)
})


