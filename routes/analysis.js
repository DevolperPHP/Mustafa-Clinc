const express = require('express')
const router = express.Router()
const moment = require('moment')
const Fees = require('../models/Fees')
const Patient = require('../models/Patient')

router.get('/', async (req, res) => {
    try {
        res.render('admin/analysis/dashboard', {
            user: req.user
        })
    } catch (err) {
        console.log(err);
    }
})

router.get('/fees/:startDate/:endDate', async (req, res) => {
    try {
        const startDate = moment(req.params.startDate, 'YYYY-MM-DD').locale('ar-kw').format('l')
        const endDate = moment(req.params.endDate, 'YYYY-MM-DD').locale('ar-kw').format('l')

        const fees = await Fees.find({
            Date: { $gte: startDate, $lte: endDate }
        });
        var total = 0
        if (fees.length > 0) {
            total = fees.map(x => x.price).reduce((a, b) => a + b)
        }

        res.render('admin/analysis/fees', {
            user: req.user,
            fees,
            total,
            startDate,
            endDate,
        })

    } catch (err) {
        console.log(err);
    }
})

router.get('/bills/:startDate/:endDate', async (req, res) => {
    try {
        const startDate = moment(req.params.startDate, 'YYYY-MM-DD').locale('ar-kw');
        const endDate = moment(req.params.endDate, 'YYYY-MM-DD').locale('ar-kw');

        const patients = await Patient.find();
        const filteredBills = [];

        patients.forEach(patient => {
            patient.bills.forEach(bill => {
                const billDate = moment(bill.Date, 'D/M/YYYY').locale('ar-kw');

                // Only include bills that are paid and within the date range
                if (bill.paid === true && billDate.isBetween(startDate, endDate, undefined, '[]')) {
                    filteredBills.push({
                        patientName: patient.name,
                        ...bill,
                        Date: billDate.format('l') // format only for display
                    });
                }
            });
        });

        let total = 0;
        if (filteredBills.length > 0) {
            total = filteredBills.map(x => x.price).reduce((a, b) => a + b);
        }

        res.render('admin/analysis/bills', {
            user: req.user,
            bills: filteredBills,
            total,
            startDate: startDate.format('l'),
            endDate: endDate.format('l')
        });
    } catch (err) {
        console.log(err);
    }
});

router.get('/leand/:startDate/:endDate', async (req, res) => {
    try {
        const startDate = moment(req.params.startDate, 'YYYY-MM-DD').locale('ar-kw');
        const endDate = moment(req.params.endDate, 'YYYY-MM-DD').locale('ar-kw');

        const patients = await Patient.find();
        const filteredBills = [];

        patients.forEach(patient => {
            patient.bills.forEach(bill => {
                const billDate = moment(bill.Date, 'D/M/YYYY').locale('ar-kw');

                // Only include bills that are paid and within the date range
                if (bill.paid === false && billDate.isBetween(startDate, endDate, undefined, '[]')) {
                    filteredBills.push({
                        patientName: patient.name,
                        ...bill,
                        Date: billDate.format('l') // format only for display
                    });
                }
            });
        });

        let total = 0;
        if (filteredBills.length > 0) {
            total = filteredBills.map(x => x.left).reduce((a, b) => Math.abs(a) + Math.abs(b));
        }

        res.render('admin/analysis/leand', {
            user: req.user,
            bills: filteredBills,
            total,
            startDate: startDate.format('l'),
            endDate: endDate.format('l')
        });
    } catch (err) {
        console.log(err);
    }
});

router.get('/profit/:startDate/:endDate', async (req, res) => {
    try {
        const startDate = moment(req.params.startDate, 'YYYY-MM-DD').locale('ar-kw');
        const endDate = moment(req.params.endDate, 'YYYY-MM-DD').locale('ar-kw');

        // --- Fees ---
        const allFees = await Fees.find();
        const filteredFees = allFees.filter(fee => {
            const feeDate = moment(fee.Date, 'D/M/YYYY').locale('ar-kw');
            return feeDate.isBetween(startDate, endDate, undefined, '[]');
        });

        const totalFees = filteredFees.length > 0
            ? filteredFees.map(f => f.price).reduce((a, b) => a + b, 0)
            : 0;

        // --- Paid Bills ---
        const patients = await Patient.find();
        const paidBills = [];
        const unpaidBills = [];

        patients.forEach(patient => {
            patient.bills.forEach(bill => {
                const billDate = moment(bill.Date, 'D/M/YYYY').locale('ar-kw');

                if (billDate.isBetween(startDate, endDate, undefined, '[]')) {
                    const billData = { patientName: patient.name, ...bill, Date: billDate.format('l') };
                    if (bill.paid === true) {
                        paidBills.push(billData);
                    } else {
                        unpaidBills.push(billData);
                    }
                }
            });
        });

        const totalPaid = paidBills.length > 0
            ? paidBills.map(b => b.price).reduce((a, b) => a + b, 0)
            : 0;

        const totalUnpaid = unpaidBills.length > 0
            ? unpaidBills.map(b => b.left).reduce((a, b) => Math.abs(a) + Math.abs(b), 0)
            : 0;

        // --- Total Profit ---
        const totalProfit = totalPaid - totalFees;

        // --- Render combined view ---
        res.render('admin/analysis/profit', {
            user: req.user,
            filteredFees,
            paidBills,
            unpaidBills,
            totalFees,
            totalPaid,
            totalUnpaid,
            totalProfit,
            startDate: startDate.format('l'),
            endDate: endDate.format('l')
        });

    } catch (err) {
        console.log(err);
        res.status(500).send('Server Error');
    }
});

router.get('/patient/:startDate/:endDate', async (req, res)=> {
     try {
        const startDate = moment(req.params.startDate, 'YYYY-MM-DD').locale('ar-kw');
        const endDate = moment(req.params.endDate, 'YYYY-MM-DD').locale('ar-kw');

        const patients = await Patient.find();
        const filteredBills = [];

        patients.forEach(patient => {
            patient.bills.forEach(bill => {
                const billDate = moment(bill.Date, 'D/M/YYYY').locale('ar-kw');

                if (bill.paid === true && billDate.isBetween(startDate, endDate, undefined, '[]')) {
                    filteredBills.push({
                        patientName: patient.name,
                        ...bill,
                        Date: billDate.format('l') // format only for display
                    });
                }
            });
        });

        let total = 0;
        if (filteredBills.length > 0) {
            total = filteredBills.map(x => x.price).reduce((a, b) => a + b);
        }

        res.render('admin/analysis/bills', {
            user: req.user,
            bills: filteredBills,
            total,
            startDate: startDate.format('l'),
            endDate: endDate.format('l')
        });
    } catch (err) {
        console.log(err);
    }
})

router.get('/patients', async (req, res) => {
    try {
        // Comprehensive list of psychiatric diagnoses
        const diagnosisData = [
            "الإعاقات الذهنية",
            "اضطراب النمو الذهني",
            "تأخر النمو الشامل",
            "الإعاقة الذهنية غير المحددة",
            "اضطرابات التواصل",
            "اضطراب النطق",
            "اضطراب صوت الكلام",
            "البدء المتأخر لاضطراب الطلاقة (التأتأة)",
            "اضطراب التواصل الاجتماعي (العملي)",
            "اضطراب التواصل غير المحدد",
            "اضطراب طيف التوحد",
            "اضطراب نقص الانتباه/فرط الحركة المحدد الآخر",
            "اضطراب نقص الانتباه/فرط الحركة غير المحدد",
            "اضطرابات التعلم المحددة",
            "الاضطرابات الحركية",
            "اضطراب التناسق التطوري",
            "الحركات النمطية المتكررة",
            "اضطراب العرة (اللزمات)",
            "اضطراب توريت",
            "اضطراب العرة الحركية أو الصوتية المستمر (المزمن)",
            "اضطراب العرة التمهيدي",
            "الاضطراب الذهاني",
            "الاضطراب الذهاني الوجيز",
            "الاضطراب الذهاني المشيمي الشكل",
            "الفصام",
            "الفصام الوجداني",
            "الاضطراب الذهاني الناتج عن استخدام المواد",
            "الاضطراب الذهاني بسبب حالة طبية أخرى",
            "الفصام العاطفي الفاقـد للتمايز عن طيف آخر (محدد الكاتاتونيا)",
            "الكاتاتونيا بسبب حالة طبية أخرى",
            "الكاتاتونيا غير المحددة",
            "اضطرابات طيف الفصام والاضطرابات الذهانية المحددة الأخرى",
            "اضطرابات طيف الفصام والاضطرابات الذهانية غير المحددة",
            "اضطراب ثنائي القطب I",
            "اضطراب ثنائي القطب II",
            "اضطراب المزاج الدوراني",
            "الاضطراب ثنائي القطب والاضطرابات ذات الصلة الناتجة بمادة/دواء",
            "الاضطراب ثنائي القطب والاضطرابات ذات الصلة بسبب حالة طبية أخرى",
            "الاضطراب ثنائي القطب والاضطرابات ذات الصلة المحددة الأخرى",
            "ثنائي القطب والاضطرابات ذات الصلة غير المحددة",
            "اضطراب المزاج غير المحدد",
            "محددات ثنائي القطب والاضطرابات ذات الصلة",
            "اضطراب المزاج المتقلب المتشوش",
            "الاضطراب الاكتئابي الجسيم",
            "اضطراب اكتئابي مستمر (سوء المزاج)",
            "اضطراب سوء المزاج ما قبل الطمث",
            "الاضطراب الاكتئابي المحدد بمدى/شدّة",
            "الاضطراب الاكتئابي بسبب حالة طبية أخرى",
            "الاضطراب الاكتئابي محدد آخر",
            "الاضطراب الاكتئابي غير المحدد",
            "محددات الاضطرابات الاكتئابية",
            "اضطراب قلق الانفصال",
            "الهلع الانتقائي",
            "الرهاب النوعي",
            "اضطراب القلق الاجتماعي",
            "اضطراب الهلع",
            "اضطراب القلق المعمم",
            "اضطراب القلق الناتج بمادة/دواء",
            "اضطراب القلق بسبب حالة طبية أخرى",
            "اضطراب قلق محدد آخر",
            "اضطراب قلق غير محدد",
            "اضطراب الوسواس القهري",
            "اضطراب تشوه صورة الجسد",
            "اضطراب الاكتناز",
            "هوس نتف الشعر (اضطراب نتف الأشعار)",
            "نزع الجلد (اضطراب نزع الجلد)",
            "الوسواس القهري والاضطرابات ذات الصلة المحدث بمادة/دواء",
            "الوسواس القهري والاضطرابات ذات الصلة بسبب حالة طبية أخرى",
            "الوسواس القهري والاضطرابات ذات الصلة المحددة الأخرى",
            "الوسواس القهري والاضطرابات ذات الصلة غير المحددة",
            "اضطراب التعلق التفاعلي",
            "اضطراب المشاركة الاجتماعية المتخلخل",
            "اضطراب الكرب ما بعد الصدمة",
            "اضطراب الكرب ما بعد الصدمة للأطفال بعمر ست سنوات والأصغر سنا",
            "اضطراب الكرب الحاد",
            "اضطرابات التأقلم",
            "اضطراب الحداد المطول",
            "الاضطرابات المتعلقة بالصدمة والإجهاد المحددة الأخرى",
            "الاضطرابات المتعلقة بالصدمة والإجهاد غير المحددة",
            "اضطراب الهوية التفارقي",
            "النسيان التفارقي",
            "اضطراب تبدد الشخصية/تبدد الواقع",
            "اضطراب تفارقي محدد آخر",
            "اضطراب تفارقي غير محدد",
            "اضطراب العرض الجسدي",
            "اضطراب قلق المرض",
            "اضطراب العرض العصبي الوظيفي (اضطراب التحويل)",
            "العوامل النفسية المؤثرة في الحالات الطبية الأخرى",
            "الاضطراب المفتعل",
            "اضطراب العرض الجسدي والاضطرابات ذات الصلة المحددة الأخرى",
            "اضطراب العرض الجسدي والاضطرابات ذات الصلة غير المحددة",
            "شهوة الطين",
            "اضطراب الاجترار",
            "اضطراب تناول الطعام التجنبي/المقيد",
            "فقدان الشهية العصبي (القمه العصبي)",
            "النهم العصبي",
            "اضطراب الشراهة للطعام",
            "اضطراب التغذية أو الأكل المحدد الآخر",
            "اضطراب التغذية أو الأكل غير المحدد",
            "سلس البول",
            "سلس الغائط",
            "اضطراب الإفراغ المحدد الآخر",
            "اضطراب الإفراغ غير المحدد",
            "اضطراب الأرق",
            "اضطراب فرط النعاس",
            "النوم الانتيابي",
            "اضطرابات النوم ذات الصلة بالتنفس",
            "توقف التنفس أو قصور التنفس الانسدادي أثناء النوم",
            "توقف التنفس وسط النوم",
            "نقص التهوية المتعلق بالنوم",
            "اضطراب وتيرة النوم - اليقظة اليومي",
            "حالات النوم المضطرب",
            "اضطرابات الاستثارة خلال نوم حركة العين السريعة",
            "اضطراب الكابوس",
            "اضطراب السلوك خلال نوم حركة العين السريعة",
            "متلازمة الساقين المتململتين",
            "اضطراب النوم المحدث بمادة/دواء",
            "اضطراب الأرق المحدد الآخر",
            "اضطراب أرق غير محدد",
            "اضطراب فرط النعاس المحدد الآخر",
            "اضطراب فرط النعاس غير المحدد",
            "اضطراب نوم - يقظة محدد آخر",
            "اضطراب نوم - يقظة غير محدد",
            "تأخر القذف",
            "اضطراب الانتصاب",
            "اضطراب النشوة الجنسية الأنثوي",
            "اضطراب الاهتمام/الاستثارة الجنسي الأنثوي",
            "اضطراب ألم الإيلاج الحوضي التناسلي",
            "اضطراب نقص النشاط والرغبة الجنسية الذكري",
            "القذف المبكر",
            "خلل جنسي محدد بمادة/دواء",
            "خلل وظيفة جنسية محدد آخر",
            "خلل وظيفة جنسية غير محدد",
            "الانزعاج من الجندر",
            "الانزعاج من الجندر عند الأطفال",
            "الانزعاج من الجندر لدى المراهقين والبالغين",
            "انزعاج من الجندر محدد آخر",
            "انزعاج من الجندر غير محدد",
            "اضطراب التحدي الاعتراضي",
            "الاضطراب الانفصالي المتقطع",
            "اضطراب المسلك",
            "اضطراب الشخصية المضادة للمجتمع",
            "هوس إشعال الحرائق",
            "هوس السرقة",
            "اضطراب التشوش والتحكم بالاندفاع والمسلك محدد آخر",
            "اضطراب التشوش والتحكم بالاندفاع والمسلك غير محدد",
            "اضطرابات استعمال المادة",
            "اضطرابات المتعلقة بالكحول",
            "اضطراب استعمال الكحول",
            "الاتسام بالكحول",
            "سحب الكحول",
            "الاضطرابات العقلية المحدثة بالكحول",
            "اضطراب متعلق بالكحول غير محدد",
            "الاضطرابات المتعلقة بالكافيين",
            "الاتسام بالكافيين",
            "سحب الكافيين",
            "الاضطرابات العقلية المحدثة بالكافيين",
            "اضطراب متعلق بالكافيين غير محدد",
            "الاضطرابات المتعلقة بالحشيش",
            "اضطراب استعمال الحشيش",
            "الاتسام بالحشيش",
            "سحب الحشيش",
            "الاضطرابات العقلية المحدثة بالحشيش",
            "اضطراب متعلق بالحشيش غير محدد",
            "الاضطرابات المتعلقة بالمهلوسات",
            "اضطراب استعمال الفينسيكليدين",
            "اضطراب استعمال المهلوسات الأخرى",
            "الاتسام بفينسيكليدين",
            "الاتسام بمهلوس آخر",
            "اضطراب الإدراكي المستمر بالمهلوسات",
            "الاضطرابات العقلية المحدثة بفينسيكليدين",
            "الاضطرابات العقلية المحدثة بمهلوس آخر",
            "اضطراب متعلق بفينسيكليدين غير محدد",
            "اضطراب متعلق بمهلوس غير محدد",
            "الاضطرابات المتعلقة بالمنشطات",
            "اضطراب استعمال المنشطات",
            "الاتسام بالمنشطات",
            "سحب المنشطات",
            "الاضطرابات العقلية المحدثة بالمنشطات",
            "اضطراب متعلق بالمنشطات غير محدد",
            "الاضطرابات المتعلقة بالمستنشقات",
            "اضطراب استعمال المستنشقات",
            "الاتسام بالمستنشقات",
            "الاضطرابات العقلية المحدثة بالمستنشقات",
            "اضطراب متعلق بالمستنشقات غير محدد",
            "الاضطرابات المتعلقة بالأفيون",
            "اضطراب استعمال الأفيون",
            "الاتسام بالأفيون",
            "سحب الأفيون",
            "الاضطرابات العقلية المحدثة بالأفيون",
            "اضطراب متعلق بالأفيون غير محدد",
            "الاضطرابات المتعلقة بالمهدئات والمنومات ومضادات القلق",
            "اضطراب استعمال المهدئات والمنومات ومضادات القلق",
            "الاتسام بالمهدئات والمنومات ومضادات القلق",
            "سحب المهدئات والمنومات ومضادات القلق",
            "الاضطرابات العقلية المحدثة بالمهدئات والمنومات ومضادات القلق",
            "اضطراب متعلق بالمهدئات والمنومات ومضادات القلق غير محدد",
            "الاضطرابات المتعلقة بالتبغ",
            "اضطراب استعمال التبغ",
            "سحب التبغ",
            "الاضطرابات العقلية المحدثة بالتبغ",
            "اضطراب متعلق بالتبغ غير محدد",
            "الاضطرابات المتعلقة بمادة أخرى (أو غير معروفة)",
            "اضطراب استعمال مادة أخرى (أو غير معروفة)",
            "الاتسام بمادة أخرى (أو غير معروفة)",
            "سحب مادة أخرى (أو غير معروفة)",
            "الاضطرابات العقلية المحدثة بمادة أخرى (أو غير معروفة)",
            "اضطراب متعلق بمادة أخرى (أو غير معروفة) غير محدد",
            "الاضطرابات غير المتعلقة بالمواد",
            "اضطراب المقامرة",
            "الاضطرابات العصبية المعرفية",
            "الهذيان",
            "هذيان محدد آخر",
            "هذيان غير محدد",
            "الاضطراب العصبي المعرفي الجسيم",
            "الاضطراب العصبي المعرفي المعتدل",
            "الاضطراب العصبي المعرفي الجسيم أو المعتدل بسبب داء الزهايمر",
            "اضطراب عصبي معرفي جسيم أو معتدل جبهي صدغي",
            "اضطراب عصبي معرفي جسيم أو معتدل بسبب جسيمات ليوي",
            "اضطراب عصبي معرفي وعائي جسيم أو معتدل",
            "الاضطراب العصبي المعرفي الجسيم أو المعتدل بسبب أذيات الدماغ الرضية",
            "الاضطراب العصبي المعرفي الجسيم أو المعتدل المحدث بمادة/دواء",
            "الاضطراب العصبي المعرفي الجسيم أو المعتدل بسبب خمج فيروس نقص المناعة البشري HIV",
            "الاضطراب العصبي المعرفي الجسيم أو المعتدل بسبب داء بريون",
            "اضطراب عصبي معرفي معتدل أو جسيم بسبب داء باركنسون",
            "اضطراب عصبي معرفي جسيم أو معتدل بسبب داء هنتنغتون",
            "الاضطراب العصبي المعرفي الجسيم أو المعتدل بسبب حالة طبية أخرى",
            "الاضطراب العصبي المعرفي الجسيم أو المعتدل الناتج عن تعدد الأسباب المرضية",
            "اضطراب عصبي معرفي غير محدد",
            "اضطرابات الشخصية",
            "اضطراب الشخصية العام",
            "المجموعة A من اضطرابات الشخصية",
            "اضطراب الشخصية الزورانية",
            "اضطراب الشخصية الفصامية",
            "اضطراب الشخصية الفصامي النمط",
            "المجموعة B من اضطرابات الشخصية",
            "اضطراب الشخصية المعادي للمجتمع",
            "اضطراب الشخصية الحدية",
            "اضطراب الشخصية الهيستريونية",
            "اضطراب الشخصية النرجسية",
            "المجموعة C من اضطرابات الشخصية",
            "اضطراب الشخصية التجنبية",
            "اضطراب الشخصية الاعتمادية",
            "اضطراب الشخصية الوسواسية القهرية",
            "اضطرابات الشخصية الأخرى",
            "تغير الشخصية بسبب حالة طبية أخرى",
            "اضطراب شخصية محدد آخر",
            "اضطراب شخصية غير محدد",
            "اضطراب التلصص",
            "اضطراب الاستعراء",
            "اضطراب الاحتكاك",
            "اضطراب المازوخية الجنسية",
            "اضطراب السادية الجنسية",
            "اضطراب الولع بالأطفال",
            "اضطراب الفيتيشية",
            "اضطراب لبس ملابس الجنس الآخر",
            "اضطراب الولع الجنسي المحدد الآخر",
            "اضطراب الولع الجنسي الغير المحدد",
            "اضطراب عقلي محدد آخر ناتج عن حالة طبية أخرى",
            "اضطراب عقلي غير محدد ناتج عن حالة طبية أخرى",
            "اضطراب عقلي محدد آخر",
            "اضطراب عقلي غير محدد",
            "رموز إضافية",
            "لا يوجد تشخيص أو حالة",
            "حالات أخرى قد تكون محوراً للاهتمام السريري",
            "السلوك الانتحاري",
            "سوء المعاملة والإهمال",
            "مشاكل إساءة معاملة الطفل وإهماله",
            "مشاكل سوء المعاملة والإهمال للبالغين",
            "مشاكل العلاقات",
            "مشاكل متعلقة بالتنشئة الأسرية",
            "المشاكل المتعلقة بالبيئة الأسرية",
            "مشاكل تعليمية",
            "مشاكل مهنية",
            "مشاكل السكن",
            "مشاكل اقتصادية",
            "مشاكل أخرى ذات صلة بالبيئة الاجتماعية",
            "المشاكل ذات الصلة بالجريمة أو التداخل مع النظام القضائي",
            "المشكلات المتعلقة بالظروف النفسية والاجتماعية والشخصية والبيئية الأخرى",
            "المشاكل المتعلقة بالحصول على الرعاية الطبية وأشكال الرعاية الصحية الأخرى",
            "ظروف التاريخ الشخصي",
            "مقابلات الخدمات الصحية الأخرى للنصح والمشورة الطبية",
            "الظروف أو المشاكل الإضافية التي قد تكون محل تركيز للاهتمام السريري",
        ];

        res.render('admin/analysis/patients', {
            user: req.user,
            diagnosisData: JSON.stringify(diagnosisData)
        })
    } catch (err) {
        console.log(err);
    }
})

router.get('/patients/gender/:startDate/:endDate', async (req, res) => {
    try {
        const patients = await Patient.find({})
        res.render('admin/analysis/patient-gender', {
            user: req.user,
            patients
        })
    } catch (err) {
        console.log(err);
    }
})

router.get('/patients/gender/:startDate/:endDate/:gender', async (req, res) => {
    try {
        const gender = req.params.gender
        const patients = await Patient.find({ gender: gender})
        res.render('admin/analysis/patient-gender', {
            user: req.user,
            patients
        })
    } catch (err) {
        console.log(err);

    }
})

// Filter patients based on criteria
router.post('/patients/filter', async (req, res) => {
    try {
        const {
            gender,
            study,
            address,
            relationship,
            childrenMin,
            childrenMax,
            familyRankMin,
            familyRankMax,
            health,
            psycho,
            familyStatus,
            doctorDiagnose,
            therapistDiagnose,
            job,
            sessionsMin,
            sessionsMax
        } = req.body;

        // Build query object
        let query = {};

        if (gender) query.gender = gender;
        if (study) query.study = study;
        if (address) query.address = { $regex: address, $options: 'i' };
        if (relationship) query.relationship = relationship;

        if (childrenMin || childrenMax) {
            query.children = {};
            if (childrenMin) query.children.$gte = Number(childrenMin);
            if (childrenMax) query.children.$lte = Number(childrenMax);
        }

        if (familyRankMin || familyRankMax) {
            query.familyRank = {};
            if (familyRankMin) query.familyRank.$gte = Number(familyRankMin);
            if (familyRankMax) query.familyRank.$lte = Number(familyRankMax);
        }

        if (health) query.health = health;
        if (psycho) query.psycho = psycho;
        if (familyStatus) query.RelationshipAndFamily = familyStatus;
        if (doctorDiagnose) query.doctor_diagnose = { $regex: doctorDiagnose, $options: 'i' };
        if (therapistDiagnose) query.therapist_diagnose = { $regex: therapistDiagnose, $options: 'i' };
        if (job) query.job = { $regex: job, $options: 'i' };

        // Execute query
        const patients = await Patient.find(query);

        // Filter by number of course sessions
        let filteredPatients = patients;
        if (sessionsMin || sessionsMax) {
            filteredPatients = patients.filter(patient => {
                if (!patient.course || patient.course.length === 0) return false;

                const totalSessions = patient.course.reduce((total, course) => {
                    if (course.sessions && typeof course.sessions === 'object') {
                        return total + Object.keys(course.sessions).length;
                    }
                    return total;
                }, 0);

                if (sessionsMin && totalSessions < Number(sessionsMin)) return false;
                if (sessionsMax && totalSessions > Number(sessionsMax)) return false;

                return true;
            });
        }

        res.render('admin/analysis/patient-filter-results', {
            user: req.user,
            patients: filteredPatients,
            filters: {
                gender,
                study,
                address,
                relationship,
                childrenMin,
                childrenMax,
                familyRankMin,
                familyRankMax,
                health,
                psycho,
                familyStatus,
                doctorDiagnose,
                therapistDiagnose,
                job,
                sessionsMin,
                sessionsMax
            },
            totalCount: filteredPatients.length
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});


router.get('/daily/:date', async (req, res) => {
  try {
    const targetDate = moment(req.params.date, 'YYYY-MM-DD'); // keep as moment

    const patients = await Patient.find().lean();
    const visits = [];

    const toSessionArray = (sessions) => {
      if (!sessions) return [];
      if (Array.isArray(sessions)) return sessions;
      if (typeof sessions === 'object') return Object.values(sessions);
      return [];
    };

    patients.forEach((patient) => {
      const courseArr = Array.isArray(patient.course) ? patient.course : [];
      courseArr.forEach((courseItem) => {
        const sessionList = toSessionArray(courseItem.sessions);

        sessionList.forEach((sess) => {
          const sessDate = moment(sess?.Date, 'D/M/YYYY');

          if (!sessDate.isValid()) return;

          if (sessDate.isSame(targetDate, 'day')) {
            // Optional: only finished sessions
            if (sess?.Done !== true) return;

            const price =
              Number(sess?.price ?? courseItem?.price ?? 0) || 0;

            visits.push({
              patientName: patient.name,
              id: patient._id,
              phone: patient.phone,
              courseType: patient.type,
              gender: patient.gender,
              study: patient.study,
              relationship: patient.relationship,
              dateAdded: patient.dateAdded,
              therapist_diagnose: patient.therapist_diagnose,
              doctor_diagnose: patient.doctor_diagnose ?? null,
              sessionNumber: sess?.session ?? null,
              note: sess?.Note ?? '',
              done: !!sess?.Done,
              price,
              Date: sessDate.locale('ar-kw').format('l'),
              code: courseItem?.code ?? sess?.code
            });
          }
        });
      });
    });

    // totals
    const totalPrice =
      visits.length > 0
        ? visits.map(v => v.price).reduce((a, b) => a + b, 0)
        : 0;

    res.render('admin/analysis/daily', {
      user: req.user,
      visits,
      total: totalPrice,
      targetDate: targetDate.locale('ar-kw').format('l') // for display
    });
  } catch (err) {
    console.log(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router