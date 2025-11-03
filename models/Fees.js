const mongoose = require('mongoose')

const feesSchema = new mongoose.Schema({
    name: String,
    price: Number,
    Date: String,
})

const Fees = mongoose.model('fees', feesSchema, 'fees')
module.exports = Fees