const { fileDownloader } = require("../middleware/Helper")
const Image = require("../models/Image")
const Message = require("../models/Message")
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const Author = require('../models/Author')
const path = require("path")
const fs = require('fs')
const Track = require("../models/Track")
const { isValidObjectId } = require("mongoose")

const BASE_DIR = path.join(process.cwd(), "uploads", "twemoji")

const uploadImage = async (req, res) => {
    const { image } = req.body

    if (!image) {
        return res.json({
            success: false,
            message: "Please send an encoded image"
        })
    }

    const file = await fileDownloader("spoon", image)

    if (file === false) {
        return res.json({
            success: false,
            message: "Invalid encoded image"
        })
    }

    const created = await Image.create({ blob: image })

    const id = created._id

    const message = await Message.findOne({ active: true })

    // No active message box, create one
    if (message === null) {
        await Message.create({ image: [id], active: true })

        return res.json({
            success: true,
            message: "Upload success",
            file
        })
    }

    const count = message.image.length

    // Just update the message box with image
    if (count < 7) {
        await Message.findOneAndUpdate({ active: true }, {
            $push: { image: id }
        })

        return res.json({
            success: true,
            message: "Upload success",
            file
        })
    }

    // Message full with seven images, create a new active message
    await Message.findOneAndUpdate({ active: true }, {
        active: false
    })

    await Message.create({ image: [id], active: true })

    res.json({
        success: true,
        message: "Upload success",
        file
    })
}

const togglePaste = async (req, res) => {
    const { tid, paste } = req.body

    const author = req.user

    if (isValidObjectId(tid) === false) {
        return res.json({
            success: false,
            message: "Invalid track id"
        })
    }

    const valid = await Message.findOne({ author: author._id, tid })

    if (valid === null) {
        return res.json({
            success: false,
            message: "Invalid track id"
        })
    }

    await Track.findOneAndUpdate({ _id: tid }, { paste })

    res.json({
        success: true,
        message: "Toggle paste success"
    })
}

const enableTracking = async (req, res) => {
    const { tid, text } = req.body

    const author = req.user

    if (typeof text !== 'string' || text.trim() === '') {
        return res.json({
            success: false,
            message: "Text sent is required"
        })
    }

    if (isValidObjectId(tid) === false) {
        return res.json({
            success: false,
            message: "Invalid track id"
        })
    }

    const valid = await Message.findOneAndUpdate({ author: author._id, tid }, { text })

    if (valid === null) {
        return res.json({
            success: false,
            message: "Not a valid track id"
        })
    }

    const updated = await Track.findOneAndUpdate({ _id: tid, paste: true }, { 
        fire: true,
        firefox: new Date() 
    })

    if (updated === null) {
        return res.json({
            success: false,
            message: "You didn't paste into an e-mail client"
        })
    }

    res.json({
        success: true,
        message: "Tracking has been enabled"
    })
}

const messageStatus = async (req, res) => {
    const { tid } = req.body

    const author = req.user

    if (isValidObjectId(String(tid)) === false) {
        return res.json({
            success: false,
            message: "Invalid track id"
        })
    }

    const message = await Message.findOne({ author: author._id, tid })

    if (message === null) {
        return res.json({
            success: false,
            message: "Not a valid track id"
        })
    }

    const track = await Track.findOne({ _id: tid })

    if (track.fire === false) {
        return res.json({
            success: false,
            message: "Tracking not started"
        })
    }

    res.json({
        success: true,
        message: "Trackig status",
        track,
        message
    })
}

const socketPaste = async (req, res) => {
    const { tid } = req.body

    const author = req.user

    if (isValidObjectId(tid) === false) {
        return res.json({
            success: false,
            message: "Invalid track id"
        })
    }

    // Check if author sent his track id i.e. not tampered
    const valid = await Message.findOne({ author: author._id, tid })

    if (valid === null) {
        return res.json({
            success: false,
            message: "Invalid track id"
        })
    }

    const track = await Track.findOne({ _id: tid })

    res.json({
        success: true,
        message: "Tracking status",
        paste: track.paste
    })
}

const fetchImage = async (req, res) => {
    const { id } = req.params
    const { tid } = req.query

    const ua = req.get('User-Agent')

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip

    // Strips path parts
    const filename = path.basename(id)

    // Invalid path not a png
    if (!/^[a-zA-Z0-9._-]+\.png$/.test(filename)) {
        return res.json({
            success: false,
            message: "Invalid mime type"
        })
    }

    const image = path.resolve(BASE_DIR, filename)

    if (!fs.existsSync(image)) {
        return res.json({
            success: false,
            message: "Emoji doesn't exist"
        })
    }

    if (tid === undefined) {
        return res.sendFile(image)
    }

    const track = await Track.findOne({ _id: tid })

    if (track === null) {
        return res.json({
            success: false,
            message: "Tracker not found"
        })
    }

    // Check if user pasted into client
    if (track.paste === false && track.fire === false) {
        await Track.findOneAndUpdate({ _id: tid, paste: false }, {
            paste: true
        })

        return res.sendFile(image)
    }

    // Save the timestamp to message
    const update = {
        $push: {
            unix: {
                $each: [
                    {
                        ip,
                        ua,
                        timestamp: new Date(),
                    },
                ],
                $position: 0, // insert at beginning (newest first)
            },
        },
        $set: {
            seen: true,
        }
    }

    await Track.findOneAndUpdate({ _id: tid, fire: true }, update)

    res.sendFile(image)
}

const activeMessage = async (req, res) => {
    const message = await Message.findOne({ active: true })

    if (message && message.unix) {
        message.unix = message.unix.reverse()
    }

    res.json({
        success: true,
        message
    })
}

const keepAlive = async (req, res) => {
    const ua = req.get('User-Agent')

    // Get the IP Address
    // We check 'x-forwarded-for' first because if you are on a cloud host, 
    // req.ip often returns the internal load balancer IP, not the real user.
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip

    console.log(`+ Ping received from: ${ip}\n+ Client device: ${ua}`)

    // Keep mongodb in sync so it doesn't get inactive
    const image = await Image.findOne({})

    res.json({
        success: true,
        message: "Web Service and database active"
    })
}

const loginUser = async (req, res) => {
    const { username, password } = req.body

    if (typeof username !== 'string' || username.trim() === '') {
        return res.json({
            success: false,
            message: "Username is required"
        })
    }

    const user = await Author.findOne({ username })

    if (user === null) {
        return res.json({
            success: false,
            message: "The username you entered doesn't belong to an account. Please check your username and try again. "
        })
    }

    const hashed = user.password

    const match = await bcrypt.compare(password, hashed)

    // Incorrect password
    if (match === false) {
        return res.json({
            success: false,
            message: "Sorry, your password was incorrect. Please double-check your password."
        })
    }

    const token = jwt.sign({
        _id: user._id,
        username: user.username,
        fname: user.fname
    }, process.env.JWT_ACCESS_TOKEN)

    res.json({
        success: true,
        message: "Logged in as " + username,
        token
    })
}

const registerUser = async (req, res) => {
    const { fname, username, password } = req.body

    if (typeof fname !== 'string' || fname.trim() === '') {
        return res.json({
            success: false,
            message: "Name is required"
        })
    }

    // Validate username format
    if (username) {
        if (username.length < 4 || username.length > 20) {
            return res.json({
                success: false,
                message: "Username must be 4-20 characters long"
            })
        }

        if (username.startsWith("-") || username.endsWith("-")) {
            return res.json({
                success: false,
                message: "Username can't start or end with hyphen"
            })
        }

        const match = username.match(/[~`\\!@#$%^'&*\(\)_+=\|{}\[\]":;<>,\.\?]/g)

        if (match !== null) {
            return res.json({
                success: false,
                message: "Username can contain alphabets, numbers and hyphen"
            })
        }
    } else {
        return res.json({
            success: false,
            message: "Username is required"
        })
    }

    // Validate password
    // Password must include capital, small alphabets, numbers and a symbol
    if (password) {
        //  Password should have atleast eight characters
        if (password.length < 8) {
            return res.json({
                success: false,
                message: "Password should have atleast eight characters"
            })
        }

        const small = password.match(/[a-z]+/g)
        const capital = password.match(/[A-Z]+/g)
        const number = password.match(/[0-9]+/g)
        const symbol = password.match(/[-+~`@#$%^&*()_={}\[\]\/:;"'<>,?\.]+/g)

        if (small === null || capital === null || symbol === null || number === null) {
            return res.json({
                success: false,
                message: "Password must include capital, small alphabets, numbers and a symbol"
            })
        }
    } else {
        return res.json({
            success: false,
            message: "Password is required"
        })
    }

    const hashed = await bcrypt.hash(password, 10)

    // Check for duplicate username
    const duplicate = await Author.findOne({ username })

    if (duplicate) {
        return res.json({
            success: false,
            message: "This username isn't available. Please try another."
        })
    }

    // Save new user to database
    await Author.create({
        fname, username, password: hashed
    })

    const token = jwt.sign({ username }, process.env.JWT_ACCESS_TOKEN)

    res.json({
        success: true,
        message: "User registered successfully",
        token
    })
}

module.exports = {
    uploadImage,
    keepAlive,
    fetchImage,
    activeMessage,
    loginUser,
    registerUser,
    togglePaste,
    enableTracking,
    socketPaste,
    messageStatus
}
