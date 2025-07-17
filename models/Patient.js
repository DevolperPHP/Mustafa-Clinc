const mongoose = require('mongoose')

const patientSchema = new mongoose.Schema({
    name: {
        type: String
    },

    birthDate: {
        type: String
    },

    gender: {
        type: String
    },

    study: {
        type: String
    },

    address:{
        type: String
    },

    phone: {
        type: String
    },

    relationship: {
        type: String
    },

    familyMembers: {
        type: Number
    },

    familyRank: {
        type: Number,
    },

    health: {
        type: String
    },

    psycho: {
        type: String
    },

    RelationshipAndFamily:{
        type: String
    },

    sendTo: {
        type: String,
        default: null,
    },

    psychoNote:{
        type: String,
        default: null,
    },

    neededTest:{
        type: String
    },

    tests:{
        type: Array,
    },

    exercise:{
        type: Array
    },

    Notes: {
        type: String,
        default: null,
    },

    balance: {
        type: Number,
        default: 0,
    },

    dateAdded:{
        type: String,
    },

    code: {
        type: Number
    },

    bills: {
        type: Array,
        default: []
    },

    inCourse:{
        type: Boolean,
        default: false,
    },

    course: {
        type: Array,
        default: [],
    },

    bills: {
        type: Array,
        default: []
    },

    purchase: {
        type: Array,
        default: []
    },

    otherNotes: {
        type: Array,
        default: []
    },

    doctor_diagnose: {
        type: String,
        default: null
    },

    therapist_diagnose: {
        type: String,
        default: null,
    },

    type:{ 
        type: String,
        default: null
    },
})

const Patient = mongoose.model('Patient', patientSchema, 'Patient')
module.exports = Patient