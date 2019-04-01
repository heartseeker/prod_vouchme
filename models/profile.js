const mongoose = require('../db/mongoose');
const Schema = mongoose.Schema;
const validator = require('validator');
const jwt = require('jsonwebtoken');
const _ = require('lodash');

const ProfileSchema = new Schema({
    first_name: {
        type: String,
        required: true,
        trim: true,
        minlength: 3
    },
    last_name: {
        type: String,
        required: true,
        trim: true,
        minlength: 3
    },
    middle_name: {
        type: String,
        trim: true,
    },
    phone: {
        type: String,
        trim: true,
    },
    address: {
        type: String,
        trim: true,
    },
    region: {
        type: String,
        trim: true,
    },
    zip: {
        type: String,
        trim: true,
    },
    gender: {
        type: String,
        trim: true,
    },
    dob: {
        type: String,
        trim: true,
    },
    id1: {
        type: String,
        trim: true,
    },
    id2: {
        type: String,
        trim: true,
    },
    billing: {
        type: String,
        trim: true,
    },
    picture: {
        type: String,
        trim: true,
    }
});


module.exports = ProfileSchema;