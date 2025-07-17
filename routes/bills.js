const express = require('express')
const router = express.Router()
const isAdminMiddleWare = require('../middlewares/isAdmin')
const Patient = require('../models/Patient')
const moment = require('moment')
const User = require('../models/User')

router.use(isAdminMiddleWare)

router.get('/', async (req, res) => {
    try {
        const patients = await Patient.find({}).sort({ balance: 1 })
        const negativeBalances = patients.filter(x => x.balance < 0)
        var negativeBalance = 0
            if(negativeBalances.length > 0){
                negativeBalance = negativeBalances.map(x => x.balance).reduce((a, b) => a - b)
            }

        res.render('admin/bills/users', {
            user: req.user,
            patients,
            negativeBalance
        })
    } catch (err) {
        console.log(err);

    }
})

router.get('/get/:id', async (req, res) => {
    try {
        const data = await Patient.findOne({ _id: req.params.id })
        const notPaid = data.bills.filter((x) => x.paid == false)
        const paid = data.bills.filter((x) => x.paid == true)

        res.render('admin/bills/getUser', {
            user: req.user,
            data,
            notPaid,
            paid,
            suc: req.flash('suc'),
        })
    } catch (err) {
        console.log(err);
    }
})

router.get('/pay/:id/:code', async (req, res) => {
    try {
        const data = await Patient.findOne({ _id: req.params.id })
        const course = data.course.find((x) => x.code == Number(req.params.code))

        res.render('admin/bills/pay', {
            user: req.user,
            course,
            data
        })
    } catch (err) {
        console.log(err);
    }
})

router.put('/pay/:id/:code', async (req, res) => {
    try {
        const amount = Number(req.body.amount)
        const data = await Patient.findOne({ _id: req.params.id })
        const bill = data.bills.find((x) => x.code == Number(req.params.code))
        if ((amount + bill.left) == 0) {
            await Patient.updateOne({ _id: req.params.id, 'bills.code': Number(req.params.code) }, {
                $set: {
                    'bills.$.paid': true,
                    'bills.$.left': amount + bill.left,
                    balance: data.balance + amount,
                },

                $push: {
                    purchase: {
                        amount: amount,
                        course: bill.sessions,
                        code: bill.code,
                        courseDate: bill.Date,
                        payDate: moment().locale('ar-kw').format('l')
                    }
                }
            })
        } else {
            await Patient.updateOne({ _id: req.params.id, 'bills.code': Number(req.params.code) }, {
                $set: {
                    'bills.$.left': amount + bill.left,
                    balance: data.balance + amount,
                },

                $push: {
                    purchase: {
                        amount: amount,
                        course: bill.sessions,
                        code: bill.code,
                        courseDate: bill.Date,
                        payDate: moment().locale('ar-kw').format('l')
                    }
                }
            })
        }

        await User.updateOne({ _id: req.user.id }, {
            $set: {
                balance: req.user.balance + amount,
            },

            $push: {
                sells: {
                    patient: data.name,
                    amount: amount,
                    course: bill.sessions,
                    code: bill.code,
                    courseDate: bill.Date,
                    payDate: moment().locale('ar-kw').format('l')
                }
            }
        })
        req.flash('suc', `تم دفع مبلغ ${amount} بنجاح`)
        res.redirect(`/bills/get/${req.params.id}`)

    } catch (err) {
        console.log(err);
    }
})
module.exports = router