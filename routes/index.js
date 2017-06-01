var express = require('express');
var router = express.Router();

/* SAM SECTION. */

router.get('/', function(req, res, next) {
  res.render('index', { title: 'The Annual Chip' });
});

/* TOM SECTION. */

router.get('/scorecard', function(req, res, next) {
  res.render('scorecard', { title: 'Scorecard' });
});

/* General Stuff */

module.exports = router;


