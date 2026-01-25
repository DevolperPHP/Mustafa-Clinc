const express = require('express')
const router = express.Router()
const isAdminMiddleWare = require('../middlewares/isAdmin')
const Reservation = require('../models/Reservation')
const AvailableDate = require('../models/AvailableDate')
const moment = require('moment')

// Apply admin middleware to all routes
router.use(isAdminMiddleWare)

// ==================== RESERVATIONS DASHBOARD ====================
router.get('/', async (req, res) => {
    try {
        const today = moment().format('DD/MM/YYYY')
        
        // Get statistics
        const totalReservations = await Reservation.countDocuments({ phoneVerified: true })
        const todayReservations = await Reservation.countDocuments({ 
            selectedDate: today, 
            phoneVerified: true 
        })
        const pendingReservations = await Reservation.countDocuments({ 
            status: 'pending', 
            phoneVerified: true 
        })
        const confirmedReservations = await Reservation.countDocuments({ 
            status: 'confirmed', 
            phoneVerified: true 
        })

        // Get upcoming reservations (next 7 days)
        const reservations = await Reservation.find({ phoneVerified: true })
            .sort({ selectedDate: 1, selectedTime: 1 })
            .limit(50)

        res.render('admin/reservations/index', {
            user: req.user,
            page: 'reservations',
            reservations,
            stats: {
                total: totalReservations,
                today: todayReservations,
                pending: pendingReservations,
                confirmed: confirmedReservations
            },
            currentDate: today
        })
    } catch (error) {
        console.error('Reservations dashboard error:', error)
        res.status(500).send('خطأ في تحميل الصفحة')
    }
})

// ==================== CALENDAR VIEW ====================
router.get('/calendar', async (req, res) => {
    try {
        const { month, year } = req.query
        const currentMonth = month ? parseInt(month) : moment().month() + 1
        const currentYear = year ? parseInt(year) : moment().year()

        // Get all available dates
        const availableDates = await AvailableDate.find({}).sort({ date: 1 })

        // Get all reservations for the month
        const reservations = await Reservation.find({ 
            phoneVerified: true,
            status: { $nin: ['cancelled'] }
        }).sort({ selectedDate: 1, selectedTime: 1 })

        res.render('admin/reservations/calendar', {
            user: req.user,
            page: 'reservations',
            availableDates,
            reservations,
            currentMonth,
            currentYear
        })
    } catch (error) {
        console.error('Calendar view error:', error)
        res.status(500).send('خطأ في تحميل التقويم')
    }
})

// ==================== ADD AVAILABLE DATE (Range) ====================
router.post('/dates/add-range', async (req, res) => {
    try {
        const { startDate, endDate, startTime, endTime, sessionDuration, excludeFridays } = req.body

        if (!startDate || !endDate || !startTime || !endTime) {
            return res.status(400).json({
                success: false,
                message: 'جميع الحقول مطلوبة'
            })
        }

        const duration = parseInt(sessionDuration) || 30
        const excludeFri = excludeFridays === 'true' || excludeFridays === true

        // Parse dates
        const start = moment(startDate, 'YYYY-MM-DD')
        const end = moment(endDate, 'YYYY-MM-DD')

        if (!start.isValid() || !end.isValid() || end.isBefore(start)) {
            return res.status(400).json({
                success: false,
                message: 'التواريخ غير صحيحة'
            })
        }

        // Generate time slots
        const timeSlots = generateTimeSlots(startTime, endTime, duration)

        if (timeSlots.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'أوقات البداية والنهاية غير صحيحة'
            })
        }

        const addedDates = []
        const skippedDates = []

        // Iterate through each day
        let current = start.clone()
        while (current.isSameOrBefore(end)) {
            // Skip Fridays if requested (Friday is day 5 in moment)
            if (excludeFri && current.day() === 5) {
                current.add(1, 'day')
                continue
            }

            const dateStr = current.format('DD/MM/YYYY')

            // Check if date already exists
            const existing = await AvailableDate.findOne({ date: dateStr })
            
            if (existing) {
                skippedDates.push(dateStr)
            } else {
                const newDate = new AvailableDate({
                    date: dateStr,
                    timeSlots: timeSlots,
                    startTime,
                    endTime,
                    sessionDuration: duration,
                    isAvailable: true
                })
                await newDate.save()
                addedDates.push(dateStr)
            }

            current.add(1, 'day')
        }

        res.json({
            success: true,
            message: `تم إضافة ${addedDates.length} تاريخ بنجاح`,
            addedDates,
            skippedDates
        })

    } catch (error) {
        console.error('Add date range error:', error)
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء إضافة التواريخ'
        })
    }
})

// ==================== ADD SINGLE AVAILABLE DATE ====================
router.post('/dates/add', async (req, res) => {
    try {
        const { date, startTime, endTime, sessionDuration, customSlots } = req.body

        if (!date) {
            return res.status(400).json({
                success: false,
                message: 'التاريخ مطلوب'
            })
        }

        // Check if date already exists
        const existing = await AvailableDate.findOne({ date })
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'هذا التاريخ موجود بالفعل'
            })
        }

        let timeSlots
        if (customSlots && Array.isArray(customSlots)) {
            timeSlots = customSlots
        } else {
            const duration = parseInt(sessionDuration) || 30
            timeSlots = generateTimeSlots(startTime || '15:00', endTime || '21:00', duration)
        }

        const newDate = new AvailableDate({
            date,
            timeSlots,
            startTime: startTime || '15:00',
            endTime: endTime || '21:00',
            sessionDuration: parseInt(sessionDuration) || 30,
            isAvailable: true
        })

        await newDate.save()

        res.json({
            success: true,
            message: 'تم إضافة التاريخ بنجاح',
            date: newDate
        })

    } catch (error) {
        console.error('Add date error:', error)
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء إضافة التاريخ'
        })
    }
})

// ==================== UPDATE AVAILABLE DATE ====================
router.put('/dates/:id', async (req, res) => {
    try {
        const { timeSlots, startTime, endTime, sessionDuration, isAvailable, notes } = req.body

        const dateDoc = await AvailableDate.findById(req.params.id)
        if (!dateDoc) {
            return res.status(404).json({
                success: false,
                message: 'التاريخ غير موجود'
            })
        }

        if (timeSlots) dateDoc.timeSlots = timeSlots
        if (startTime) dateDoc.startTime = startTime
        if (endTime) dateDoc.endTime = endTime
        if (sessionDuration) dateDoc.sessionDuration = parseInt(sessionDuration)
        if (typeof isAvailable === 'boolean') dateDoc.isAvailable = isAvailable
        if (notes !== undefined) dateDoc.notes = notes

        await dateDoc.save()

        res.json({
            success: true,
            message: 'تم تحديث التاريخ بنجاح',
            date: dateDoc
        })

    } catch (error) {
        console.error('Update date error:', error)
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء تحديث التاريخ'
        })
    }
})

// ==================== DELETE AVAILABLE DATE ====================
router.delete('/dates/:id', async (req, res) => {
    try {
        const dateDoc = await AvailableDate.findById(req.params.id)
        
        if (!dateDoc) {
            return res.status(404).json({
                success: false,
                message: 'التاريخ غير موجود'
            })
        }

        // Check if there are confirmed reservations for this date
        const reservations = await Reservation.countDocuments({
            selectedDate: dateDoc.date,
            status: { $in: ['confirmed', 'pending'] },
            phoneVerified: true
        })

        if (reservations > 0) {
            return res.status(400).json({
                success: false,
                message: `لا يمكن حذف هذا التاريخ، يوجد ${reservations} حجز مرتبط به`
            })
        }

        await AvailableDate.findByIdAndDelete(req.params.id)

        res.json({
            success: true,
            message: 'تم حذف التاريخ بنجاح'
        })

    } catch (error) {
        console.error('Delete date error:', error)
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء حذف التاريخ'
        })
    }
})

// ==================== TOGGLE DATE AVAILABILITY ====================
router.put('/dates/:id/toggle', async (req, res) => {
    try {
        const dateDoc = await AvailableDate.findById(req.params.id)
        
        if (!dateDoc) {
            return res.status(404).json({
                success: false,
                message: 'التاريخ غير موجود'
            })
        }

        dateDoc.isAvailable = !dateDoc.isAvailable
        await dateDoc.save()

        res.json({
            success: true,
            message: dateDoc.isAvailable ? 'تم تفعيل التاريخ' : 'تم تعطيل التاريخ',
            isAvailable: dateDoc.isAvailable
        })

    } catch (error) {
        console.error('Toggle date error:', error)
        res.status(500).json({
            success: false,
            message: 'حدث خطأ'
        })
    }
})

// ==================== ADD RESERVATION (Admin) ====================
router.post('/add', async (req, res) => {
    try {
        const { name, birthDate, gender, phone, type, selectedDate, selectedTime, notes, status } = req.body

        // Validate required fields
        if (!name || !birthDate || !gender || !phone || !type || !selectedDate || !selectedTime) {
            return res.status(400).json({
                success: false,
                message: 'جميع الحقول المطلوبة يجب ملؤها'
            })
        }

        // Check if slot is already booked
        const existingReservation = await Reservation.findOne({
            selectedDate,
            selectedTime,
            status: { $nin: ['cancelled'] },
            phoneVerified: true
        })

        if (existingReservation) {
            return res.status(400).json({
                success: false,
                message: 'هذا الموعد محجوز بالفعل'
            })
        }

        const reservation = new Reservation({
            name,
            birthDate,
            gender,
            phone,
            type,
            selectedDate,
            selectedTime,
            notes: notes || '',
            status: status || 'confirmed',
            phoneVerified: true, // Admin-added reservations are auto-verified
            source: 'admin'
        })

        await reservation.save()

        // Update booked slots
        const dateDoc = await AvailableDate.findOne({ date: selectedDate })
        if (dateDoc) {
            dateDoc.bookedSlots.push({
                time: selectedTime,
                reservationId: reservation._id
            })
            await dateDoc.save()
        }

        res.json({
            success: true,
            message: 'تم إضافة الحجز بنجاح',
            reservation
        })

    } catch (error) {
        console.error('Add reservation error:', error)
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء إضافة الحجز'
        })
    }
})

// ==================== UPDATE RESERVATION ====================
router.put('/:id', async (req, res) => {
    try {
        const { name, birthDate, gender, phone, type, selectedDate, selectedTime, notes, adminNotes, status } = req.body

        const reservation = await Reservation.findById(req.params.id)
        
        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'الحجز غير موجود'
            })
        }

        const oldDate = reservation.selectedDate
        const oldTime = reservation.selectedTime

        // Check if time slot changed and new slot is available
        if (selectedDate !== oldDate || selectedTime !== oldTime) {
            const existingReservation = await Reservation.findOne({
                selectedDate,
                selectedTime,
                status: { $nin: ['cancelled'] },
                phoneVerified: true,
                _id: { $ne: req.params.id }
            })

            if (existingReservation) {
                return res.status(400).json({
                    success: false,
                    message: 'الموعد الجديد محجوز بالفعل'
                })
            }

            // Release old slot
            const oldDateDoc = await AvailableDate.findOne({ date: oldDate })
            if (oldDateDoc) {
                oldDateDoc.bookedSlots = oldDateDoc.bookedSlots.filter(b => b.time !== oldTime)
                await oldDateDoc.save()
            }

            // Book new slot
            const newDateDoc = await AvailableDate.findOne({ date: selectedDate })
            if (newDateDoc) {
                newDateDoc.bookedSlots.push({
                    time: selectedTime,
                    reservationId: reservation._id
                })
                await newDateDoc.save()
            }
        }

        // Update fields
        if (name) reservation.name = name
        if (birthDate) reservation.birthDate = birthDate
        if (gender) reservation.gender = gender
        if (phone) reservation.phone = phone
        if (type) reservation.type = type
        if (selectedDate) reservation.selectedDate = selectedDate
        if (selectedTime) reservation.selectedTime = selectedTime
        if (notes !== undefined) reservation.notes = notes
        if (adminNotes !== undefined) reservation.adminNotes = adminNotes
        if (status) reservation.status = status

        await reservation.save()

        res.json({
            success: true,
            message: 'تم تحديث الحجز بنجاح',
            reservation
        })

    } catch (error) {
        console.error('Update reservation error:', error)
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء تحديث الحجز'
        })
    }
})

// ==================== UPDATE RESERVATION STATUS ====================
router.put('/:id/status', async (req, res) => {
    try {
        const { status } = req.body

        const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'no-show']
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'حالة غير صحيحة'
            })
        }

        const reservation = await Reservation.findById(req.params.id)
        
        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'الحجز غير موجود'
            })
        }

        const oldStatus = reservation.status
        reservation.status = status
        await reservation.save()

        // If cancelled, release the time slot
        if (status === 'cancelled' && oldStatus !== 'cancelled') {
            const dateDoc = await AvailableDate.findOne({ date: reservation.selectedDate })
            if (dateDoc) {
                dateDoc.bookedSlots = dateDoc.bookedSlots.filter(b => b.time !== reservation.selectedTime)
                await dateDoc.save()
            }
        }

        res.json({
            success: true,
            message: 'تم تحديث حالة الحجز',
            status: reservation.status
        })

    } catch (error) {
        console.error('Update status error:', error)
        res.status(500).json({
            success: false,
            message: 'حدث خطأ'
        })
    }
})

// ==================== DELETE RESERVATION ====================
router.delete('/:id', async (req, res) => {
    try {
        const reservation = await Reservation.findById(req.params.id)
        
        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'الحجز غير موجود'
            })
        }

        // Release the time slot
        const dateDoc = await AvailableDate.findOne({ date: reservation.selectedDate })
        if (dateDoc) {
            dateDoc.bookedSlots = dateDoc.bookedSlots.filter(b => b.time !== reservation.selectedTime)
            await dateDoc.save()
        }

        await Reservation.findByIdAndDelete(req.params.id)

        res.json({
            success: true,
            message: 'تم حذف الحجز بنجاح'
        })

    } catch (error) {
        console.error('Delete reservation error:', error)
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء حذف الحجز'
        })
    }
})

// ==================== GET RESERVATION DETAILS ====================
router.get('/:id', async (req, res) => {
    try {
        const reservation = await Reservation.findById(req.params.id)
        
        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'الحجز غير موجود'
            })
        }

        res.json({
            success: true,
            reservation
        })

    } catch (error) {
        console.error('Get reservation error:', error)
        res.status(500).json({
            success: false,
            message: 'حدث خطأ'
        })
    }
})

// ==================== FILTER RESERVATIONS ====================
router.get('/filter/search', async (req, res) => {
    try {
        const { status, date, startDate, endDate, phone, name, type } = req.query

        const query = { phoneVerified: true }

        if (status && status !== 'all') query.status = status
        if (type && type !== 'all') query.type = type
        if (date) query.selectedDate = date
        if (phone) query.phone = { $regex: phone, $options: 'i' }
        if (name) query.name = { $regex: name, $options: 'i' }

        // Date range filter
        if (startDate && endDate) {
            // This requires parsing dates properly - simplified for now
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        }

        const reservations = await Reservation.find(query)
            .sort({ selectedDate: -1, selectedTime: -1 })
            .limit(100)

        res.json({
            success: true,
            count: reservations.length,
            reservations
        })

    } catch (error) {
        console.error('Filter reservations error:', error)
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في البحث'
        })
    }
})

// ==================== GET ALL DATES ====================
router.get('/dates/all', async (req, res) => {
    try {
        const dates = await AvailableDate.find({}).sort({ date: 1 })
        
        res.json({
            success: true,
            dates
        })

    } catch (error) {
        console.error('Get dates error:', error)
        res.status(500).json({
            success: false,
            message: 'حدث خطأ'
        })
    }
})

// ==================== HELPER FUNCTION: Generate Time Slots ====================
function generateTimeSlots(startTime, endTime, durationMinutes = 30) {
    const slots = []
    
    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)
    
    let currentHour = startHour
    let currentMin = startMin

    while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
        // Format time as HH:MM with AM/PM in Arabic
        const hour12 = currentHour > 12 ? currentHour - 12 : currentHour === 0 ? 12 : currentHour
        const ampm = currentHour >= 12 ? 'م' : 'ص'
        const timeStr = `${hour12}:${currentMin.toString().padStart(2, '0')} ${ampm}`
        
        slots.push(timeStr)

        // Add duration
        currentMin += durationMinutes
        if (currentMin >= 60) {
            currentHour += Math.floor(currentMin / 60)
            currentMin = currentMin % 60
        }
    }

    return slots
}

module.exports = router
