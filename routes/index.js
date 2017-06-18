/* Dependancies */

var express = require('express');
var router = express.Router();
var pgp = require('pg-promise')();
var tom_js = require("../public/javascripts/tom.js");
var db = require("../db.js");
var passport_setup = require('./passport_setup.js');
var passport = require('passport');
var bcrypt = require('bcrypt-nodejs');
const salt_rounds = 10;

/* SAM SECTION. */

router.post('/user_login', function(req, res, next) {
    passport.authenticate('local', { badRequestMessage: "Looks like you are missing either your email or password." }, function(error, user, info) {
        if (error || !user || user == false) {
            return res.render('login', { warning: info.message });
        }
        req.login(user, loginErr => {
            if (loginErr) {
                return next(loginErr);
            }
            console.log("Redirecting \x1b[34m" + req.session.passport.user.email + "\x1b[0m to index.ejs");
            return res.redirect('/');
        });
    })(req, res, next);
});

router.post('/user_signup', function(req, res, next) {
    if (req.isAuthenticated() && req.session.passport.user.is_admin) {
        if (req.body.is_admin) {
            is_admin = true;
        } else {
            is_admin = false;
        }
        console.log("Creating new user: \x1b[34m" + JSON.stringify(req.body) + "\x1b[0m");
        bcrypt.genSalt(salt_rounds, function(err, salt) {
            console.log(err);
            console.log("taco1");
            bcrypt.hash(req.body.password, salt, null, function(err, hash) {
                console.log(err);
                console.log("taco2");
                db.query("INSERT INTO golfers (username,email,password,is_admin) VALUES ($1,$2,$3,$4)", [req.body.username, req.body.email,hash,is_admin])
                .then(function(data) {
                        console.log("\x1b[42m\x1b[37mSuccessfully created user for\x1b[0m \x1b[34m" + JSON.stringify(req.body) + "\x1b[0m");
                        res.render('admin', { user: req.session.passport.user.username, is_admin: req.session.passport.user.is_admin, sign_up_success:"Success! Signed up " + req.body.email + "."});
                })
                .catch(function(error) {
                    console.log("Couldn't sign up user \x1b[34m" + JSON.stringify(req.body) + "\x1b[31m error quering the golfers database\x1b[0m:");
                    console.log(error);
                    res.render('admin', { user: req.session.passport.user.username, is_admin: req.session.passport.user.is_admin, sign_up_success:"Couldn't sign up user as there was an error quering the golfers database." });
                });
            });
        });
    } else {
        res.redirect('/');
    }
});

router.get('/',
    function(req, res, next) {
        if (req.isAuthenticated()) {
            res.render('index', { user: req.session.passport.user.username, is_admin: req.session.passport.user.is_admin });
        } else {
            res.redirect('/login');
        }
    }
);

router.get('/login', function(req, res, next) {
    req.session.destroy(function(err) {
        res.render('login', {});
    });
})

router.get('/admin', function(req, res, next) {
    if (req.isAuthenticated() && req.session.passport.user.is_admin) {
        res.render('admin', { user: req.session.passport.user.username, is_admin: req.session.passport.user.is_admin });
    } else {
        res.redirect('/');
    }
})

/* TOM SECTION. */

router.get('/scorecard', function(req, res, next) {


    tom_js.get_short_lboard(db, 1)
        .then(data => {

            lboard_html = tom_js.format_lboard(data)

            res.render('scorecard', {
                title: 'Scorecard',
                leaderboard: lboard_html
            })
        }).catch(error => { console.log(error) })

    // console.log(JSON.stringify(leaderboard_s));

    // res.render('scorecard', { title: 'Scorecard'});
});

/* General Stuff */

module.exports = router;
