var passport = require('passport')
var local_strategy = require('passport-local').Strategy;
var pgp = require('pg-promise')();
var db = require("../db.js");
var moment = require('moment');
var bcrypt = require('bcrypt-nodejs');
var schedule = require('node-schedule');
const salt_rounds = 10;

function add_session(identifier) {
    console.log("Creating session for \x1b[34m" + identifier.email + "\x1b[0m");
    db.query("INSERT INTO current_sessions (session_id,email,last_active) VALUES ($1, $2, $3)", [identifier.session_id, identifier.email, moment()])
        .then(function(data) {
            console.log("Session created for \x1b[34m" + identifier.email + "\x1b[0m");
        })
        .catch(function(error) {
            console.log("Couldn't create session for \x1b[34m" + identifier.email + "\x1b[0m as an error occured:");
            console.log(error);
        });
}

function update_session_timestamp(user) {
    db.query("UPDATE current_sessions SET last_active = $1 WHERE session_id=$2 AND email=$3", [moment(), user.session_id, user.email])
        .then(function(data) {
            console.log("\x1b[42m\x1b[37mSuccessfully updated session timestamp for\x1b[0m \x1b[34m" + user.email + "\x1b[0m");
        })
        .catch(function(error) {
            console.log("Couldn't update session timestamp for \x1b[34m" + user.email + "\x1b[31m as there was an error quering the current_sessions database\x1b[0m:");
            console.log(error);
        });
}
 
var sessions_purge = schedule.scheduleJob('0 0 0 * * *', function(){
  console.log("\x1b[33mPurging current_sessions for stale sessions\x1b[0m");
  cutoff_time=moment().subtract(1, 'days');
      db.query("DELETE FROM current_sessions WHERE last_active<$1", [cutoff_time])
        .then(function(data) {
            console.log("\x1b[42m\x1b[37mSuccessfully purged stale sessions from current_sessions\x1b[0m");
        })
        .catch(function(error) {
            console.log("\x1b[31mCouldn't purge current_sessions as there was an error quering the current_sessions database\x1b[0m:");
            console.log(error);
        });

});

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
                            add_session(identifier);
                            return done(null, { session_id: req.sessionID, email: data[0].email, username:data[0].username });
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
    db.query("SELECT email FROM current_sessions WHERE session_id=$1 AND email=$2", [user.session_id, user.email])
        .then(function(data) {
            if (data.length > 0) {
                console.log("\x1b[42m\x1b[37mSuccessfully authenticated session for\x1b[0m \x1b[34m" + user.email + "\x1b[0m");
                update_session_timestamp(user);
                return done(null, user);
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
