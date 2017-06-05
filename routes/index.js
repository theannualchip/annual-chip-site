/* Dependancies */

var express = require('express');
var router = express.Router();
var pgp = require('pg-promise')();
var tom_js = require("../public/javascripts/tom.js");

/* DB Connection */

const db_connection_string = 'https://the_annual_chip:the_annual_chip@chip-db.cclyf5gm9q8m.us-west-2.rds.amazonaws.com:5432/the_annual_chip';
var db = pgp(db_connection_string);

/* SAM SECTION. */

router.get('/', function(req, res, next) {
    db.query('SELECT * FROM users_example WHERE username = $1', ['T Bish'])
        .then(data => {
            console.log(JSON.stringify(data));
            res.render('index', {
                title: 'The Annual Chip',
                users: JSON.stringify(data)
            });
        })
        .catch(error => {
            console.log(error);
        });
});

/* TOM SECTION. */

router.get('/scorecard', function(req, res, next) {

    tom_js.get_short_leaderboard(db, 1).then(function(data){console.log(JSON.stringify(data));})

    res.render('scorecard', { title: 'Scorecard'});
});

/* General Stuff */

module.exports = router;
