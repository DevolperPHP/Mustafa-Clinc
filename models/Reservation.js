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
        enum: ['pending', 'confirmed', 'cancelled'],
        default: 'pending'
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

const Reservation = mongoose.model('Reservation', reservationSchema, 'Reservation')
module.exports = Reservation
