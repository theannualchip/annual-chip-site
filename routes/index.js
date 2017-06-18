/* Dependancies */

var express = require('express');
var router = express.Router();
var pgp = require('pg-promise')();
var tom_js = require("../public/javascripts/tom.js");
var db = require("../db.js");
var passport_setup = require('./passport_setup.js');
var passport = require('passport');

var parser = require('body-parser');
var urlencodedParser = parser.urlencoded({extended : false});

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

router.get('/',
    function(req, res, next) {
        if (req.isAuthenticated()) {
            res.render('index', { title: req.session.passport.user.username });
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
