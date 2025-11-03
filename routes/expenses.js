const express = require('express')
const router = express.Router()
const isAdminMiddleWare = require('../middlewares/isAdmin')
const Expenses = require('../models/Expenses')
const moment = require('moment')

router.use(isAdminMiddleWare)

// Main expenses page
router.get('/', async (req, res) => {
    try {
        let nowDate = moment().locale('ar-kw').format('l');
        const expenses = await Expenses.find({}).sort({ date: -1 });
        // Calculate totals
        const todayExpenses = expenses.filter(e => e.date === nowDate);
        const todayTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

        // Store formatted date for filter link
        const todayDateForFilter = moment(nowDate, 'DD/MM/YYYY').format('YYYY-MM-DD');
        const monthExpenses = expenses.filter(e => {
            const expDate = moment(e.date, 'DD/MM/YYYY');
            return expDate.isSame(moment(), 'month');
        });
        const monthTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
        const totalAllTime = expenses.reduce((sum, e) => sum + e.amount, 0);

        // Calculate title totals
        const titleTotals = {};
        monthExpenses.forEach(expense => {
            if (!titleTotals[expense.title]) {
                titleTotals[expense.title] = 0;
            }
            titleTotals[expense.title] += expense.amount;
        });

        res.render('admin/expenses/expenses', {
            user: req.user,
            expenses,
            nowDate,
            todayDateForFilter,
            todayTotal,
            monthTotal,
            totalAllTime,
            titleTotals,
            suc: req.flash('suc'),
            err: req.flash('error')
        });
    } catch (err) {
        console.log(err);
        res.status(500).send('Server Error');
    }
});

// Add new expense
router.post('/new', async (req, res) => {
    try {
        let { title, description, amount, date, notes } = req.body;

        if (!date) {
            date = moment().locale('ar-kw').format('l');
        } else {
            date = moment(date, 'YYYY-MM-DD').locale('ar-kw').format('l');
        }

        await new Expenses({
            title,
            description,
            amount: Number(amount),
            date,
            notes
        }).save();

        req.flash('suc', `تمت إضافة المصروف بنجاح`);
        res.redirect('/expenses');
    } catch (err) {
        console.log(err);
        req.flash('error', 'حدث خطأ أثناء إضافة المصروف');
        res.redirect('/expenses');
    }
});

// Delete expense
router.delete('/delete/:id', async (req, res) => {
    try {
        await Expenses.deleteOne({ _id: req.params.id });
        req.flash('suc', 'تم حذف المصروف بنجاح');
        res.redirect('/expenses');
    } catch (err) {
        console.log(err);
        req.flash('error', 'حدث خطأ أثناء حذف المصروف');
        res.redirect('/expenses');
    }
});

// Filter by date
router.get('/filter/date/:date', async (req, res) => {
    try {
        const searchDate = moment(req.params.date, 'YYYY-MM-DD').locale('ar-kw').format('l');
        const expenses = await Expenses.find({ date: searchDate }).sort({ date: -1 });

        const todayDateForFilter = moment().locale('ar-kw').format('YYYY-MM-DD');

        // Calculate totals for filtered date
        const todayTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
        const monthExpenses = await Expenses.find({}).sort({ date: -1 }).then(allExpenses => {
            return allExpenses.filter(e => {
                const expDate = moment(e.date, 'DD/MM/YYYY');
                return expDate.isSame(moment(), 'month');
            });
        });
        const monthTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
        const totalAllTime = await Expenses.find({}).then(all => all.reduce((sum, e) => sum + e.amount, 0));

        // Calculate title totals for month
        const titleTotals = {};
        monthExpenses.forEach(expense => {
            if (!titleTotals[expense.title]) {
                titleTotals[expense.title] = 0;
            }
            titleTotals[expense.title] += expense.amount;
        });

        res.render('admin/expenses/expenses', {
            user: req.user,
            expenses,
            nowDate: searchDate,
            todayDateForFilter,
            todayTotal,
            monthTotal,
            totalAllTime,
            titleTotals,
            suc: req.flash('suc'),
            err: req.flash('error')
        });
    } catch (err) {
        console.log(err);
        res.status(500).send('Server Error');
    }
});

// Filter by date range
router.get('/filter/date-range/:from/:to', async (req, res) => {
    try {
        const fromDate = moment(req.params.from, 'YYYY-MM-DD').locale('ar-kw').format('l');
        const toDate = moment(req.params.to, 'YYYY-MM-DD').locale('ar-kw').format('l');

        const allExpenses = await Expenses.find({}).sort({ date: -1 });

        const todayDateForFilter = moment().locale('ar-kw').format('YYYY-MM-DD');
        const expenses = allExpenses.filter(expense => {
            const expDate = moment(expense.date, 'DD/MM/YYYY');
            return expDate.isBetween(fromDate, toDate, 'day', '[]');
        });

        let nowDate = moment().locale('ar-kw').format('l');
        const todayExpenses = expenses.filter(e => e.date === nowDate);
        const todayTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
        const monthExpenses = allExpenses.filter(e => {
            const expDate = moment(e.date, 'DD/MM/YYYY');
            return expDate.isSame(moment(), 'month');
        });
        const monthTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
        const totalAllTime = allExpenses.reduce((sum, e) => sum + e.amount, 0);

        // Calculate title totals for month
        const titleTotals = {};
        monthExpenses.forEach(expense => {
            if (!titleTotals[expense.title]) {
                titleTotals[expense.title] = 0;
            }
            titleTotals[expense.title] += expense.amount;
        });

        res.render('admin/expenses/expenses', {
            user: req.user,
            expenses,
            nowDate: `${fromDate} - ${toDate}`,
            todayDateForFilter,
            todayTotal,
            monthTotal,
            totalAllTime,
            titleTotals,
            suc: req.flash('suc'),
            err: req.flash('error')
        });
    } catch (err) {
        console.log(err);
        res.status(500).send('Server Error');
    }
});

// Filter by category
router.get('/filter/title/:title', async (req, res) => {
    try {
        const expenses = await Expenses.find({ title: req.params.title }).sort({ date: -1 });

        let nowDate = moment().locale('ar-kw').format('l');
        const todayDateForFilter = moment().locale('ar-kw').format('YYYY-MM-DD');
        const todayExpenses = expenses.filter(e => e.date === nowDate);
        const todayTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
        const monthExpenses = await Expenses.find({}).sort({ date: -1 }).then(allExpenses => {
            return allExpenses.filter(e => {
                const expDate = moment(e.date, 'DD/MM/YYYY');
                return expDate.isSame(moment(), 'month');
            });
        });
        const monthTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
        const totalAllTime = await Expenses.find({}).then(all => all.reduce((sum, e) => sum + e.amount, 0));

        // Calculate title totals for month
        const titleTotals = {};
        monthExpenses.forEach(expense => {
            if (!titleTotals[expense.title]) {
                titleTotals[expense.title] = 0;
            }
            titleTotals[expense.title] += expense.amount;
        });

        res.render('admin/expenses/expenses', {
            user: req.user,
            expenses,
            nowDate,
            todayDateForFilter,
            todayTotal,
            monthTotal,
            totalAllTime,
            titleTotals,
            suc: req.flash('suc'),
            err: req.flash('error')
        });
    } catch (err) {
        console.log(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router
