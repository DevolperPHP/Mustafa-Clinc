const express = require('express')
const router = express.Router()
const isAdminMiddleWare = require('../middlewares/isAdmin')
const Patient = require('../models/Patient')
const moment = require('moment')
const User = require('../models/User')
const { createCanvas } = require('canvas');

router.use(isAdminMiddleWare)

router.get('/', async (req, res) => {
    try {
        const patients = await Patient.find({}).sort({ balance: 1 })
        const negativeBalances = patients.filter(x => x.balance < 0)
        var negativeBalance = 0
        if (negativeBalances.length > 0) {
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
        const purchases = data.purchase.sort((a, b) => {
            const [dayA, monthA, yearA] = a.payDate.split('/').map(Number);
            const [dayB, monthB, yearB] = b.payDate.split('/').map(Number);

            const dateA = new Date(yearA, monthA - 1, dayA);
            const dateB = new Date(yearB, monthB - 1, dayB);

            return dateB - dateA;
        });

        res.render('admin/bills/getUser', {
            user: req.user,
            purchases,
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

// Apply discount to a bill
router.post('/apply-discount/:id/:code', async (req, res) => {
    try {
        const { discountType, discountValue } = req.body;
        const patientId = req.params.id;
        const billCode = Number(req.params.code);

        const data = await Patient.findOne({ _id: patientId });
        const bill = data.bills.find((x) => x.code === billCode);

        if (!bill) {
            req.flash('error', 'الفاتورة غير موجودة');
            return res.redirect(`/bills/get/${patientId}`);
        }

        if (bill.paid) {
            req.flash('error', 'لا يمكن تطبيق خصم على فاتورة مدفوعة');
            return res.redirect(`/bills/get/${patientId}`);
        }

        // Calculate discount amount
        let discountAmount = 0;
        if (discountType === 'percentage') {
            discountAmount = (bill.price * Number(discountValue)) / 100;
        } else if (discountType === 'fixed') {
            discountAmount = Number(discountValue);
        }

        // Update bill with discount information
        // When applying discount, reduce both price and left (remaining amount)
        await Patient.updateOne(
            { _id: patientId, 'bills.code': billCode },
            {
                $set: {
                    balance: data.balance - Number(-discountValue),
                    'bills.$.discountType': discountType,
                    'bills.$.discountValue': Number(-discountValue),
                    'bills.$.discountAmount': discountAmount,
                    'bills.$.originalPrice': bill.price,
                    'bills.$.price': bill.price - discountAmount,
                    'bills.$.left': bill.left - (-discountAmount),
                }
            }
        );

        // Add to discount history
        await Patient.updateOne(
            { _id: patientId },
            {
                $push: {
                    discounts: {
                        billCode: billCode,
                        discountType: discountType,
                        discountValue: Number(discountValue),
                        discountAmount: discountAmount,
                        originalPrice: bill.price,
                        discountedPrice: bill.price - discountAmount,
                        date: moment().locale('ar-kw').format('l'),
                        appliedBy: req.user.username
                    }
                }
            }
        );

        req.flash('suc', `تم تطبيق خصم بقيمة ${discountAmount.toLocaleString()} بنجاح`);
        res.redirect(`/bills/get/${patientId}`);
    } catch (err) {
        console.error(err);
        req.flash('error', 'حدث خطأ أثناء تطبيق الخصم');
        res.redirect(`/bills/get/${req.params.id}`);
    }
});

// Remove discount from a bill
router.post('/remove-discount/:id/:code', async (req, res) => {
    try {
        const patientId = req.params.id;
        const billCode = Number(req.params.code);

        const data = await Patient.findOne({ _id: patientId });
        const bill = data.bills.find((x) => x.code === billCode);

        if (!bill) {
            req.flash('error', 'الفاتورة غير موجودة');
            return res.redirect(`/bills/get/${patientId}`);
        }

        if (bill.paid) {
            req.flash('error', 'لا يمكن إلغاء خصم من فاتورة مدفوعة');
            return res.redirect(`/bills/get/${patientId}`);
        }

        // Restore original price
        // Inverse of apply discount: get the balance back and left amount back
        const discountValue = Math.abs(Number(bill.discountValue));

        await Patient.updateOne(
            { _id: patientId, 'bills.code': billCode },
            {
                $set: {
                    'bills.$.price': bill.originalPrice,
                    'bills.$.left': bill.left - discountValue,
                    balance: data.balance - discountValue,
                },
                $unset: {
                    'bills.$.discountType': '',
                    'bills.$.discountValue': '',
                    'bills.$.discountAmount': '',
                    'bills.$.originalPrice': '',
                }
            }
        );

        // Remove from discount history
        await Patient.updateOne(
            { _id: patientId },
            {
                $pull: {
                    discounts: {
                        billCode: billCode
                    }
                }
            }
        );

        req.flash('suc', 'تم إلغاء الخصم بنجاح');
        res.redirect(`/bills/get/${patientId}`);
    } catch (err) {
        console.error(err);
        req.flash('error', 'حدث خطأ أثناء إلغاء الخصم');
        res.redirect(`/bills/get/${req.params.id}`);
    }
});

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


        req.flash('suc', `
            تم دفع مبلغ ${amount} بنجاح
            اسم المستفيد : ${data.name}
            تاريخ الدفع: ${moment().locale('ar-kw').format('l')}
            تاريخ تسجيل الكورس : ${bill.Date},
            عدد الجلسات : ${bill.sessions}
            المبلغ المتبقي : ${data.balance + amount}
            `)
        res.redirect(`/bills/get/${req.params.id}`)

    } catch (err) {
        console.log(err);
    }
})

router.get('/download/:code', async (req, res) => {
    try {
        const patient = await Patient.findOne(
            { 'purchase.code': Number(req.params.code) },
            { 'purchase.$': 1, name: 1, balance: 1 }
        );

        if (!patient) return res.status(404).send('Bill not found');

        const bill = patient.purchase[0];

        // Check if this bill had a discount
        const patientFull = await Patient.findOne({ _id: patient._id });
        const discountInfo = patientFull.discounts.find(d => d.billCode === bill.code);

        // High resolution canvas
        const width = 1600;   // doubled
        const height = 1200;  // doubled
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, width, height);

        // Text settings
        ctx.fillStyle = '#000';
        ctx.textAlign = 'right';

        let y = 100;  // start y-coordinate

        // Clinic title
        ctx.font = 'bold 72px Arial';
        ctx.fillText('عيادة الاخصائي النفسي مصطفى نبيل بشير', width - 40, y);

        y += 160;
        ctx.font = '56px Arial';

        // Patient info
        ctx.fillText(`وصل قبض`, width - 40, y);
        y += 100;
        ctx.fillText(`اسم المراجع: ${patient.name}`, width - 40, y);
        y += 100;
        ctx.fillText(`عدد الجلسات: ${bill.course}`, width - 40, y);
        y += 100;
        ctx.fillText(`تاريخ تسجيل الكورس: ${bill.courseDate}`, width - 40, y);
        y += 100;
        ctx.fillText(`تاريخ الدفع: ${bill.payDate}`, width - 40, y);
        y += 100;

        // Show discount info if exists
        if (discountInfo) {
            ctx.fillStyle = '#5cb85c'; // green color for discount
            ctx.fillText(`السعر الأصلي: ${discountInfo.originalPrice.toLocaleString()}`, width - 40, y);
            y += 100;
            ctx.fillText(`نوع الخصم: ${discountInfo.discountType === 'percentage' ? discountInfo.discountValue + '%' : discountInfo.discountValue.toLocaleString() + ' د.ك'}`, width - 40, y);
            y += 100;
            ctx.fillText(`قيمة الخصم: ${discountInfo.discountAmount.toLocaleString()}`, width - 40, y);
            y += 100;
            ctx.fillStyle = '#000';
        }

        // Amounts in bold
        ctx.font = 'bold 56px Arial';
        ctx.fillText(`المبلغ المدفوع: ${bill.amount.toLocaleString()}`, width - 40, y);
        y += 100;
        ctx.font = '56px Arial';
        ctx.fillText(`المبلغ المتبقي: ${patient.balance.toLocaleString()}`, width - 40, y);

        // Send PNG
        const buffer = canvas.toBuffer('image/png');
        res.setHeader('Content-Disposition', `attachment; filename=bill-${bill.code}.png`);
        res.setHeader('Content-Type', 'image/png');
        res.send(buffer);

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});
module.exports = router