var passport = require('passport')
var local_strategy = require('passport-local').Strategy;
var pgp = require('pg-promise')();
var db = require("../db.js");
var moment = require('moment');
var bcrypt = require('bcrypt-nodejs');

const salt_rounds = 10;

function update_last_used(email) {
    console.log("Updating last_active field for \x1b[34m" + email + "\x1b[0m");
    db.query("UPDATE golfers SET last_active=$1 WHERE email=$2", [moment.utc(), email])
        .then(function(data) {
            console.log("\x1b[42m\x1b[37mSuccessfully updated last_active field for\x1b[0m \x1b[34m" + email + "\x1b[0m");
        })
        .catch(function(error) {
            console.log("\x1b[34m" + email + "\x1b[31m wasn't able to update last_active field because there was an error quering the golfers database\x1b[0m:");
            console.log(error);
        });
}

passport.use(new local_strategy({
        usernameField: "email",
        passwordField: "password",
        passReqToCallback: true
    },
    function(req, email, password, done) {
        email = email.toLowerCase();
        console.log("\x1b[34m" + email + "\x1b[0m is attempting to log in");
        db.query("SELECT * FROM golfers WHERE email=$1", [email])
            .then(function(data) {
                if (data.length == 0) {
                    console.log("\x1b[34m" + email + "\x1b[31m wasn't able to log in because that user doesn't exist\x1b[0m");
                    return done(null, false, { message: "It doesn't look like we have a user registered with " + email + "." })
                } else {
                    bcrypt.compare(password, data[0].password, function(err, res) {
                        if (res == true) {
                            identifier = { session_id: req.sessionID, email: data[0].email };
                            console.log("\x1b[34m" + email + "\x1b[42m \x1b[37msuccessfully logged in\x1b[0m");
                            update_last_used(data[0].email);
                            return done(null, { session_id: req.sessionID, email: data[0].email, username: data[0].username, is_admin: data[0].is_admin });
                        } else {
                            console.log("\x1b[34m" + email + "\x1b[31m wasn't able to log in because their password was wrong\x1b[0m");
                            return done(null, false, { message: "Woops! I don't think that is the correct password." });
                        }
                    });
                }
            })
            .catch(function(error) {
                console.log("\x1b[34m" + email + "\x1b[31m wasn't able to log in because there was an error quering the golfers database\x1b[0m:");
                console.log(error);
                return done(error, false, { message: "Something went wrong! Try submitting the form again." });
            });
    }));

passport.serializeUser(function(user, done) {
    console.log("Serialising session into cookie for \x1b[34m" + user.email + "\x1b[0m");
    done(null, user);
});

passport.deserializeUser(function(user, done) {
    console.log("Authenticating session for \x1b[34m" + user.email + "\x1b[0m");
    db.query("SELECT sid, sess FROM session WHERE sid=$1", [user.session_id])
        .then(function(data) {
            if (data.length > 0) {
                if (data[0].sess.passport.user.email == user.email) {
                    console.log("\x1b[42m\x1b[37mSuccessfully authenticated session for\x1b[0m \x1b[34m" + user.email + "\x1b[0m");
                    update_last_used(user.email);
                    return done(null, user);
                } else {
                    console.log("\x1b[31mCouldn't authenticate due to mismatch of cookie id and session id for \x1b[34m" + user.email + "\x1b[0m");
                    return done(null, false);
                }
            } else {
                console.log("\x1b[33mNo session exists for \x1b[34m" + user.email + "\x1b[31m")
                return done(null, false);
            }
        })
        .catch(function(error) {
            console.log("Couldn't authenticate session for \x1b[34m" + user.email + "\x1b[31m error quering the current_sessions database\x1b[0m:");
            console.log(error);
            return done(null, false);
        });
});
