const express = require('express')
const router = express.Router()
const isAdminMiddleWare = require('../middlewares/isAdmin')
const AvailableDate = require('../models/AvailableDate')

router.use(isAdminMiddleWare)

// Get all available dates
router.get('/', async (req, res) => {
    try {
        const dates = await AvailableDate.find({}).sort({ date: 1 })
        res.render('admin/dates/available-dates', {
            user: req.user,
            dates,
            page: 'dates'
        })
    } catch (error) {
        console.error('Error fetching dates:', error)
        res.status(500).send('خطأ في تحميل البيانات')
    }
})

// Add new available date
router.post('/add', async (req, res) => {
    try {
        const { date, timeSlots } = req.body

        // Check if date already exists
        const existingDate = await AvailableDate.findOne({ date })
        if (existingDate) {
            req.flash('error', 'هذا التاريخ موجود بالفعل')
            return res.redirect('/dates')
        }

        const slots = Array.isArray(timeSlots) ? timeSlots : [timeSlots]

        const newDate = new AvailableDate({
            date,
            timeSlots: slots
        })

        await newDate.save()
        req.flash('success', 'تم إضافة التاريخ بنجاح')
        res.redirect('/dates')
    } catch (error) {
        console.error('Error adding date:', error)
        req.flash('error', 'حدث خطأ أثناء إضافة التاريخ')
        res.redirect('/dates')
    }
})

// Delete a date
router.delete('/:id', async (req, res) => {
    try {
        await AvailableDate.findByIdAndDelete(req.params.id)
        res.json({ success: true })
    } catch (error) {
        console.error('Error deleting date:', error)
        res.status(500).json({ success: false, error: 'Failed to delete date' })
    }
})

// Toggle availability
router.put('/:id/toggle', async (req, res) => {
    try {
        const date = await AvailableDate.findById(req.params.id)
        if (date) {
            date.isAvailable = !date.isAvailable
            await date.save()
            res.json({ success: true, isAvailable: date.isAvailable })
        } else {
            res.status(404).json({ success: false, error: 'Date not found' })
        }
    } catch (error) {
        console.error('Error toggling date:', error)
        res.status(500).json({ success: false, error: 'Failed to toggle date' })
    }
})

// API endpoint for frontend (no auth required)
router.get('/api/available', async (req, res) => {
    try {
        const dates = await AvailableDate.find({ isAvailable: true }).sort({ date: 1 })
        res.json({ success: true, dates })
    } catch (error) {
        console.error('Error fetching available dates:', error)
        res.status(500).json({ success: false, error: 'Failed to fetch dates' })
    }
})

module.exports = router
