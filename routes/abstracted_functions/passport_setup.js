/************************************* THIRD PARTY DEPENDANCIES **********************************/

var passport = require('passport')
var local_strategy = require('passport-local').Strategy;
var moment = require('moment');
var bcrypt = require('bcrypt-nodejs');

/**************************************** ABSTRACTED FUNCTIONS ***********************************/

var log = require('./log.js');
var db = require("../../db.js");

/****************************************** GLOBAL CONSTANTS *************************************/

const salt_rounds = 10;

/******************************************** MAIN SCRIPT ****************************************/

// update_last_used() 
//
// This function simple updates the 'last_active' field in the 'golfers' table every time a user
// makes a request with a valid session. It is called predominanty from the deserializeUser function,
// but also once from the passport.use function on initial login.

function update_last_used(email) {
    log("Updating last_active field for $1", 'inf', [email]);
    db.query("UPDATE golfers SET last_active=$1 WHERE email=$2", [moment.utc(), email])
        .then(function(data) {
            log("Successfully updated last_active field for $1", 'suc', [email]);
        })
        .catch(function(error) {
            log("$1 wasn't able to update last_active field because there was an error quering the golfers database:", 'err', [email]);
            console.log(error);
        });
}

// passport.use()
//
// This function performs the initialisation of a session whena user logs in from '/login' (and also
// when user updates their username or password in '/edit_profile' to reinitialise the session). The
// top arguments set which fields in the request to look for, in this case 'email' and 'password'.
//
// From here the function compares the hash of the provided password with the stored hash, if it is the
// same then the authentication callback is triggered 'return done(null,...)' 

passport.use(new local_strategy({
        usernameField: "email",
        passwordField: "password",
        passReqToCallback: true
    },
    function(req, email, password, done) {
        email = email.toLowerCase();
        log("$1 is attempting to log in", 'inf', [email]);
        db.query("SELECT * FROM golfers WHERE email=$1", [email])
            .then(function(data) {
                if (data.length == 0) {
                    log("$1 wasn't able to log in because that user doesn't exist", 'wrn', [email]);
                    return done(null, false, { message: "It doesn't look like we have a user registered with " + email + "." })
                } else {
                    bcrypt.compare(password, data[0].password, function(err, res) {
                        if (res == true) {
                            identifier = { session_id: req.sessionID, email: data[0].email };
                            log("$1 successfully logged in", 'suc', [email]);
                            update_last_used(data[0].email);
                            return done(null, { session_id: req.sessionID, email: data[0].email, username: data[0].username, is_admin: data[0].is_admin });
                        } else {
                            log("$1 wasn't able to log in because their password was wrong", 'wrn', [email]);
                            return done(null, false, { message: "Woops! I don't think that is the correct password." });
                        }
                    });
                }
            })
            .catch(function(error) {
                log("$1 wasn't able to log in because there was an error quering the golfers database:", 'err', [email]);
                console.log(error);
                return done(error, false, { message: "Something went wrong! Try submitting the form again." });
            });
    }));

// passport.serializeUser()
//
// This function is a middleman between passport.use and the session table and it determines what
// gets stored in the session to identify it. In our case we are going to pass the whole 'user'
// object which includes session_id, username, email and is_admin.

passport.serializeUser(function(user, done) {
    done(null, user);
});

// passport.deserializeUser()
//
// This is the authentication function. It compares session ids and email addresses from the cookie
// to those in the 'sessions table'. If there is a match the authentication passes and the function
// returns the callback 'return done(null,user)' which says: null errors, and !false authentication.

passport.deserializeUser(function(user, done) {
    log("Authenticating session for $1", 'inf', [user.email]);
    db.query("SELECT sid, sess FROM session WHERE sid=$1", [user.session_id])
        .then(function(data) {
            if (data.length > 0) {
                if (data[0].sess.passport.user.email == user.email) {
                    log("Successfully authenticated session for $1", 'suc', [user.email]);
                    update_last_used(user.email);
                    return done(null, user);
                } else {
                    log("Couldn't authenticate due to mismatch of cookie id and session id for $1", 'wrn', [user.email]);
                    return done(null, false);
                }
            } else {
                log("No session exists for $1", 'wrn', [user.email])
                return done(null, false);
            }
        })
        .catch(function(error) {
            log("Couldn't authenticate session for $1 error quering the current_sessions database:", 'err', [user.email]);
            console.log(error);
            return done(null, false);
        });
});
