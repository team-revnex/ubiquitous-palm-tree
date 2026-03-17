const mongoose = require("mongoose")
const { Schema } = mongoose

const authorSchema = Schema(
    {
        fname: String,
        username: {
            type: String,
            required: true
        },
        password: {
            type: String,
            required: true
        }
    },
    {
        timestamps : true
    }
)

module.exports = mongoose.model('Author', authorSchema)
