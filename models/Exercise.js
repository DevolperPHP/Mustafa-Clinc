const mongoose = require("mongoose")

const exerciseSchema = new mongoose.Schema({
    name: {
        type: String
    },

    Date: {
        type: String,
    }
})

const Exercise = mongoose.model('Exercise', exerciseSchema, 'Exercise')
module.exports = Exercise