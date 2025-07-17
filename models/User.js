const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    name: {
        type: String
    },

    email: {
        type: String
    },

    password: {
        type: String,
    },

    isAdmin: {
        type: Boolean,
        default: false
    },

    balance: {
        type: Number,
        default: 0
    },

    sells: {
        type: Array,
        default: []
    }
})

const User = mongoose.model('User', userSchema, 'User')
module.exports = User