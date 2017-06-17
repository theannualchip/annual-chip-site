/* Dependancies */

var express = require('express');
var router = express.Router();
var pgp = require('pg-promise')();
var tom_js = require("../public/javascripts/tom.js");
var db= require("../db.js");

/* SAM SECTION. */

router.get('/', function(req, res, next) {
    res.redirect('/login');
});

router.get('/login', function(req, res, next) {
    res.render('login');
});

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
