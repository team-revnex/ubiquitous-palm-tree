const mongoose = require("mongoose")
const { Schema } = mongoose

// paste - has the user pasted content into an e-mail client
// fire - has the tracking started
// firefox - when was tracking started
const trackSchema = Schema(
    {
        paste: {
            type: Boolean,
            default: false
        },
        fire: {
            type: Boolean,
            default: false
        },
        firefox: Date,
        receipt:{
            type: Number,
            default: 0
        },
        unix: {
            type: [{
                ip: String,
                ua: String,
                timestamp: Date
            }],
            required: false
        },
    },
    {
        timestamps: true
    }
)

module.exports = mongoose.model('Track', trackSchema)

