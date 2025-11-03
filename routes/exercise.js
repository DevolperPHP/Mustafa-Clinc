const express = require('express')
const router = express.Router()
const moment = require('moment')
const isAdminMiddleWare = require('../middlewares/isAdmin')
const Exercise = require('../models/Exercise')

router.use(isAdminMiddleWare)

router.get('/', async (req, res) => {
    try {
        const data = await Exercise.find({})
        res.render('admin/exercise/exercise', {
            user: req.user,
            data,
            suc: req.flash('suc'),
        })
    } catch (err) {
        console.log(err);
    }
})

router.post('/add', async (req, res) => {
    try {
        const name = req.body.name
        new Exercise({
            name,
            Date: moment().locale('ar-kw').format('l')
        }).save()
        req.flash('suc', 'تم اضافة التمرين بنجاح')
        res.redirect('/exercise')
    } catch (err) {
        console.log(err);
    }
})

router.delete('/delete/:id', async (req, res) => {
    try {
        await Exercise.deleteOne({ _id: req.params.id })
        req.flash('suc', 'تم حذف التمرين بنجاح')
        res.redirect('/exercise')
    } catch (err) {
        console.log(err);
    }
})

module.exports = router