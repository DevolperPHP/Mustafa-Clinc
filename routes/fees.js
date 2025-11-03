const express = require('express')
const router = express.Router()
const isAdminMiddleWare = require('../middlewares/isAdmin')
const Fees = require('../models/Fees')
const moment = require('moment')

router.use(isAdminMiddleWare)

router.get('/', async (req, res) => {
    try {
        let nowDate = moment().locale('ar-kw').format('l');
        const fees = await Fees.find({ Date: nowDate });
        const allFees = await Fees.find({});
        const names = [...new Set(allFees.map(x => x.name))];
        const total = fees.reduce((sum, fee) => sum + fee.price, 0)
        res.render('admin/fees/fees', {
            user: req.user,
            showForm: true,
            fees,
            names,
            nowDate,
            suc: req.flash('suc'),
            total
        });
    } catch (err) {
        console.log(err);
    }
});

router.get('/filter/name/:name', async (req, res) => {
    try {
        let nowDate = req.params.name
        const fees = await Fees.find({ name: req.params.name });
        const allFees = await Fees.find({});
        const names = [...new Set(allFees.map(x => x.name))];
        const total = fees.reduce((sum, fee) => sum + fee.price, 0)
        res.render('admin/fees/fees', {
            user: req.user,
            showForm: false,
            fees,
            names,
            nowDate,
            suc: req.flash('suc'),
            total
        });
    } catch (err) {
        console.log(err);
    }
});

router.get('/filter/date/:date', async (req, res) => {
    try {
        let searchDate = moment(req.params.date, 'YYYY-MM-DD').locale('ar-kw').format('l');
        let nowDate = searchDate
        const fees = await Fees.find({ Date: searchDate });
        const allFees = await Fees.find({});
        const names = [...new Set(allFees.map(x => x.name))];
        var total = 0
        if (fees.length > 0) {
            total = fees.map(x => x.price).reduce((a, b) => a + b)
        }
        res.render('admin/fees/fees', {
            user: req.user,
            showForm: false,
            fees,
            names,
            nowDate,
            suc: req.flash('suc'),
            total
        });
    } catch (err) {
        console.log(err);
    }
});

router.post('/new', async (req, res) => {
    try {
        let { name, price, Date } = req.body

        if (!Date) {
            Date = moment().locale('ar-kw').format('l')
        } else {
            Date = moment(Date, 'YYYY-MM-DD').locale('ar-kw').format('l');
        }

        await new Fees({
            name,
            price,
            Date
        }).save()

        req.flash('suc', `تمت العملية بنجاح`)
        res.redirect('/fees')
    } catch (err) {
        console.log(err);
    }
})

router.delete('/delete/:id', async (req, res) => {
    try {
        await Fees.deleteOne({ _id: req.params.id })
        req.flash('suc', 'تم الحذف بنجاح')
        res.redirect('/fees')
    } catch (err) {
        console.log(err);
    }
})


module.exports = router