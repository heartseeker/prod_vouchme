const mongoose = require('../db/mongoose');
const Schema = mongoose.Schema;
const validator = require('validator');
const jwt = require('jsonwebtoken');
const _ = require('lodash');
const bcrypt = require('bcryptjs');
const ProfileSchema = require('../models/profile');
const SocialSchema = require('../models/social');
const fs = require('fs');
const request = require('request');
const Transaction = require('./transaction');
const Record = require('./record');

const UserSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: (value) => {
                return validator.isEmail(value)
            },
            message: '{VALUE} is not a valid email'
        }
    },
    username: {
        type: String,
        trim: true,
    },
    password: {
        type: String,
        trim: true,
        minlength: 8
    },
    
    profile: ProfileSchema,
    social: [SocialSchema],
    account: {
        type: String,
        required: true,
        default: 'local'
    }
}, {
    toObject: { virtuals: true }
});



UserSchema.methods.generateTransactions =  function () {
    const user = this;
    return Transaction.count({ $or: [
        { origin: user.email },
        { 'partner.email': user.email }
    ]});
}


UserSchema.methods.generateVouches =  function () {
    const user = this;
    return Record.count({ to: user.id, status: 1 });
}

UserSchema.methods.generateInfames =  function () {
    const user = this;
    return Record.count({ to: user.id, status: 2 });
}


UserSchema.methods.generateAuthToken = function () {
    const user = this;
    return jwt.sign({_id: user.id}, 'abc123', {expiresIn: '8h'}).toString();
}

UserSchema.methods.download = function(uri, filename, callback){
    request.head(uri, function(err, res, body){
        if (err) {
            fs.writeFile("/tmp/errors.txt", err, function(error) {
                if(error) {
                    return console.log(error);
                }
                console.log("The file was saved!");
            }); 
        }
        request(uri).on('close', callback).pipe(fs.createWriteStream(filename));
    });
  };


// hash password before save
// =======================================
UserSchema.pre('save', async function(next) {

    const user = this;

    if (user.isModified('password')) {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(user.password, salt);
        user.password = hash;
        return next();
    } 
    return next();
});

module.exports = mongoose.model('User', UserSchema);

