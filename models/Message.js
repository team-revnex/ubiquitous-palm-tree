const mongoose = require("mongoose")
const { Schema } = mongoose

// eas => e-mail alias :: random nickname assigned to each message
const messageSchema = Schema(
    {
        author: {
            type: Schema.ObjectId,
            ref: "Author",
            required: true
        },
        text: String,
        recipient: {
            type: Schema.ObjectId,
            ref: "Recipient",
            required: true
        },
        eas: {
            type: String,
            required: true
        },
        tid: {
            type: Schema.ObjectId,
            ref: "Track",
            required: true
        }
    },
    {
        timestamps : true
    }
)

module.exports = mongoose.model('Message', messageSchema)

