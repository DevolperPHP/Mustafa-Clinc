const express = require('express')
const router = express.Router()
const isAdminMiddleWare = require('../middlewares/isAdmin')
const moment = require('moment')

router.use(isAdminMiddleWare)

router.get('/dashboard', async (req, res) => {
    res.render('admin/dashboard/dashboard', {
        user: req.user,
        date: moment().locale('ar-kw').format('YYYY-MM-DD')
    })
})



module.exports = router