const mongoose = require('mongoose')
const URI = "mongodb://127.0.0.1:27017/clinic"

mongoose.set('strictQuery', false);

mongoose.connect(URI)
.then(() => {
    console.log("Database connected");
})
.catch((err) => {
    console.log(err);
})