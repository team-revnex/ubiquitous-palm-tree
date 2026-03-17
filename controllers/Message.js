const { isValidObjectId } = require("mongoose")
const { fives, threeies, escapeRegex } = require("../middleware/Helper")
const Message = require("../models/Message")
const Recipient = require("../models/Recipient")
const Track = require("../models/Track")

const createRecipient = async (req, res) => {
    const { recipient } = req.body

    if (typeof recipient !== 'string' || recipient.trim() === '') {
        return res.json({
            success: false,
            message: "Recipient e-mail address is required"
        })
    }

    const author = req.user

    const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

    const isvalid = pattern.test(recipient)

    if (isvalid === false) {
        return res.json({
            success: false,
            message: "Please send a valid e-mail address"
        })
    }

    // Add unique recepients
    const created = await Recipient.findOneAndUpdate(
        { author: author._id, address: recipient.trim() },
        { $setOnInsert: { author: author._id, address: recipient.trim() } },
        {
            new: true,
            upsert: true
        }
    ).select("-author")

    res.json({
        success: true,
        message: "Added recepient",
        recipient: created
    })
}

const createMessage = async (req, res) => {
    const { recipient } = req.body

    if (typeof recipient !== 'string' || recipient.trim() === '') {
        return res.json({
            success: false,
            message: "Recipient address is required"
        })
    }

    const author = req.user

    const r = await Recipient.findOne({ author: author._id, address: recipient.trim() })

    if (r === null) {
        return res.json({
            success: false,
            message: "Recipient not exist"
        })
    }

    const track = await Track.create({ seen: false })

    const eas = fives.at(Math.floor(Math.random() * fives.length)) + "-" + threeies.at(Math.floor(Math.random() * threeies.length))

    await Message.create({
        author: author._id,
        recipient: r._id,
        eas,
        tid: track._id
    })

    res.json({
        success: true,
        message: "Added recepient",
        eas,
        tid: track._id
    })
}

const discardMessage = async (req, res) => {
    const { eas, tid, text } = req.body

    if (typeof eas !== 'string' || eas.trim() === '') {
        return res.json({
            success: false,
            message: "E-mail nickname is required"
        })
    }

    if (typeof tid !== 'string' || tid.trim() === '' || isValidObjectId(tid) === false) {
        return res.json({
            success: false,
            message: "Tracking id is required"
        })
    }

    const author = req.user

    // Save as draft
    if (text) {
        await Message.findOneAndUpdate({ author: author._id, eas, tid }, {
            text
        })

        return res.json({
            success: true,
            message: "Saved in drafts"
        })
    }

    await Track.deleteOne({ author: author._id, _id: tid })
    
    await Message.deleteOne({
        author: author._id,
        eas,
        tid
    })

    res.json({
        success: true,
        message: "Discarded message"
    })
}

const fetchRecipients = async (req, res) => {
    const { recipient } = req.body

    if (typeof recipient !== 'string' || recipient.trim() === '') {
        return res.json({
            success: false,
            message: "Recipient is required"
        })
    }

    const author = req.user

    const escaped = escapeRegex(recipient)

    const recipients = await Recipient.find({
        author: author._id,
        address: { $regex: `${escaped}`, $options: "i" }
    })

    res.json({
        success: true,
        message: "List of existing recepient e-mail addresses",
        recipients
    })
}

const fetchMessages = async (req, res) => {
    const { recipient } = req.body

    if (typeof recipient !== 'string' || recipient.trim() === '') {
        return res.json({
            success: false,
            message: "Recipient is required"
        })
    }

    const author = req.user

    const __recipient = await Recipient.findOne({ author: author._id, address: recipient })

    if (__recipient === null) {
        return res.json({
            success: false,
            message: "Recipient doesn't exist"
        })
    }

    const messages = await Message.find({ author: author._id, recipient: __recipient._id }).populate("tid").sort("-createdAt")

    const count = await Message.countDocuments({ author: author._id, recipient: __recipient._id })

    res.json({
        success: true,
        message: "List of messages",
        messages,
        count
    })
}

const readNotification = async (req, res) => {
    const { tid } = req.body

    if (typeof tid !== 'string' || tid.trim() === '') {
        return res.json({
            success: false,
            message: "Tracking id is required"
        })
    }

    const author = req.user

    const message = await Message.findOne({ author: author._id, tid })

    if (message === null) {
        return res.json({
            success: false,
            message: "Please send a valid tracking id"
        })
    }

    const track = await Track.findOneAndUpdate({ _id: tid, fire: true },
        [{
            $set: {
                receipt: { $size: { $ifNull: ["$unix", []] } }
            }
        }],
        { new: true }
    )

    if (track === null) {
        return res.json({
            success: false,
            message: "Couldn't find a tracked message"
        })
    }

    res.json({
        success: true,
        message: "Updated the receipt"
    })
}

module.exports = {
    createRecipient,
    fetchRecipients,
    fetchMessages,
    createMessage,
    discardMessage,
    readNotification
}
