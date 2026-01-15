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
            // Handle missing payDate
            if (!a.payDate) return 1;
            if (!b.payDate) return -1;

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
        const bill = data.bills.find((x) => x.code == Number(req.params.code))
        const course = data.course.find((x) => x.code == Number(req.params.code))

        res.render('admin/bills/pay', {
            user: req.user,
            bill,
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
        await Patient.updateOne(
            { _id: patientId, 'bills.code': billCode },
            {
                $set: {
                    'bills.$.discountType': discountType,
                    'bills.$.discountValue': Number(discountValue),
                    'bills.$.discountAmount': discountAmount,
                    'bills.$.originalPrice': bill.price,
                    'bills.$.price': bill.price - discountAmount,
                    'bills.$.left': (bill.price - discountAmount) + bill.left,
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
        await Patient.updateOne(
            { _id: patientId, 'bills.code': billCode },
            {
                $set: {
                    'bills.$.price': bill.originalPrice,
                    'bills.$.left': bill.originalPrice + bill.left + bill.discountAmount,
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

        const finalBalance = data.balance + amount;
        const receiptData = {
            amount,
            patientName: data.name,
            patientCode: data.code,
            payDate: moment().locale('ar-kw').format('l'),
            courseDate: bill.Date,
            sessions: bill.sessions,
            balance: finalBalance,
            hasDiscount: bill.discountType ? true : false,
            originalPrice: bill.originalPrice || (bill.price + bill.left),
            discountType: bill.discountType,
            discountValue: bill.discountValue,
            discountAmount: bill.discountAmount || 0,
            finalPrice: bill.price
        };

        req.flash('suc', JSON.stringify(receiptData));
        res.redirect(`/bills/get/${req.params.id}`)

    } catch (err) {
        console.log(err);
    }
})

router.get('/download/:code', async (req, res) => {
    try {
        const patient = await Patient.findOne(
            { 'purchase.code': Number(req.params.code) },
            { 'purchase.$': 1, name: 1, balance: 1, code: 1 }
        );

        if (!patient) return res.status(404).send('Bill not found');

        const bill = patient.purchase[0];

        // Check if this bill had a discount
        const patientFull = await Patient.findOne({ _id: patient._id });
        const discountInfo = patientFull.discounts.find(d => d.billCode === bill.code);

        // Calculate dimensions based on content
        const baseHeight = 800;
        const discountHeight = discountInfo ? 150 : 0;
        const height = baseHeight + discountHeight;
        const width = 840;

        // High resolution canvas (2x for retina)
        const scale = 2;
        const canvas = createCanvas(width * scale, height * scale);
        const ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);

        // Fill with white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        const padding = 48;
        const cardRadius = 24;
        let y = padding;

        // ========== HEADER (Green Gradient) ==========
        const headerGradient = ctx.createLinearGradient(0, 0, width, 0);
        headerGradient.addColorStop(0, '#22C55E');
        headerGradient.addColorStop(1, '#16a34a');

        // Draw rounded header
        ctx.fillStyle = headerGradient;
        roundRect(ctx, padding, y, width - (padding * 2), 100, cardRadius);
        ctx.fill();

        // Header text
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = '22px Tajawal';
        ctx.fillText('عيادة مصطفى نبيل', width / 2, y + 35);
        ctx.font = 'bold 36px Tajawal';
        ctx.fillText('تم الدفع بنجاح', width / 2, y + 70);

        y += 140;

        // ========== SECTION TITLE ==========
        ctx.fillStyle = '#9ca3af';
        ctx.textAlign = 'right';
        ctx.font = '22px Tajawal';
        ctx.fillText('تفاصيل المريض', width - padding, y);
        y += 48;

        // ========== INFO GRID (2 columns) ==========
        const infoBoxSize = (width - (padding * 2) - 24) / 2;
        const infoData = [
            { label: 'الاسم', value: patient.name },
            { label: 'الكود', value: `#${patient.code}` },
            { label: 'الجلسات', value: `${bill.course}` },
            { label: 'تاريخ الدفع', value: bill.payDate }
        ];

        infoData.forEach((item, index) => {
            const col = index % 2;
            const row = Math.floor(index / 2);
            const x = padding + (col * (infoBoxSize + 24));
            const boxY = y + (row * (80 + 24));

            // Info box background
            ctx.fillStyle = '#f9fafb';
            roundRect(ctx, x, boxY, infoBoxSize, 80, 12);
            ctx.fill();

            // Label
            ctx.fillStyle = '#6b7280';
            ctx.font = '22px Tajawal';
            ctx.textAlign = 'right';
            ctx.fillText(item.label, x + infoBoxSize - 16, boxY + 30);

            // Value
            ctx.fillStyle = '#1f2937';
            ctx.font = 'bold 28px Tajawal';
            ctx.fillText(item.value, x + infoBoxSize - 16, boxY + 60);
        });

        y += 208;

        // ========== DISCOUNT SECTION (if applicable) ==========
        if (discountInfo) {
            ctx.fillStyle = '#9ca3af';
            ctx.textAlign = 'right';
            ctx.font = '22px Tajawal';
            ctx.fillText('تفاصيل الخصم', width - padding, y);
            y += 48;

            // Discount box
            const discountBoxY = y;
            const discountBoxWidth = width - (padding * 2);
            const discountBoxHeight = 130;

            // Yellow background
            ctx.fillStyle = '#fffbeb';
            roundRect(ctx, padding, discountBoxY, discountBoxWidth, discountBoxHeight, 12);
            ctx.fill();

            // Border
            ctx.strokeStyle = '#fcd34d';
            ctx.lineWidth = 2;
            roundRect(ctx, padding, discountBoxY, discountBoxWidth, discountBoxHeight, 12);
            ctx.stroke();

            // Discount rows
            const discountRows = [
                {
                    label: 'السعر الأصلي',
                    value: `${discountInfo.originalPrice.toLocaleString()} د.ع`
                },
                {
                    label: `الخصم (${discountInfo.discountType === 'percentage' ? discountInfo.discountValue + '%' : discountInfo.discountValue.toLocaleString() + ' د.ع'})`,
                    value: `-${discountInfo.discountAmount.toLocaleString()} د.ع`
                },
                {
                    label: 'السعر بعد الخصم',
                    value: `${discountInfo.finalPrice.toLocaleString()} د.ع`
                }
            ];

            ctx.textAlign = 'right';
            ctx.font = '26px Tajawal';

            discountRows.forEach((row, i) => {
                const rowY = discountBoxY + 30 + (i * 36);

                // Label
                ctx.fillStyle = '#92400e';
                ctx.fillText(row.label, width - padding - 20, rowY);

                // Value
                ctx.fillStyle = '#92400e';
                ctx.font = 'bold 26px Tajawal';
                ctx.fillText(row.value, width - padding - 320, rowY);
                ctx.font = '26px Tajawal';
            });

            y += 190;
        }

        // ========== PAYMENT SUMMARY ==========
        ctx.fillStyle = '#9ca3af';
        ctx.textAlign = 'right';
        ctx.font = '22px Tajawal';
        ctx.fillText('ملخص الدفع', width - padding, y);
        y += 48;

        // Amount box (green gradient)
        const amountBoxWidth = width - (padding * 2);
        const amountGradient = ctx.createLinearGradient(0, y, 0, y + 80);
        amountGradient.addColorStop(0, '#f0fdf4');
        amountGradient.addColorStop(1, '#dcfce7');

        ctx.fillStyle = amountGradient;
        roundRect(ctx, padding, y, amountBoxWidth, 80, 12);
        ctx.fill();

        // Amount label
        ctx.fillStyle = '#16a34a';
        ctx.textAlign = 'center';
        ctx.font = '24px Tajawal';
        ctx.fillText('المبلغ المدفوع', width / 2, y + 35);

        // Amount value
        ctx.fillStyle = '#16a34a';
        ctx.font = 'bold 48px Tajawal';
        ctx.fillText(`${bill.amount.toLocaleString()} د.ع`, width / 2, y + 70);

        y += 100;

        // Balance row
        ctx.strokeStyle = '#e5e7eb';
        ctx.setLineDash([8, 8]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding + 20, y + 20);
        ctx.lineTo(width - padding - 20, y + 20);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#6b7280';
        ctx.textAlign = 'right';
        ctx.font = '26px Tajawal';
        ctx.fillText('الرصيد الحالي', width - padding - 200, y + 50);

        ctx.fillStyle = '#1f2937';
        ctx.font = 'bold 30px Tajawal';
        ctx.fillText(`${patient.balance.toLocaleString()} د.ع`, width - padding - 20, y + 50);

        y += 90;

        // ========== FOOTER ==========
        ctx.fillStyle = '#e5e7eb';
        ctx.fillRect(padding, y, width - (padding * 2), 2);

        y += 30;
        ctx.fillStyle = '#9ca3af';
        ctx.textAlign = 'center';
        ctx.font = '22px Tajawal';
        ctx.fillText(`شكراً لك • ${new Date().getFullYear()}`, width / 2, y);

        // Helper function for rounded rectangles
        function roundRect(ctx, x, y, width, height, radius) {
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + height - radius);
            ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            ctx.lineTo(x + radius, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
        }

        // Send PNG
        const buffer = canvas.toBuffer('image/png');
        res.setHeader('Content-Disposition', `attachment; filename=receipt-${bill.code}.png`);
        res.setHeader('Content-Type', 'image/png');
        res.send(buffer);

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});
module.exports = router