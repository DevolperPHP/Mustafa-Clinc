const express = require('express')
const router = express.Router()
const isAdminMiddleWare = require('../middlewares/isAdmin')

router.use(isAdminMiddleWare)

router.get('/dashboard', async (req, res) => {
    res.render('admin/dashboard/dashboard', {
        user: req.user
    })
})



module.exports = router