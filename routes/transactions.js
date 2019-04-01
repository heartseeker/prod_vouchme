const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Transaction = require('../models/transaction');
const _ = require('lodash');
const authenticate = require('../middleware/authenticate');
const User = require('../models/user');
const Channel = require('../models/channel');
const Vouch = require('../models/vouch');


// Creating a transaction
router.post('/', authenticate, async (req, res) => {
    const payload = _.pick(req.body, ['channel', 'partner', 'url', 'status']);
    payload['origin'] = req.user.email;
    let transaction;

    const partnerEmail = payload.partner.email;

    // check if same email for partner
    if (partnerEmail === req.user.email) {
        return res.status(400).send({ status: 400,  message: 'Invalid partner email'});
    }
    
    let partner = await User.findOne({ email: partnerEmail });

    if (!partner) {
        payload['partner'] = { partner_id: null, email: partnerEmail };
        transaction = new Transaction(payload);
        transaction = await transaction.save();
        return res.send(transaction);
    }


    payload['partner'] = { partner_id: partner.id, email: partnerEmail };
    transaction = new Transaction(payload);

    try {
        transaction = await transaction.save();
    } catch (err) {
        return res.status(400).send(err);
    }

    return res.send(transaction);
});

// update a transaction status
router.put('/:id', authenticate , async (req, res) => {
    const id = req.params.id;
    const transaction = await Transaction.findOne({ _id: id });
    
    if (!transaction || !req.body.status) {
        return res.status(400).send('Invalid request');
    }
    
    if (transaction.partner.username !== req.user.username) {
        return res.status(401).send('Not authorized');
    }
    
    try {
        await Transaction.findOneAndUpdate({ _id: id }, { $set: { 'status': req.body.status } });
    } catch (err) {
        return res.status(400).send(err);
    }
    res.send();
});

// get all current user transactions
router.get('/', authenticate, async (req, res) => {

    const limit = req.query.limit ? req.query.limit : 10;
    const page = (Math.abs(req.query.page) || 1) - 1;

    let transactions = await Transaction.find({ $or: [
        { origin: req.user.email },
        { 'partner.email': req.user.email }
    ]})
    .populate('email profile')
    .populate('partner.partner_id')
    .populate('channel')
    .limit(limit)
    .skip(limit * page)
    .sort('-_id');

    let totalTransactions = await Transaction.count({ $or: [
        { origin: req.user.email },
        { 'partner.email': req.user.email }
    ]})

    let response = [];

    transactions.forEach((v) => {
        const transaction_id = v._id;
        const channel = {
            id: v.channel._id,
            name: v.channel.name
        };
        const url = v.url;
        const status = v.status;
        const created = v._id.getTimestamp();
        let partner;
        if (v.partner.partner_id !== null) {
            const name = v.partner.partner_id.profile.first_name + ' ' + v.partner.partner_id.profile.last_name;
            partner = { email: v.partner.email, name };
        } else {
            partner = {email: v.partner.email };
        }
        const transaction = { transaction_id, channel, url, partner, status, created };
        response.push(transaction);
    });

    res.send({ data: response, count: totalTransactions});
});


// get someone transactions
router.get('/o/:email', async (req, res) => {

    const email = req.params.email;
    const limit = req.query.limit ? +req.query.limit : 10;
    const page = (Math.abs(req.query.page) || 1) - 1;

    let transactions = await Transaction.find({ $or: [
        { origin: email },
        { 'partner.email': email }
    ]})
    .populate('email profile')
    .populate('partner.partner_id')
    .populate('channel')
    .limit(limit)
    .skip(limit * page)
    .sort('-_id');


    let totalTransactions = await Transaction.count({ $or: [
        { origin: email },
        { 'partner.email': email }
    ]})

    let response = [];

    transactions.forEach((v) => {
        const transaction_id = v._id;
        const channel = {
            id: v.channel._id,
            name: v.channel.name
        };
        const url = v.url;
        const status = v.status;
        const created = v._id.getTimestamp();
        let partner;
        if (v.partner.partner_id !== null) {
            const name = v.partner.partner_id.profile.first_name + ' ' + v.partner.partner_id.profile.last_name;
            partner = { email: v.partner.email, name };
        } else {
            partner = {email: v.partner.email };
        }
        const transaction = { transaction_id, channel, url, partner, status, created };
        response.push(transaction);
    });

    res.send({ data: response, count: totalTransactions});
});

// count all social vouches
router.get('/social', async (req, res) => {

    const to = req.query.to;
    let user;
    try {
        user = await User.findOne({ _id: to });
        if (!user) {
            throw 'User does not exist!';
        }
    } catch (err) {
        return res.status(400).send(err);
    }
    
    const data = {};
    data['socials'] = {
        on_going: 0,
        success: 0,
        cancelled: 0
    };
    // Transaction
    const agg = [
        { $match: { $or: [{ origin: user.username }, { 'partner.username': user.username }] } },
        { $group: { _id: "$channel", count:{ $sum: 1} } }
    ];
    const socialAgg = [
        { $match: { $or: [{ origin: user.username }, { 'partner.username': user.username }] } },
        { $group: { _id: "$status", count:{ $sum: 1} } }
    ];

    const transactions = await Transaction.aggregate(agg);
    const socials = await Transaction.aggregate(socialAgg);

    socials.map(social => {
        if (social._id == 1)
            data['socials']['on_going'] = social.count;
        if (social._id == 2)
            data['socials']['success'] = social.count;
        if (social._id == 3)
            data['socials']['cancelled'] = social.count;
    });

    data['total'] = 0;

    channels = await Channel.find({ $or: [{ status: 1 }, { user: user._id }] });
    const p = transactions.map((v, index) => {
        const i = channels.findIndex(o => String(o._id) === String(v._id));
        transactions[index].name = channels[i].name;
        data.total += v.count;
    });

    // count number of vouches
    let vouchCount = await Vouch.count({ to:  to});
    data['vouch'] = vouchCount;

    await Promise.all(p);
    data['data'] = transactions;
    res.send(data);
});



router.get('/public', async (req, res) => {
    const users = await User.count({});
    const verified = await User.count({ verified: 1 });
    const transactions = await Transaction.count({});
    const success = await Transaction.count({ status: 2 });

    await Promise.all([users, verified, transactions, success]);

    res.send({ users, verified, transactions, success });
});

module.exports = router;