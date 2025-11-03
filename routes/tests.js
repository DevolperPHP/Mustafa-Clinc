const express = require('express')
const router = express.Router()
const isAdminMiddleWare = require('../middlewares/isAdmin')
const Tests = require('../models/Tests')

router.use(isAdminMiddleWare)

router.get('/', async (req, res) => {
    try {
        const data = await Tests.find({}).sort({ Date: -1 })
        res.render('admin/tests/tests', {
            user: req.user,
            data,
            suc: req.flash('success'),
            err: req.flash('err')
        })
    } catch (err) {
        console.log(err);
    }
})

router.post('/add', async (req, res) => {
    try {
        const filter = await Tests.findOne({ name: req.body.name })
        console.log(filter);

        if (filter) {
            req.flash('err', 'هذا الاختبار مدخل مسبفا')
        } else {
            new Tests({
                name: req.body.name
            }).save()
        }

        res.redirect("/tests")
    } catch (err) {
        console.log(err);

    }
})

router.delete("/delete/:id", async (req, res) => {
    try {
        await Tests.deleteOne({ _id: req.params.id })
        req.flash('success', 'تم حذف الاختبار بنجاح')
        res.redirect('/tests')
    } catch (err) {
        console.log(err);

    }
})

router.get('/edit/:id', async (req, res) => {
    try {
        const data = await Tests.findOne({ _id: req.params.id })
        res.render('admin/tests/edit', {
            user: req.user,
            data
        })
    } catch (err) {
        console.log(err);
    }
})

router.put('/edit/:id', async (req, res) => {
    try {
        const filter = await Tests.findOne({ name: req.body.name })
        if (filter) {
            req.flash('err', 'هذا الاختبار مدخل مسبفا')
        } else {
            await Tests.updateOne({ _id: req.params.id }, {
                $set: {
                    name: req.body.name
                }
            })

            req.flash('success', 'تم تعديل الاختبار بنجاح')
        }

        res.redirect('/tests')
    } catch (err) {
        console.log(err);

    }
})


module.exports = router