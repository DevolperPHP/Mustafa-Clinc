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

    // Track booked time slots
    bookedSlots: [{
        time: String,
        reservationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Reservation'
        }
    }],

    // Time range for easier management
    startTime: {
        type: String,
        default: '15:00'  // 3 PM
    },

    endTime: {
        type: String,
        default: '21:00'  // 9 PM
    },

    // Session duration in minutes
    sessionDuration: {
        type: Number,
        default: 30
    },

    isAvailable: {
        type: Boolean,
        default: true
    },

    // Maximum sessions per day
    maxSessions: {
        type: Number,
        default: 12  // 6 hours / 30 min = 12 sessions
    },

    notes: {
        type: String,
        default: ''
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
})

// Virtual to get available (not booked) time slots
availableDateSchema.virtual('availableSlots').get(function() {
    const bookedTimes = this.bookedSlots.map(b => b.time)
    return this.timeSlots.filter(slot => !bookedTimes.includes(slot))
})

// Method to check if a time slot is available
availableDateSchema.methods.isSlotAvailable = function(time) {
    const bookedTimes = this.bookedSlots.map(b => b.time)
    return this.timeSlots.includes(time) && !bookedTimes.includes(time)
}

// Method to book a time slot
availableDateSchema.methods.bookSlot = function(time, reservationId) {
    if (!this.isSlotAvailable(time)) {
        throw new Error('هذا الموعد محجوز بالفعل')
    }
    this.bookedSlots.push({ time, reservationId })
    return this.save()
}

// Method to release a time slot
availableDateSchema.methods.releaseSlot = function(time) {
    this.bookedSlots = this.bookedSlots.filter(b => b.time !== time)
    return this.save()
}

// Enable virtuals in JSON
availableDateSchema.set('toJSON', { virtuals: true })
availableDateSchema.set('toObject', { virtuals: true })

// Index for efficient queries
availableDateSchema.index({ date: 1, isAvailable: 1 })

const AvailableDate = mongoose.model('AvailableDate', availableDateSchema, 'AvailableDate')
module.exports = AvailableDate
