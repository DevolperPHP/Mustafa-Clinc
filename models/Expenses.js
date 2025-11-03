const mongoose = require('mongoose')

const expensesSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    amount: {
        type: Number,
        required: true
    },
    date: {
        type: String,
        required: true
    },
    notes: {
        type: String,
        default: ''
    }
})

const Expenses = mongoose.model('expenses', expensesSchema, 'expenses')
module.exports = Expenses
