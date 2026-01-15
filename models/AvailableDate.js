const mongoose = require('mongoose')

const availableDateSchema = new mongoose.Schema({
    date: {
        type: String,
        required: true,
        unique: true
    },

    timeSlots: [{
        type: String
    }],

    isAvailable: {
        type: Boolean,
        default: true
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
})

const AvailableDate = mongoose.model('AvailableDate', availableDateSchema, 'AvailableDate')
module.exports = AvailableDate
