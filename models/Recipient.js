const mongoose = require("mongoose")
const { Schema } = mongoose

const recipientSchema = Schema(
    {
        author: {
            type: Schema.ObjectId,
            ref: "Author",
            required: true
        },
        fname: String,
        address: {
            type: String,
            required: true
        }
    },
    {
        timestamps : true
    }
)

module.exports = mongoose.model('Recipient', recipientSchema)
