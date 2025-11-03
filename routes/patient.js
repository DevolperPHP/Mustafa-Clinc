const express = require('express')
const router = express.Router()
const moment = require('moment')
const isAdminMiddleWare = require('../middlewares/isAdmin')
const Patient = require('../models/Patient')
const QRCode = require('qrcode');
const Course = require('../models/Course')
const Tests = require('../models/Tests')
const Exercise = require('../models/Exercise')
const { text } = require('body-parser')

router.use(isAdminMiddleWare)

router.get('/add', async (req, res) => {
    try {
        const courses = await Course.find({})
        res.render('admin/patient/add', {
            user: req.user,
            err: req.flash('error'),
            suc: req.flash('success'),
            courses,

        })
    } catch (err) {
        console.log(err);
    }
})

router.post('/add', async (req, res) => {
    try {
        const {
            name, birthDate, gender, study, address, phone, relationship,
            familyMembers, familyRank, health, psycho, RelationshipAndFamily,
            sendTo, psychoNote, Notes, course, therapist_diagnose, doctor_diagnose, type,
            children, experince, job,
            // Discount fields
            discountType, discountValue
        } = req.body;

        let experince_rate = req.body.experince_rate
        if(experince_rate == "وصف التجربة"){
            experince_rate = null
        }

        const code = Math.floor(1000000000 + Math.random() * 9000000000);
        const filter = await Patient.findOne({ name: name, birthDate: birthDate })
        if (filter) {
            req.flash('error', 'تمت اضافة هذا المريض مسبقا');
            res.redirect('/patient/add')
        } else {
            const newPatient = new Patient({
                name,
                birthDate,
                gender,
                study,
                address,
                phone,
                relationship,
                familyMembers,
                familyRank,
                health,
                psycho,
                RelationshipAndFamily,
                sendTo,
                psychoNote,
                Notes,
                code,
                inCourse: false,
                balance: 0,
                doctor_diagnose,
                therapist_diagnose,
                type,
                dateAdded: moment().locale('ar-kw').format('l'),
                experince_rate,
                children,
                experince,
                job
            });

            // Save the patient first
            await newPatient.save();

            // If course is selected (not placeholder)
            if (course && course !== 'الكورس العلاجي') {
                const foundCourse = await Course.findOne({ sessions: course });

                if (foundCourse) {
                    const newCode = Math.floor(1000000000 + Math.random() * 9000000000);
                    const number_of_sessions = foundCourse.sessions;

                    const sessionsObj = {};
                    for (let i = 0; i < number_of_sessions; i++) {
                        sessionsObj[`Object${i}`] = {
                            session: i + 1,
                            Date: null,
                            Note: null,
                            Done: false,
                        };
                    }

                    // Calculate discount if provided
                    let finalPrice = foundCourse.price;
                    let discountAmount = 0;
                    let discountInfo = {};
                    let leftAmount = -foundCourse.price;

                    if (discountType && discountValue) {
                        if (discountType === 'percentage') {
                            discountAmount = (foundCourse.price * Number(discountValue)) / 100;
                        } else if (discountType === 'fixed') {
                            discountAmount = Number(discountValue);
                        }

                        finalPrice = foundCourse.price - discountAmount;
                        leftAmount = -finalPrice;

                        discountInfo = {
                            discountType: discountType,
                            discountValue: Number(discountValue),
                            discountAmount: discountAmount,
                            originalPrice: foundCourse.price,
                            discountedPrice: finalPrice
                        };
                    }

                    await Patient.updateOne(
                        { _id: newPatient._id },
                        {
                            $push: {
                                course: {
                                    sessions: sessionsObj,
                                    end: false,
                                    price: finalPrice,
                                    Date: moment().locale('ar-kw').format('l'),
                                    endDate: null,
                                    code: newCode,
                                },
                                bills: {
                                    code: newCode,
                                    price: finalPrice,
                                    sessions: foundCourse.sessions,
                                    Date: moment().locale('ar-kw').format('l'),
                                    paid: false,
                                    left: leftAmount,
                                    ...discountInfo
                                },
                            },
                            $set: {
                                inCourse: true,
                                balance: leftAmount
                            }
                        }
                    );

                    // Add to discount history if discount was applied
                    if (discountType && discountValue && discountAmount > 0) {
                        await Patient.updateOne(
                            { _id: newPatient._id },
                            {
                                $push: {
                                    discounts: {
                                        billCode: newCode,
                                        discountType: discountType,
                                        discountValue: Number(discountValue),
                                        discountAmount: discountAmount,
                                        originalPrice: foundCourse.price,
                                        discountedPrice: finalPrice,
                                        date: moment().locale('ar-kw').format('l'),
                                        appliedBy: req.user ? req.user.username : 'System'
                                    }
                                }
                            }
                        );
                    }
                } else {
                    req.flash('error', 'لم يتم العثور على الكورس');
                }
            }

            req.flash('success', 'تمت إضافة المريض بنجاح');
            res.redirect(`/patient/qrcode/${code}/download`);
        }
    } catch (err) {
        console.error(err);
        req.flash('error', 'حدث خطأ أثناء إضافة المريض');
        res.redirect('/patient/add'); // or wherever your form is
    }
});


router.get('/qrcode/:code/download', async (req, res) => {
    const code = req.params.code;
    const data = await Patient.findOne({ code: code });

    try {
        const buffer = await QRCode.toBuffer(`http://142.93.171.214/patient/get-by-code/${code}`, {
            type: 'png',
            width: 300,
            errorCorrectionLevel: 'H'
        });

        const fileName = `${data.name}-${code}.png`;
        const encodedFileName = encodeURIComponent(fileName); // ترميز الاسم لدعم العربية

        res.set({
            'Content-Type': 'image/png',
            'Content-Disposition': `attachment; filename*=UTF-8''${encodedFileName}`
        });

        res.send(buffer);
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to generate QR code.');
    }
});



router.get('/get-by-code/:code', async (req, res) => {
    try {
        const data = await Patient.findOne({ code: req.params.code })
        res.redirect(`/patient/get-by-id/${data._id}`)
    } catch (err) {
        console.log(err);
    }
})

router.get('/history', async (req, res) => {
    try {
        const data = await Patient.find({})
        const names = data.map((x) => x.name)
        
        res.render('admin/patient/history', {
            user: req.user,
            data,
            names
        })
    } catch (err) {
        console.log(err);

    }
})

router.get('/search/:name', async (req, res) => {
    try {
        const data = await Patient.find({
            name: { $regex: new RegExp(req.params.name, "i") }
        })

        const allPatient = await Patient.find({})
        const names = allPatient.map((x) => x.name)

        res.render('admin/patient/history', {
            user: req.user,
            data,
            names
        })
    } catch (err) {
        console.log(err)
    }
})

router.get('/get-by-id/:id', async (req, res) => {
    try {
        const data = await Patient.findOne({ _id: req.params.id })
        const courses = await Course.find({})
        const CurrentCourse = data.course.find((x) => x.end == false)
        const tests = await Tests.find({})
        const exercise = await Exercise.find({})
        var totalSesstions = 0;

        if (data.course.length > 0) {
            totalSesstions = data.course
                .map(x => Object.keys(x.sessions).length)
                .reduce((a, b) => a + b, 0);
        }

        res.render('admin/patient/profile', {
            user: req.user,
            data,
            courses,
            suc: req.flash('success'),
            err: req.flash('error'),
            totalSesstions,
            CurrentCourse,
            tests,
            exercise
        })
    } catch (err) {
        console.log(err);

    }
})

router.put('/close-acc/:id', async (req, res) => {
    try {
        const {reason , customReason} = req.body
        var data;
        if(customReason){
            data = customReason
        } else {
            data = reason
        }
        await Patient.updateOne({ _id: req.params.id }, {
            $set: {
                status: "close",
            },

            $push: {
                statusReasons: {
                    type: "close",
                    text: data,
                    Date: moment().locale('ar-kw').format('l')
                }
            }
        })

        res.redirect(`/patient/get-by-id/${req.params.id}`)
    } catch (err) {
        console.log(err);
    }
})

router.put('/open-acc/:id', async (req, res) => {
    try {
        await Patient.updateOne({ _id: req.params.id }, {
            $set: {
                status: "open",
            },

            $push: {
                statusReasons: {
                    type: "open",
                    text: req.body.note,
                    Date: moment().locale('ar-kw').format('l')
                }
            }
        })

        res.redirect(`/patient/get-by-id/${req.params.id}`)
    } catch (err) {
        console.log(err);
    }
})

router.all('/get-status/:id', async (req, res) => {
    try {
        const data = await Patient.findOne({ _id: req.params.id })
        res.render('admin/patient/status', {
            user: req.user,
            data
        })
    } catch (err) {
        console.log(err);
    }
})

router.put('/add-course/:id', async (req, res) => {
    try {
        const { course: courseName, discountType, discountValue } = req.body;
        const course = await Course.findOne({ sessions: courseName });
        const data = await Patient.findOne({ _id: req.params.id });
        const code = Math.floor(1000000000 + Math.random() * 9000000000);
        const number_of_sessions = course.sessions;

        const sessionsObj = {};
        for (let i = 0; i < number_of_sessions; i++) {
            sessionsObj[`Object${i}`] = {
                session: i + 1,
                Date: null,
                Note: null,
                Done: false,
            };
        }

        if (data.inCourse == false) {
            // Calculate discount if provided
            let finalPrice = course.price;
            let discountAmount = 0;
            let discountInfo = {};
            let leftAmount = -course.price;

            if (discountType && discountValue) {
                if (discountType === 'percentage') {
                    discountAmount = (course.price * Number(discountValue)) / 100;
                } else if (discountType === 'fixed') {
                    discountAmount = Number(discountValue);
                }

                finalPrice = course.price - discountAmount;
                leftAmount = -finalPrice;

                discountInfo = {
                    discountType: discountType,
                    discountValue: Number(discountValue),
                    discountAmount: discountAmount,
                    originalPrice: course.price,
                    discountedPrice: finalPrice
                };
            }

            await Patient.updateOne(
                { _id: req.params.id },
                {
                    $push: {
                        course: {
                            sessions: sessionsObj,
                            end: false,
                            price: finalPrice,
                            Date: moment().locale('ar-kw').format('l'),
                            endDate: null,
                            code,
                        },
                        bills: {
                            code,
                            price: finalPrice,
                            sessions: course.sessions,
                            Date: moment().locale('ar-kw').format('l'),
                            paid: false,
                            left: leftAmount,
                            ...discountInfo
                        },
                    },
                    $set: {
                        inCourse: true,
                        balance: data.balance + leftAmount,
                    }
                }
            );

            // Add to discount history if discount was applied
            if (discountType && discountValue && discountAmount > 0) {
                await Patient.updateOne(
                    { _id: req.params.id },
                    {
                        $push: {
                            discounts: {
                                billCode: code,
                                discountType: discountType,
                                discountValue: Number(discountValue),
                                discountAmount: discountAmount,
                                originalPrice: course.price,
                                discountedPrice: finalPrice,
                                date: moment().locale('ar-kw').format('l'),
                                appliedBy: req.user ? req.user.username : 'System'
                            }
                        }
                    }
                );
            }

            req.flash('success', 'تمت اضافة الكورس بنجاح');
        } else {
            req.flash('error', 'المريض لم ينهي الجلسات المضافة مسبقا');
        }

        res.redirect(`/patient/get-by-id/${req.params.id}`);
    } catch (err) {
        console.log(err);
    }
});

router.put('/end-session/:id/:code/:session', async (req, res) => {
    try {
        const patientId = req.params.id;
        const courseCode = Number(req.params.code);
        const sessionNumber = Number(req.params.session);

        const patient = await Patient.findOne({ _id: patientId });

        if (!patient) {
            req.flash('error', 'المريض غير موجود');
            return res.redirect(`/patient/get-by-id/${patientId}`);
        }

        const courseIndex = patient.course.findIndex(c => c.code === courseCode);
        if (courseIndex === -1) {
            req.flash('error', 'الكورس غير موجود');
            return res.redirect(`/patient/get-by-id/${patientId}`);
        }

        const course = patient.course[courseIndex];
        let date = req.body.date;

        if (!date) {
            date = moment().locale('ar-kw').format('l'); // fallback to today
        } else {
            // Convert the received YYYY-MM-DD to the Arabic 'l' format
            date = moment(date, 'YYYY-MM-DD').locale('ar-kw').format('l');
        }

        // Step 1: Mark the correct session as Done
        for (const key of Object.keys(course.sessions)) {
            if (course.sessions[key].session === sessionNumber) {
                course.sessions[key].Done = true;
                course.sessions[key].Note = req.body.note;
                course.sessions[key].Date = date;
                patient.markModified(`course.${courseIndex}.sessions.${key}`);
                break;
            }
        }

        // Step 2: Check if all sessions are Done
        const allDone = Object.values(course.sessions).every(s => s.Done === true);
        if (allDone) {
            course.end = true;
            course.endDate = moment().locale("ar-kw").format('l');
            course.Note = req.body.note
            patient.inCourse = false;

            // 👇 Mark both end and endDate as modified
            patient.markModified(`course.${courseIndex}.end`);
            patient.markModified(`course.${courseIndex}.endDate`);
        }


        await patient.save();

        req.flash('success', 'تم انهاء الجلسة بنجاح');
        res.redirect(`/patient/get-by-id/${patientId}`);
    } catch (err) {
        console.error(err);
        req.flash('error', 'حدث خطأ اثناء انهاء الجلسة');
        res.redirect(`/patient/get-by-id/${req.params.id}`);
    }
});

router.put('/cancel-session/:id/:code/:session', async (req, res) => {
    try {
        const patientId = req.params.id;
        const courseCode = Number(req.params.code);
        const sessionNumber = Number(req.params.session);

        const patient = await Patient.findOne({ _id: patientId });

        if (!patient) {
            req.flash('error', 'المريض غير موجود');
            return res.redirect(`/patient/get-by-id/${patientId}`);
        }

        const courseIndex = patient.course.findIndex(c => c.code === courseCode);
        if (courseIndex === -1) {
            req.flash('error', 'الكورس غير موجود');
            return res.redirect(`/patient/get-by-id/${patientId}`);
        }

        const course = patient.course[courseIndex];

        // Cancel the specific session
        for (const key of Object.keys(course.sessions)) {
            if (course.sessions[key].session === sessionNumber) {
                course.sessions[key].Done = false;
                course.sessions[key].Note = '';
                course.sessions[key].Date = null;
                patient.markModified(`course.${courseIndex}.sessions.${key}`);
                break;
            }
        }

        // If any session is not done, mark course as not ended
        const allDone = Object.values(course.sessions).every(s => s.Done === true);
        if (!allDone) {
            course.end = false;
            course.endDate = null;
            patient.inCourse = true;

            patient.markModified(`course.${courseIndex}.end`);
            patient.markModified(`course.${courseIndex}.endDate`);
        }

        await patient.save();

        req.flash('success', 'تم إلغاء الجلسة بنجاح');
        res.redirect(`/patient/get-by-id/${patientId}`);
    } catch (err) {
        console.error(err);
        req.flash('error', 'حدث خطأ أثناء إلغاء الجلسة');
        res.redirect(`/patient/get-by-id/${req.params.id}`);
    }
});

router.put('/add-test/:id', async (req, res) => {
    try {
        await Patient.updateOne({ _id: req.params.id }, {
            $push: {
                tests: {
                    test: req.body.test,
                    Date: moment().locale('ar-kw').format('l')
                }
            }
        })

        req.flash('success', 'تمت اضافة الاختبار بنجاح')
        res.redirect(`/patient/get-by-id/${req.params.id}`)
    } catch (err) {
        console.log(err);
    }
})

router.put('/remove-test/:id/:test', async (req, res) => {
    try {
        await Patient.updateOne({ _id: req.params.id }, {
            $pull: {
                tests: {
                    test: req.params.test
                }
            }
        })

        req.flash('success', 'تم حذف الاختبار بنجاح')
        res.redirect(`/patient/get-by-id/${req.params.id}`)
    } catch (err) {
        console.log(err);
    }
})

router.put('/add-exercise/:id', async (req, res) => {
    try {
        await Patient.updateOne({ _id: req.params.id }, {
            $push: {
                exercise: {
                    exercise: req.body.exercise,
                    Date: moment().locale('ar-kw').format('l')
                }
            }
        })

        req.flash('success', 'تمت اضافة التمرين بنجاح')
        res.redirect(`/patient/get-by-id/${req.params.id}`)
    } catch (err) {
        console.log(err);
    }
})

router.put('/remove-exercise/:id/:exercise', async (req, res) => {
    try {
        await Patient.updateOne({ _id: req.params.id }, {
            $pull: {
                exercise: {
                    exercise: req.params.exercise
                }
            }
        })

        req.flash('success', 'تم حذف التمرين بنجاح')
        res.redirect(`/patient/get-by-id/${req.params.id}`)
    } catch (err) {
        console.log(err);
    }
})

router.get('/notes/get/:id', async (req, res) => {
    try {
        const data = await Patient.findOne({ _id: req.params.id })
        res.render('admin/patient/notes', {
            user: req.user,
            data
        })

    } catch (err) {
        console.log(err);
    }
})

router.put('/notes/add/:id', async (req, res) => {
    try {
        const { title, note } = req.body
        await Patient.updateOne({ _id: req.params.id }, {
            $push: {
                otherNotes: {
                    title,
                    note,
                    Date: moment().locale('ar-kw').format('l')
                }
            }
        })

        res.redirect(`/patient/notes/get/${req.params.id}`)
    } catch (err) {
        console.log(err);
    }
})

router.get('/get-course/:id/:code', async (req, res) => {
    try {
        const { id, code } = req.params
        const patient = await Patient.findOne({ _id: id })
        const course = patient.course.find((x) => x.code == code)

        res.render('admin/patient/course', {
            user: req.user,
            patient,
            course
        })
    } catch (err) {
        console.log(err);

    }
})


router.get('/edit-profile/:id', async (req, res) => {
    try {
        const data = await Patient.findOne({ _id: req.params.id })
        res.render('admin/patient/edit', {
            user: req.user,
            data
        })
    } catch (err) {
        console.log(err);
    }
})

router.put('/edit-profile/:id', async (req, res) => {
    try {
        const {
            name, birthDate, gender, study, address, phone, relationship,
            familyMembers, familyRank, health, psycho, RelationshipAndFamily,
            sendTo, psychoNote, Notes, therapist_diagnose, doctor_diagnose
        } = req.body;

        await Patient.updateOne({ _id: req.params.id }, {
            $set: {
                name,
                birthDate,
                gender,
                study,
                address,
                phone,
                relationship,
                familyMembers,
                familyRank,
                health,
                psycho,
                RelationshipAndFamily,
                sendTo,
                psychoNote,
                Notes,
                doctor_diagnose,
                therapist_diagnose,
            }
        })
        req.flash('success', 'تم تعديل معلومات المريض بنجاح')
        res.redirect(`/patient/get-by-id/${req.params.id}`)
    } catch (err) {
        console.log(err);
    }
})
module.exports = router