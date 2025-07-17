const express = require('express')
const router = express.Router()
const moment = require('moment')
const isAdminMiddleWare = require('../middlewares/isAdmin')
const Patient = require('../models/Patient')
const QRCode = require('qrcode');
const Course = require('../models/Course')
const Tests = require('../models/Tests')
const Exercise = require('../models/Exercise')

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
            sendTo, psychoNote, Notes, course, therapist_diagnose, doctor_diagnose, type
        } = req.body;

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
                dateAdded: moment().locale('ar-kw').format('l')
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

                    await Patient.updateOne(
                        { _id: newPatient._id },
                        {
                            $push: {
                                course: {
                                    sessions: sessionsObj,
                                    end: false,
                                    price: foundCourse.price,
                                    Date: moment().locale('ar-kw').format('l'),
                                    endDate: null,
                                    code: newCode,
                                },
                                bills: {
                                    code: newCode,
                                    price: foundCourse.price,
                                    sessions: foundCourse.sessions,
                                    Date: moment().locale('ar-kw').format('l'),
                                    paid: false,
                                    left: -foundCourse.price,
                                },
                            },
                            $set: {
                                inCourse: true,
                                balance: -foundCourse.price
                            }
                        }
                    );
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
    try {
        const buffer = await QRCode.toBuffer(`http://142.93.171.214/patient/get/${code}`, {
            type: 'png',
            width: 300,
            errorCorrectionLevel: 'H'
        },
        );

        res.set({
            'Content-Type': 'image/png',
            'Content-Disposition': `attachment; filename="qrcode-${code}.png"`
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
        res.render('admin/patient/history', {
            user: req.user,
            data
        })
    } catch (err) {
        console.log(err);

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

router.put('/add-course/:id', async (req, res) => {
    try {
        const course = await Course.findOne({ sessions: req.body.course });
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
            await Patient.updateOne(
                { _id: req.params.id },
                {
                    $push: {
                        course: {
                            sessions: sessionsObj,
                            end: false,
                            price: course.price,
                            Date: moment().locale('ar-kw').format('l'),
                            endDate: null,
                            code,
                        },
                        bills: {
                            code,
                            price: course.price,
                            sessions: course.sessions,
                            Date: moment().locale('ar-kw').format('l'),
                            paid: false,
                            left: -course.price,
                        },
                    },
                    $set: {
                        inCourse: true,
                        balance: data.balance - course.price,
                    }
                }
            );

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

        // Step 1: Mark the correct session as Done
        for (const key of Object.keys(course.sessions)) {
            if (course.sessions[key].session === sessionNumber) {
                course.sessions[key].Done = true;
                course.sessions[key].Note = req.body.note;
                course.sessions[key].Date = moment().locale('ar-kw').format('l');
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