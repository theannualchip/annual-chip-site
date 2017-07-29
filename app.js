var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var passport = require('passport');
var local_strategy = require('passport-local').Strategy;
var parser = require('body-parser');
var multer  = require('multer');
var urlencodedParser = parser.urlencoded({ extended: false });
var pgp = require('pg-promise')();
var db = require("./db.js");

var index = require('./routes/index');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(logger('dev'));
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

app.use(cookieParser());
var session = require('express-session');
var pg_session = require('connect-pg-simple')(session);
app.use(session({
    store: new pg_session({
        conObject: {
            host: 'chip-db.cclyf5gm9q8m.us-west-2.rds.amazonaws.com',
            port: 5432,
            database: 'the_annual_chip',
            user: process.env.db_user,
            password: process.env.db_password
        }
    }),
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
    secret: 'chip secret',
    resave: false,
    saveUninitialized: false
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(passport.initialize());
app.use(passport.session());

app.use('/', index);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
