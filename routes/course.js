const express = require('express')
const router = express.Router()
const isAdminMiddleWare = require('../middlewares/isAdmin')
const Course = require('../models/Course')

router.use(isAdminMiddleWare)

router.get('/', async (req, res) => {
    try {
        const data = await Course.find({})
        res.render('admin/course/courses', {
            user: req.user,
            suc: req.flash('success'),
            data,
            err: req.flash('err'),
        })
    } catch (err) {
        console.log(err);
    }
})

router.post('/add', async (req, res) => {
    try {
        const { sessions, price } = req.body
        const filter = await Course.findOne({ sessions })
        if (filter) {
            req.flash('err', 'الكورس مضاف مسبقا')
        } else {
            new Course({
                sessions,
                price
            }).save()
            req.flash('success', 'تم اضافة الكورس بنجاح')
        }
        res.redirect('/course')
    } catch (err) {
        console.log(err);
    }
})

router.delete('/delete/:id', async (req, res) => {
    try {
        await Course.deleteOne({ _id: req.params.id })
        req.flash('success', 'تم حذف الكورس بنجاح')
        res.redirect('/course')
    } catch (err) {
        console.log(err);
    }
})

router.get('/edit/:id', async (req, res) => {
    try {
        const data = await Course.findOne({ _id: req.params.id })
        res.render('admin/course/edit', {
            user: req.user,
            data
        })
    } catch (err) {
        console.log(err);

    }
})

router.put('/edit/:id', async (req, res) => {
    try {
        const { sessions, price } = req.body
        const filter = await Course.findOne({ sessions, price })
        if (filter) {
            req.flash('err', 'الكورس مضاف مسبقا')
        } else {
            await Course.updateOne({ _id: req.params.id }, {
                $set: {
                    sessions, price
                }
            })
            req.flash('success', 'تم تعديل الكورس بنجاح')
        }

        res.redirect('/course')
    } catch (err) {
        console.log(err);

    }
})

module.exports = router