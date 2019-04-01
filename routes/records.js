const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const _ = require('lodash');
const authenticate = require('../middleware/authenticate');
const Record = require('../models/record');
const User = require('../models/user');
const Transaction = require('../models/transaction');

router.post('/', authenticate, async(req, res) => {
    const to = req.body.to;
    let status = req.body.status;

    if (status > 2) {
        return res.status(400).send({ status: 400, message: 'Invalid request' });
    } 

    let record = await Record.findOne({ from: req.user._id, to: to});

    if (record) {
        const r = await Record.findOneAndUpdate(
            { from: req.user._id, to: to}, 
            { $set: { 'status': status } }, 
            { new: true, runValidators: true }
        );
        return res.send(r);
    }

    const r = new Record({ from: req.user._id, to: to, status: status });

    try {
        let save = await r.save();
        if (!save) 
        return res.status(400).send({ status: 400, message: 'Error saving.' });
    } catch (err) {
        return res.status(200).send(err);
    }

    res.send(r);
});

router.get('/:user_id', async(req, res) => {
    const user_id = req.params.user_id;
    const status = req.query.status;

    let response = {};
    let promises = [];
    let data = [];


    if (status > 2) {
        return res.status(400).send({ status: 400, message: 'Invalid request' }); 
    }

    const limit = 10;
    const page = (Math.abs(req.query.page) || 1) - 1;

    let records = await Record.find({ to: user_id, status: status })
    .populate({ path: 'from', select: '-password' })
    .limit(limit)
    .skip(limit * page)
    .sort('-_id');


    promises = records.map(async (record) => {
        const t = await record.from.generateTransactions();
        const v = await record.from.generateVouches();
        const i = await record.from.generateInfames();

        data.push({
            user: record.from,
            transactions: t,
            vouches: v,
            infames: i,
        })
    });

    let totalRecords = await Record.count({ to: user_id, status: status });
    response['count'] = totalRecords;

    await Promise.all(promises);
    response['data'] = data;


    return res.status(200).send(response);
});



module.exports = router;