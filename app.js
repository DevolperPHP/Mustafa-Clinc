const express = require('express')
const app = express()
const db = require('./config/db')
const cookieParsre = require('cookie-parser')
const methodOverride = require('method-override')
const session = require("express-session")
const flash = require('express-flash')
const bodyParser = require('body-parser')
const passport = require('./routes/passport')
const index = require('./routes/index')
const patient = require('./routes/patient')
const tests = require('./routes/tests')
const course = require('./routes/course')
const bills = require('./routes/bills')
const exercise = require('./routes/exercise')
const fees = require('./routes/fees')
const expenses = require('./routes/expenses')
const analysis = require('./routes/analysis')
const dates = require('./routes/dates')

let port = 3000;
app.set('view engine', 'ejs')

app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static("public"))
app.use(cookieParsre())
app.use(methodOverride("_method"))
app.use(session({
    secret: 'secret',
    cookie: { maxAge: 60000 },
    resave: false,
    saveUninitialized: false
}))
app.use(flash());

app.use('/passport', passport)
app.use('/', index)
app.use('/patient', patient)
app.use('/tests', tests)
app.use('/course', course)
app.use('/bills', bills)
app.use('/exercise', exercise)
app.use('/fees', fees)
app.use('/expenses', expenses)
app.use('/analysis', analysis)
app.use('/dates', dates)

app.listen(port, (err) => {
    if(err) throw err
    console.log(`Server is running on port ${port}`);
})