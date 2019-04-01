const mongoose = require('../db/mongoose');
const Schema = mongoose.Schema;

// status type: 0 = neutral
// status type: 1 = vouch
// status type: 2 = infame

const RecordSchema = new Schema({
    from: {
        type: Schema.Types.ObjectId, ref: 'User',
        required: true,
        trim: true,
    },
    to: {
        type: Schema.Types.ObjectId, ref: 'User',
        required: true,
        trim: true,
    },
    status: {
        type: Number,
        required: true,
    }
});


module.exports = mongoose.model('Record', RecordSchema);