const mongoose = require('mongoose')

const TestsSchema = new mongoose.Schema({
    name: {
        type: String,
    },

    sortDate: {
        type: Date,
        default: Date.now()
    },

    patients: {
        type: Array,
        default: [],
    }
})

const Tests = mongoose.model('Tests', TestsSchema, 'Tests')
module.exports = Tests