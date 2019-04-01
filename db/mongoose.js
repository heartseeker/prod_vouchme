const mongoose = require('mongoose');

// connect to mongoose
// ==============================================
// mongoose.connect('mongodb://localhost/expressvouchme')
mongoose.connect('mongodb+srv://alex:alex123456@m1075-nzfog.mongodb.net/vouchme')
.then(() => {
    console.log('Connect to mongodb success!');
})
.catch((err) => {
    console.log('err: ', err);
});

module.exports = mongoose;