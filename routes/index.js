const express = require('express')
const router = express.Router()
const isAdminMiddleWare = require('../middlewares/isAdmin')
const moment = require('moment')
const Patient = require('../models/Patient')

router.use(isAdminMiddleWare)

// Helper function to parse Arabic date format
function parseArabicDate(arabicDate) {
  // Arabic date format is like: 15/01/2026 (DD/MM/YYYY)
  const parts = arabicDate.split('/')
  if (parts.length === 3) {
    return new Date(parts[2], parts[1] - 1, parts[0])
  }
  return null
}

// Calculate real statistics from database
async function getDashboardStats() {
  const today = moment().locale('ar-kw').format('l')
  const todayDate = parseArabicDate(today)

  const startOfMonth = moment().startOf('month').toDate()
  const endOfMonth = moment().endOf('month').toDate()

  // Get all patients
  const allPatients = await Patient.find({})

  // Total patients
  const totalPatients = allPatients.length

  // New patients this month
  const newThisMonth = allPatients.filter(p => {
    const dateAdded = parseArabicDate(p.dateAdded)
    return dateAdded && dateAdded >= startOfMonth && dateAdded <= endOfMonth
  }).length

  // Calculate today's sessions and completed sessions
  let todaySessions = 0
  let completedSessions = 0

  allPatients.forEach(patient => {
    if (patient.course && patient.course.length > 0) {
      patient.course.forEach(course => {
        if (course.sessions) {
          Object.values(course.sessions).forEach(session => {
            if (session.Date === today) {
              todaySessions++
              if (session.Done) {
                completedSessions++
              }
            }
          })
        }
      })
    }
  })

  // Calculate today's revenue (from purchases)
  let todayRevenue = 0
  allPatients.forEach(patient => {
    if (patient.purchase && patient.purchase.length > 0) {
      patient.purchase.forEach(purchase => {
        if (purchase.Date === today) {
          todayRevenue += purchase.amount || 0
        }
      })
    }
  })

  // Get yesterday's revenue for comparison
  const yesterday = moment().subtract(1, 'day').locale('ar-kw').format('l')
  let yesterdayRevenue = 0
  allPatients.forEach(patient => {
    if (patient.purchase && patient.purchase.length > 0) {
      patient.purchase.forEach(purchase => {
        if (purchase.Date === yesterday) {
          yesterdayRevenue += purchase.amount || 0
        }
      })
    }
  })

  // Calculate revenue growth
  let revenueGrowth = 0
  if (yesterdayRevenue > 0) {
    revenueGrowth = Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
  } else if (todayRevenue > 0) {
    revenueGrowth = 100
  }

  // Calculate pending payments (negative balance patients)
  let pendingPayments = 0
  let totalOverdue = 0
  allPatients.forEach(patient => {
    if (patient.balance < 0) {
      pendingPayments++
      totalOverdue += Math.abs(patient.balance)
    }
  })

  // Count active patients (in course)
  const activePatients = allPatients.filter(p => p.inCourse === true).length

  // Count patients by status
  const openAccounts = allPatients.filter(p => p.status === 'open').length
  const closedAccounts = allPatients.filter(p => p.status === 'close').length

  // Gender distribution
  const malePatients = allPatients.filter(p => p.gender === 'ذكر').length
  const femalePatients = allPatients.filter(p => p.gender === 'أنثى').length

  return {
    totalPatients,
    newThisMonth,
    todaySessions,
    completedSessions,
    todayRevenue,
    revenueGrowth,
    pendingPayments,
    overdueAmount: totalOverdue,
    activePatients,
    openAccounts,
    closedAccounts,
    malePatients,
    femalePatients,
    yesterdayRevenue
  }
}

// Get today's scheduled patients
async function getTodayPatients() {
  const today = moment().locale('ar-kw').format('l')
  const allPatients = await Patient.find({})

  const todayPatients = []

  allPatients.forEach(patient => {
    if (patient.course && patient.course.length > 0) {
      // Find active course
      const activeCourse = patient.course.find(c => !c.end)

      if (activeCourse && activeCourse.sessions) {
        // Find today's session
        let todaySession = null
        let sessionNumber = 0

        Object.entries(activeCourse.sessions).forEach(([key, session]) => {
          if (session.Date === today) {
            todaySession = session
            sessionNumber = session.session
          }
        })

        if (todaySession) {
          todayPatients.push({
            _id: patient._id,
            name: patient.name,
            currentSession: sessionNumber,
            sessionTime: 'محدد', // Could be enhanced with actual time
            status: todaySession.Done ? 'مكتمل' : 'قادم',
            courseCode: activeCourse.code
          })
        }
      }
    }
  })

  // Sort by session number
  return todayPatients.sort((a, b) => a.currentSession - b.currentSession)
}

// Use the NEW simplified dashboard with real data
router.get('/dashboard', async (req, res) => {
  try {
    // Get real statistics
    const stats = await getDashboardStats()

    // Get today's patients
    const todayPatients = await getTodayPatients()

    // Get recent patients (last 5 registered)
    const recentPatients = await Patient.find({})
      .sort({ _id: -1 })
      .limit(5)

    // Get patients with overdue payments
    const overduePatients = await Patient.find({ balance: { $lt: 0 } })
      .sort({ balance: 1 })
      .limit(5)

    res.render('admin/dashboard/dashboard-new', {
      user: req.user,
      date: moment().locale('ar-kw').format('ll'),
      today: moment().locale('ar-kw').format('YYYY-MM-DD'),
      stats,
      todayPatients,
      recentPatients,
      overduePatients
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    res.status(500).send('خطأ في تحميل البيانات')
  }
})

// API endpoint for dashboard stats (for AJAX updates)
router.get('/api/dashboard/stats', async (req, res) => {
  try {
    const stats = await getDashboardStats()
    const todayPatients = await getTodayPatients()

    res.json({
      success: true,
      stats,
      todayPatients,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard stats'
    })
  }
})

module.exports = router
