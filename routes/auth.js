const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const _ = require('lodash');
const jwt = require('jsonwebtoken');
const request = require('request');
const fs = require('fs');
var http = require('http');

// authenticating a user
router.post('/', async (req, res) => {
    let user;
    let valid;
    const usernameOrPassword = req.body.username;
    try {
        user = await User.findOne({
            $and: [
                { $or: [
                    { 'username': usernameOrPassword },
                    { 'email': usernameOrPassword },
                ]}
            ]
        });
        if (!user) {
            res.status(401).send({ status: 401,  message: 'Invalid username or password'});
            return;
        };

        valid = await bcrypt.compare(req.body.password, user.password);
        if (!valid) {
            res.status(401).send({ status: 401,  message: 'Invalid username or password'});
            return;
        } 

    } catch (err) {
        res.status(400).send(err);
    }
    
    const token = user.generateAuthToken();
    res.send({token});
});


router.post('/social', async (req, res) => {
    let user;

    const userId = req.body.id;
    const token = req.body.token;
    const email = req.body.email;
    const type = req.body.type;
    const photoUrl = req.body.photoUrl;

    if (!token) {
        return res.status(400).send({status: 400, message: 'token is required'});
    }
    if (!userId) {
        return res.status(400).send({status: 400, message: 'id is required'});
    }
    if (!email) {
        return res.status(400).send({status: 400, message: 'email is required'});
    }
    if (!type) {
        return res.status(400).send({status: 400, message: 'type is required'});
    }

    try {
        user = await User.findOne(_.pick(req.body, ['email']));
        if (!user) {
            return res.status(401).send({ status: 401,  message: 'Invalid email address / Not yet registered'});
        };
    } catch (err) {
        return  res.status(400).send(err);
    }

    request(`https://graph.facebook.com/${userId}/permissions?access_token=${token}`, async function (error, response, body) {

        // save facebook image if new user
        if (type === 'new') {
            const image_name = 'picture.jpg';
            const image = String(photoUrl).replace('picture?type=normal', 'picture?type=large');    
            const destination = 'public/uploads/' + user._id;
            
            if (!fs.exists(destination)){
                fs.mkdir(destination);
            }
            
            const imageFullPath = `${destination}/${image_name}`;
            
            await User.findOneAndUpdate(
                { _id: user._id}, 
                { $set: { 'profile.picture': image_name } }, 
                { new: true, runValidators: true }
            );

                            
            request(image, function (error, response, body) {
                const token = user.generateAuthToken();

                const options = {
                    method: 'POST',
                    url: 'http://vouchme.online/upload.php',
                    // url: 'http://localhost/upload.php',
                    json: true,
                    formData : {
                        'picture' : fs.createReadStream(imageFullPath),
                        'user_id': user._id.toString()
                    }
                };

                request(options, function (err, resp, body) {
                    if (err) {
                        return console.error('upload failed:', err);
                    }
                    return res.status(response.statusCode).send({token, body});
                });


            }).pipe(fs.createWriteStream(imageFullPath));;

        } else {
            if (response.statusCode === 200) {
                const token = user.generateAuthToken();
                return res.status(response.statusCode).send({token});
            }
        }

    });
});

module.exports = router;