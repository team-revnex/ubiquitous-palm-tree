const mongoose = require("mongoose")
const { Schema } = mongoose


const imageSchema = Schema(
    {
        blob: {
            type: String,
            required: true
        },
        istext: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps : true
    }
)

module.exports = mongoose.model('Image', imageSchema)

