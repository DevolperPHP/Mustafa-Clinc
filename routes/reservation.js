const express = require('express')
const router = express.Router()
const Reservation = require('../models/Reservation')
const AvailableDate = require('../models/AvailableDate')
const otpService = require('../services/otpService')

// ==================== STEP 1: Send OTP ====================
router.post('/send-otp', async (req, res) => {
    try {
        const { phone, name, birthDate, gender, type, selectedDate, selectedTime, notes } = req.body

        // Validate required fields
        if (!phone || !name || !birthDate || !gender || !type || !selectedDate || !selectedTime) {
            return res.status(400).json({
                success: false,
                message: 'جميع الحقول المطلوبة يجب ملؤها'
            })
        }

        // Check if the time slot is still available
        const dateDoc = await AvailableDate.findOne({ date: selectedDate, isAvailable: true })
        if (!dateDoc) {
            return res.status(400).json({
                success: false,
                message: 'التاريخ المحدد غير متاح'
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
                message: 'هذا الموعد محجوز بالفعل. يرجى اختيار موعد آخر.'
            })
        }

        // Check for existing pending reservation with same phone for rate limiting
        const pendingReservation = await Reservation.findOne({
            phone,
            phoneVerified: false,
            otpExpiry: { $gt: new Date() }
        })

        if (pendingReservation) {
            const resendCheck = otpService.canResendOTP(pendingReservation.createdAt)
            if (!resendCheck.allowed) {
                return res.status(429).json({
                    success: false,
                    message: `يرجى الانتظار ${resendCheck.remainingSeconds} ثانية قبل إعادة إرسال الرمز`,
                    remainingSeconds: resendCheck.remainingSeconds
                })
            }
        }

        // Send OTP
        const otpResult = await otpService.sendOTP(phone)

        if (!otpResult.success) {
            return res.status(500).json({
                success: false,
                message: otpResult.error || 'فشل في إرسال رمز التحقق'
            })
        }

        // Create or update reservation with pending status
        let reservation
        if (pendingReservation) {
            // Update existing pending reservation
            pendingReservation.name = name
            pendingReservation.birthDate = birthDate
            pendingReservation.gender = gender
            pendingReservation.type = type
            pendingReservation.selectedDate = selectedDate
            pendingReservation.selectedTime = selectedTime
            pendingReservation.notes = notes || ''
            pendingReservation.otpCode = otpResult.code
            pendingReservation.otpExpiry = otpResult.expiresAt
            pendingReservation.otpAttempts = 0
            await pendingReservation.save()
            reservation = pendingReservation
        } else {
            // Create new reservation
            reservation = new Reservation({
                name,
                birthDate,
                gender,
                phone,
                type,
                selectedDate,
                selectedTime,
                notes: notes || '',
                otpCode: otpResult.code,
                otpExpiry: otpResult.expiresAt,
                phoneVerified: false,
                status: 'pending',
                source: 'online'
            })
            await reservation.save()
        }

        res.json({
            success: true,
            message: 'تم إرسال رمز التحقق إلى رقم الهاتف',
            reservationId: reservation._id,
            expiresIn: otpService.OTP_CONFIG.expiryMinutes * 60 // in seconds
        })

    } catch (error) {
        console.error('Send OTP error:', error)
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء إرسال رمز التحقق'
        })
    }
})

// ==================== STEP 2: Verify OTP & Complete Reservation ====================
router.post('/verify-otp', async (req, res) => {
    try {
        const { reservationId, otpCode } = req.body

        if (!reservationId || !otpCode) {
            return res.status(400).json({
                success: false,
                message: 'معرف الحجز ورمز التحقق مطلوبان'
            })
        }

        const reservation = await Reservation.findById(reservationId)

        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'الحجز غير موجود'
            })
        }

        if (reservation.phoneVerified) {
            return res.status(400).json({
                success: false,
                message: 'تم التحقق من هذا الحجز مسبقاً'
            })
        }

        // Verify OTP
        const verifyResult = otpService.verifyOTP(
            otpCode,
            reservation.otpCode,
            reservation.otpExpiry,
            reservation.otpAttempts
        )

        if (!verifyResult.valid) {
            // Increment attempts
            reservation.otpAttempts += 1
            await reservation.save()

            if (verifyResult.maxAttemptsReached) {
                // Delete the reservation if max attempts reached
                await Reservation.findByIdAndDelete(reservationId)
            }

            return res.status(400).json({
                success: false,
                message: verifyResult.error,
                expired: verifyResult.expired,
                maxAttemptsReached: verifyResult.maxAttemptsReached,
                attemptsRemaining: otpService.OTP_CONFIG.maxAttempts - reservation.otpAttempts
            })
        }

        // Check again if slot is still available (race condition protection)
        const existingReservation = await Reservation.findOne({
            selectedDate: reservation.selectedDate,
            selectedTime: reservation.selectedTime,
            status: { $nin: ['cancelled'] },
            phoneVerified: true,
            _id: { $ne: reservation._id }
        })

        if (existingReservation) {
            await Reservation.findByIdAndDelete(reservationId)
            return res.status(400).json({
                success: false,
                message: 'عذراً، تم حجز هذا الموعد للتو من شخص آخر. يرجى اختيار موعد آخر.'
            })
        }

        // Mark as verified and confirmed
        reservation.phoneVerified = true
        reservation.otpVerifiedAt = new Date()
        reservation.status = 'confirmed'
        reservation.otpCode = null // Clear OTP for security
        await reservation.save()

        // Update booked slots in AvailableDate
        const dateDoc = await AvailableDate.findOne({ date: reservation.selectedDate })
        if (dateDoc) {
            dateDoc.bookedSlots.push({
                time: reservation.selectedTime,
                reservationId: reservation._id
            })
            await dateDoc.save()
        }

        res.json({
            success: true,
            message: 'تم تأكيد الحجز بنجاح! سنتواصل معك قريباً.',
            reservation: {
                id: reservation._id,
                name: reservation.name,
                date: reservation.selectedDate,
                time: reservation.selectedTime,
                type: reservation.type
            }
        })

    } catch (error) {
        console.error('Verify OTP error:', error)
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء التحقق من الرمز'
        })
    }
})

// ==================== STEP 3: Resend OTP ====================
router.post('/resend-otp', async (req, res) => {
    try {
        const { reservationId } = req.body

        if (!reservationId) {
            return res.status(400).json({
                success: false,
                message: 'معرف الحجز مطلوب'
            })
        }

        const reservation = await Reservation.findById(reservationId)

        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'الحجز غير موجود'
            })
        }

        if (reservation.phoneVerified) {
            return res.status(400).json({
                success: false,
                message: 'تم التحقق من هذا الحجز مسبقاً'
            })
        }

        // Check cooldown
        const resendCheck = otpService.canResendOTP(reservation.updatedAt)
        if (!resendCheck.allowed) {
            return res.status(429).json({
                success: false,
                message: `يرجى الانتظار ${resendCheck.remainingSeconds} ثانية`,
                remainingSeconds: resendCheck.remainingSeconds
            })
        }

        // Send new OTP
        const otpResult = await otpService.sendOTP(reservation.phone)

        if (!otpResult.success) {
            return res.status(500).json({
                success: false,
                message: otpResult.error || 'فشل في إرسال رمز التحقق'
            })
        }

        // Update reservation with new OTP
        reservation.otpCode = otpResult.code
        reservation.otpExpiry = otpResult.expiresAt
        reservation.otpAttempts = 0
        await reservation.save()

        res.json({
            success: true,
            message: 'تم إرسال رمز تحقق جديد',
            expiresIn: otpService.OTP_CONFIG.expiryMinutes * 60
        })

    } catch (error) {
        console.error('Resend OTP error:', error)
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء إعادة إرسال الرمز'
        })
    }
})

// ==================== Get Available Time Slots ====================
router.get('/available-slots', async (req, res) => {
    try {
        const { date } = req.query

        if (!date) {
            return res.json({
                success: false,
                message: 'التاريخ مطلوب',
                slots: []
            })
        }

        const dateDoc = await AvailableDate.findOne({ date, isAvailable: true })

        if (!dateDoc) {
            return res.json({
                success: false,
                message: 'هذا التاريخ غير متاح',
                slots: []
            })
        }

        // Get booked slots from confirmed reservations
        const bookedReservations = await Reservation.find({
            selectedDate: date,
            status: { $nin: ['cancelled'] },
            phoneVerified: true
        }).select('selectedTime')

        const bookedTimes = bookedReservations.map(r => r.selectedTime)
        const bookedFromDate = dateDoc.bookedSlots.map(b => b.time)
        const allBooked = [...new Set([...bookedTimes, ...bookedFromDate])]

        // Filter available slots
        const availableSlots = dateDoc.timeSlots.filter(slot => !allBooked.includes(slot))

        res.json({
            success: true,
            date: date,
            slots: availableSlots,
            totalSlots: dateDoc.timeSlots.length,
            bookedCount: allBooked.length
        })

    } catch (error) {
        console.error('Get available slots error:', error)
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في جلب المواعيد المتاحة'
        })
    }
})

// ==================== Check Reservation Status ====================
router.get('/status/:id', async (req, res) => {
    try {
        const reservation = await Reservation.findById(req.params.id)
            .select('name selectedDate selectedTime type status phoneVerified')

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
        console.error('Get reservation status error:', error)
        res.status(500).json({
            success: false,
            message: 'حدث خطأ في جلب حالة الحجز'
        })
    }
})

module.exports = router
