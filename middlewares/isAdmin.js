const User = require('../models/User')

const isAdmin = async (req, res, next) => {
    try {
        const user = await User.findOne({ _id: req.cookies.id })
        if (user) {
            if (user.isAdmin == true) {
                req.user = user
                next()
            } else {
                res.send("YOU HAVE NO ACCESS TO THIS PAGE")
            }
        } else {
            res.send("YOU HAVE NO ACCESS TO THIS PAGE")
        }
    } catch (err) {
        console.log(err);
    }
}

module.exports = isAdmin