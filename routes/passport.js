const express = require('express')
const router = express.Router()
const User = require('../models/User')
const bcrypt = require('bcrypt')
const moment = require('moment')

async function createUser() {
    const newUser = new User({
        name: 'Mustafa',
        email: 'imtbymail@gmail.com',
        password: await bcrypt.hash('123', 10),
        isAdmin: true
    })

    await newUser.save()
    console.log("User created");
    
}

router.get('/login', async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.cookies.id })
        console.log(user);
        
        res.render('passport/login', {
            user: user
        })
    } catch (err) {
        console.log(err);
    }
})

router.post('/login', async (req, res) => {
    try {
        const {email , password} = req.body
        const user = await User.findOne({ email: email })

        if(user){
            const compare = await bcrypt.compare(password, user.password)
            if(compare){
                res.cookie("id", user.id, { maxAge: moment().add(4, "months") })
                res.redirect('/dashboard')
            } else {

            }
        } else {

        }
    } catch (err) {
        console.log(err);
    }
})
module.exports = router