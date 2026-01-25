const mongoose = require('mongoose')

const reservationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    birthDate: {
        type: String,
        required: true
    },

    gender: {
        type: String,
        enum: ['ذكر', 'أنثى'],
        required: true
    },

    phone: {
        type: String,
        required: true
    },

    type: {
        type: String,
        enum: ['اونلاين', 'حضوري'],
        required: true
    },

    selectedDate: {
        type: String,
        required: true
    },

    selectedTime: {
        type: String,
        required: true
    },

    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no-show'],
        default: 'pending'
    },

    // OTP Verification Fields
    phoneVerified: {
        type: Boolean,
        default: false
    },

    otpCode: {
        type: String,
        default: null
    },

    otpExpiry: {
        type: Date,
        default: null
    },

    otpAttempts: {
        type: Number,
        default: 0
    },

    otpVerifiedAt: {
        type: Date,
        default: null
    },

    // Additional fields
    notes: {
        type: String,
        default: ''
    },

    adminNotes: {
        type: String,
        default: ''
    },

    source: {
        type: String,
        enum: ['online', 'admin', 'phone'],
        default: 'online'
    },

    reminderSent: {
        type: Boolean,
        default: false
    },

    createdAt: {
        type: Date,
        default: Date.now
    },

    updatedAt: {
        type: Date,
        default: Date.now
    }
})

// Update the updatedAt field before saving
reservationSchema.pre('save', function(next) {
    this.updatedAt = new Date()
    next()
})

// Index for efficient queries
reservationSchema.index({ selectedDate: 1, selectedTime: 1 })
reservationSchema.index({ phone: 1 })
reservationSchema.index({ status: 1 })
reservationSchema.index({ createdAt: -1 })

const Reservation = mongoose.model('Reservation', reservationSchema, 'Reservation')
module.exports = Reservation
