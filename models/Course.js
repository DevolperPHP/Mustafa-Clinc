const mongoose = require('mongoose')

const courseSchema = new mongoose.Schema({
    sessions: {
        type: Number,
    },

    price: {
        type: Number
    },
})

const Course =  mongoose.model('Course', courseSchema, 'Course')
module.exports = Course