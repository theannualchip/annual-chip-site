/******************************************** CONTENTS ********************************************/

//............(1) Third party dependancies
//............(2) Abstracted functions
//............(3) Global constants
//............(4) Global functions
//............(5) GET requests for main pages
//............(6) POST requests for various things

/************************************* THIRD PARTY DEPENDANCIES ***********************************/

var express = require('express');
var router = express.Router();
var path = require('path');
var fs = require('fs');
var passport = require('passport');
var bcrypt = require('bcrypt-nodejs');
var moment = require('moment');
var multer = require('multer');
var async = require('async');

/**************************************** ABSTRACTED FUNCTIONS ***********************************/

var tom_js = require("../public/javascripts/tom_backend.js");
var db = require("../db.js");
var passport_setup = require('./abstracted_functions/passport_setup.js');
var chat_bot = require('./abstracted_functions/chat_bot.js');
var image_uploaders = require('./abstracted_functions/image_upload_objects.js')
var log = require('./abstracted_functions/log.js');

/****************************************** GLOBAL CONSTANTS *************************************/

const salt_rounds = 10;

/****************************************** GLOBAL FUNCTIONS *************************************/

// authenticate()
//
// This small function is simply to refactor the authentication call to take the 'else' statement
// out of every route.

function authenticate(req, res, page, callback) {
    if (req.isAuthenticated()) {
        res.locals.standard_return = {
            user: req.session.passport.user.username,
            is_admin: req.session.passport.user.is_admin,
        }
        if (page) {
            res.locals.standard_return.current_page = page
        }
        callback()
    } else {
        res.redirect('/login');
    }
}

/************************************* GET REQUESTS FOR MAIN PAGES *******************************/

// Login Page
//
// The '/login' page is the main login screen. This route first first ends the current session,
// then simply renders the login.ejs screen.

router.get('/login', function(req, res, next) {
    req.session.destroy(function(err) {
        res.render('login', {});
    });
})

// Chat Page
//
// The '/' page is the chat room. This purpose of this route it to simple provide the loading screen.
// The rest of the information for the chat is collected through AJAX queries and sockets (see POSTs section
// below and ./sockets.js).
// First we authenticate the users session, if this fails then redirect them to the login screen. Otherwise, 
// loop through the loading_images folder (./img/loading_images) and collect all gifs. Then randomly choose
// one and send index.ejs to the client.

router.get('/',
    function(req, res, next) {
        authenticate(req, res, 'chit_chat', function() {
            fs.readdir('./public/img/loading_images/', function(error, images) {
                if (error) {
                    log("Couldn't collect read files in ./public/img/loading_images/ because of an error:", 'err')
                    console.log(error)
                    res.render('index', { user: req.session.passport.user.username, user_email: req.session.passport.user.email, is_admin: req.session.passport.user.is_admin, current_page: 'chit_chat' });
                } else {
                    gif_array = []
                    images.forEach(function(image) {
                        if (path.extname(image).toLowerCase() == '.gif') {
                            gif_array.push(image)
                        }
                    })
                    todays_photo = '/img/loading_images/' + gif_array[Math.min(Math.floor(Math.random() * gif_array.length), gif_array.length - 1)]
                    res.render('index', { user: req.session.passport.user.username, user_email: req.session.passport.user.email, loading_image: todays_photo });
                }
            })
        })
    }
);

// Constitution Page
//
// The '/constution' page is a very simple page with the static constitution on it. 
// This route simply suthenticates the session and if successful renders the constitution.ejs screen.

router.get('/constitution', function(req, res, next) {
    authenticate(req, res, 'constitution', function() {
        res.render('constitution');
    })
})

// Profile Pages
//
// The '/profile/:email' page displays any users 'profile'. 
// Currently this only includes a photo, email address, username and a last_active field.
// Post-BETA release the aim is to also include the following:
//
// current score for this years match, previous victories, current bets on, total exposure to 
// current bets, number of chat posts.
//
// The url contains a parameter which includes a URIencoded version of the desired profile email
// address. To render the page, the accessing user is first authenticated, then a query is run 
// to collect information about the profile which is requested (based on the url), if this query
// is successful (i.e. there exists a profile with such an email address) then 'profile.ejs' is returned
// along with the profile information.

router.get('/profile/:email', function(req, res, next) {
    authenticate(req, res, null, function() {
        db.query("SELECT profile_photo_title, email, last_active::varchar, username FROM golfers WHERE email=$1", [decodeURIComponent(req.params.email)])
            .then(function(data) {
                if (data.length > 0) {
                    db.query("SELECT COUNT(comment) FROM chat WHERE user_email=$1", [decodeURIComponent(req.params.email)])
                        .then(function(chat_count) {
                            db.query(`SELECT g.username as gambler_1_name, g.profile_photo_title as gambler_1_photo, b.gambler_1, 
                                a.username as gambler_2_name, a.profile_photo_title as gambler_2_photo, b.gambler_2, 
                                b.amount, b.bet_comment, b.date_created, b.accepted, b.date_accepted, b.winner
                                FROM golfers as g, golfers as a, bets as b WHERE g.email=b.gambler_1 AND a.email=b.gambler_2 AND (b.gambler_1=$1 OR b.gambler_2=$1)`, [decodeURIComponent(req.params.email)])
                                .then(function(bets) {
                                    profile_bets={winnings:0,exposure:0,open_bets:'',closed_bets:''}
                                    for (row_1=0;row_1<bets.length;row_1++) {
                                        if (bets[row_1].winner==null && bets[row_1].accepted!=null) {
                                            profile_bets.exposure+=bets[row_1].amount
                                            profile_bets.open_bets+=`
                                                <div class='column bets-other_bet'>
                                                    <div class='column bets-description'>
                                                        ${bets[row_1].gambler_1_name} bet ${bets[row_1].gambler_2_name} $${bets[row_1].amount} that ${bets[row_1].bet_comment}.
                                                    </div>
                                                    <div class='column bets-action has-text-centered'>
                                                        $${bets[row_1].amount} is on the line.
                                                    </div>
                                                </div>`
                                        } else if (bets[row_1].winner==decodeURIComponent(req.params.email)) {
                                            profile_bets.winnings+=bets[row_1].amount
                                            profile_bets.closed_bets+=`
                                                <div class='column bets-your_bet bc-info_blue'>
                                                    <div class='column bets-description'>
                                                        ${bets[row_1].gambler_1_name} bet ${bets[row_1].gambler_2_name} $${bets[row_1].amount} that ${bets[row_1].bet_comment}.
                                                    </div>
                                                    <div class='column bets-action has-text-centered'>
                                                        ${data[0].username} won $${bets[row_1].amount} 
                                                    </div>
                                                </div>`
                                        } else if (bets[row_1].winner!=null && bets[row_1].winner!=decodeURIComponent(req.params.email)) {
                                            profile_bets.winnings-=bets[row_1].amount
                                            profile_bets.closed_bets+=`
                                                <div class='column bets-your_bet bc-danger_pink'>
                                                    <div class='column bets-description'>
                                                        ${bets[row_1].gambler_1_name} bet ${bets[row_1].gambler_2_name} $${bets[row_1].amount} that ${bets[row_1].bet_comment}.
                                                    </div>
                                                    <div class='column bets-action has-text-centered'>
                                                        ${data[0].username} lost $${bets[row_1].amount}
                                                    </div>
                                                </div>`
                                        }
                                    }
                                    log("Successfully collected user info for $1", 'suc', [decodeURIComponent(req.params.email)]);
                                    res.render('profile', { user_info: data[0], user_stats: { chat_count: chat_count, bets: profile_bets } });
                                })
                                .catch(function(error) {
                                    log("Couldn't find $1 in database as there was an error when quering the bets table:", 'wrn', [decodeURIComponent(req.params.email)]);
                                    console.log(error);
                                    res.render('profile', { warning: "Woops! Something went wrong, try refreshing the page." });
                                })
                        })
                        .catch(function(error) {
                            log("Couldn't find $1 in database as there was an error when quering the chat table:", 'wrn', [decodeURIComponent(req.params.email)]);
                            console.log(error);
                            res.render('profile', { warning: "Woops! Something went wrong, try refreshing the page." });
                        })
                } else {
                    log("Couldn't find a user with email $1 in the golfers database", 'wrn', [decodeURIComponent(req.params.email)]);
                    res.render('profile', { warning: "Woops! It doesn't look like we have a user with email " + decodeURIComponent(req.params.email) });
                }
            })
            .catch(function(error) {
                log("Couldn't find $1 in database as there was an error when quering the golfers table:", 'wrn', [decodeURIComponent(req.params.email)]);
                console.log(error);
                res.render('profile', { warning: "Woops! Something went wrong, try refreshing the page." });
            });
    })
})

// Edit Profile Page
//
// The '/edit_profile' page displays a form which allows a user to update aspects of the account including:
//
// username, password and profile picture
//
// Note that this is simply returning the form with some placeholder data reflecting the user's current
// settings. The actual updating occurs via a POST request (see /submit_profile_update POSTs section below). To render the form
// the user is first authenticated, then a query is run to collect the current profile information (username,
// photo) based on the session email. (Noting that obviously one must only be able to update their own 
// profile - hence why we use the session email as it is authenticated). If this query is successful the 
// 'edit_profile.ejs' page is returned with the accompanying data.

router.get('/edit_profile', function(req, res, next) {
    authenticate(req, res, 'edit_profile', function() {
        db.query("SELECT username, profile_photo_title FROM golfers WHERE email = $1", [req.session.passport.user.email])
            .then(function(data) {
                if (data.length > 0) {
                    log("Successfully collected user information for $1", 'suc', [req.session.passport.user.email]);
                    res.render('edit_profile', { user: req.session.passport.user.username, profile_photo_title: data[0].profile_photo_title });
                } else {
                    res.redirect('/login');
                }
            })
            .catch(function(error) {
                log("Couldn't collect information for $1 as there was an error when quering the golfers table:", 'err', [req.session.passport.user.email]);
                console.log(error);
                res.render('edit_profile', { error_message: 'Ah oh! Something went wrong, try reloading the page' });
            })
    })
})

// Photos Page
//
// The '/photos' page serves two purposes: primarily it is an album of previously uploaded photos which
// users can look at, secondly it contains a form for uploading new photos. Note that this uploading is
// is handled by a POST request (see /photo_album_upload in the POSTs section below).
//
// Note also that photos may be deleted by either someone with admin rights, or the user who uploaded it.
//
// We begin by authenticating the user. If this is successful we query the 'photos' table for all photos.
// We can then loop through the 'photo_album' folder checking that all the photos that are in the 'photos'
// table are indeed in the folder. Where they are we push to an array the photo title, location and whether
// or not it was uploaded by that user. Once this is done we can send the 'photos.ejs' page along with this
// array. 

router.get('/photos', function(req, res, next) {
    authenticate(req, res, 'photos', function() {
        db.query("SELECT p.photo_title, p.short_title, g.email, g.username FROM photos as p, golfers as g WHERE p.uploaded_user_email=g.email")
            .then(function(data) {
                if (data.length > 0) {
                    image_array = [];
                    for (row_1 = 0; row_1 < data.length; row_1++) {
                        if (fs.existsSync('./public/img/photo_album/' + data[row_1].photo_title)) {
                            your_photo = false;
                            if (data[row_1].email == req.session.passport.user.email) {
                                your_photo = true;
                            }
                            image_array.push({ photo_title: data[row_1].photo_title, short_title: data[row_1].short_title, your_photo: your_photo, uploaded_user: data[row_1].username })
                        } else {
                            log("Can't find the photo $1 in the photo_album folder", 'wrn', [data[row_1].photo_title]);
                        }
                    }
                    res.render('photos', { user: req.session.passport.user.username, image_array: image_array });
                } else {
                    log("Looks like there are no photos in the table, rendering page without any", 'inf');
                    res.render('photos', { user: req.session.passport.user.username, warning: "Looks like there aren't any photos yet. Maybe you could upload one?" });
                }
            })
            .catch(function(error) {
                log("Couldn't find any photos as there was an error when quering the photos table:", 'err');
                console.log(error);
                res.render('photos', { user: req.session.passport.user.username, warning: 'Ah oh! Something went wrong, try refreshing the page.' });
            });
    })
})

// Admin Page
//
// The '/admin' page is only accessable to users with is_admin set to true. It is designed to contain 
// several forms which perform administrative functions such as:
//
// creating a new user, sending emails to all users, reseting the scorecards or chat conversations
//
// Currently this only contains the New User form. To render the page we first authenticate the user,
// then query the 'golfers' table to check that they have is_admin=true (i.e. they do in fact have
// admin rights). If this is successful we send 'admin.ejs'.

router.get('/admin', function(req, res, next) {
    authenticate(req, res, 'admin', function() {
        db.query("SELECT is_admin FROM golfers WHERE email=$1", [req.session.passport.user.email])
            .then(function(data) {
                if (data.length > 0) {
                    if (data[0].is_admin) {
                        res.render('admin', { user: req.session.passport.user.username });
                    } else {
                        log("Someone tried to access the admin page without admin rights user $1", 'wrn', [req.session.passport.user.email])
                        res.redirect('/');
                    }
                } else {
                    res.redirect('/');
                }
            })
            .catch(function(error) {
                log("Couldn't validate that $1 has admin rights as there was an error querying the golfers table:", 'err', [req.session.passport.user.email]);
                console.log(error);
                res.redirect('/');
            })
    })
})

// Bets Page
//
// The '/bets' page contains all current bets. It is intended as a place for people to view bets as well
// as action bets (accept, claim etc).
//
// This will be added * AFTER * invites are sent out.

router.get('/bets', function(req, res, next) {
    authenticate(req, res, 'bets', function() {
        db.query("SELECT username FROM golfers WHERE email<>$1", [req.session.passport.user.email])
            .then(function(golfers) {
                res.render('bets', { golfers: golfers });
            })
            .catch(function(error) {
                log("Couldn't find all usernames as there was an error when quering the golfers table:", 'err');
                console.log(error);
                res.redirect('/')
            })
    })
})

/********************************** POST REQUESTS FOR VARIOUS THINGS *****************************/

// User Login
//
// User login is the post request that gets called when a user logs in for the first time from 
// /login.ejs. The user is first authenticated via the 'local' strategy which is defined in the
// /abstracted_functions/passport_setup.js file (see passport.user()). If the authentication fails
// the user is returned to /login with a warning (eiter missing info or password wrong). Otherwise
// the user is redirected to '/' (i.e. the chat page).

router.post('/user_login', function(req, res, next) {
    missing_data_message = "Looks like you are missing either your email or password."
    passport.authenticate('local', { badRequestMessage: missing_data_message }, function(error, user, info) {
        if (error || !user || user == false) {
            return res.render('login', { warning: info.message });
        }
        req.login(user, loginErr => {
            if (loginErr) {
                return next(loginErr)
            }
            req.session.save(function(err) {
                log('Redirecting $1 to index.ejs', 'inf', [req.session.passport.user.email])
                return res.redirect('/');
            });
        });
    })(req, res, next);
});

// User Sign Up
//
// User sign up is accessed via the '/admin' page and is intended for intialising profiles for
// new members to the Annual Chip In. The '/admin' page provides a form which takes an email,
// username, profile photo, password and is_admin bool. On receipt of this information, the 
// session submitting the request is authenticated and then checked to confirm they are an 
// admin. If they are the request is passed to the multer uploader (image_uploaders.) which 
// is located in abstracted_functions/image_upload_objects.js. This uplaoder is for dealing
// with multipart forms (i.e. forms that contain files to be uploaded). Once this process is 
// complete the new user information is added to the 'golfers' table, when this is finished the 
// '/admin' page is rendered. 

router.post('/user_signup', function(req, res, next) {
    authenticate(req, res, 'admin', function() {
        db.query("SELECT is_admin FROM golfers WHERE email=$1", [req.session.passport.user.email])
            .then(function(data) {
                if (data.length > 0) {
                    if (data[0].is_admin) {
                        image_uploaders.upload_profile_picture.single('photo_file')(req, res, function(error) {
                            if (error) {
                                log('There was an error uploading the profile photo:', 'err')
                                console.log(error);
                                res.render('admin', { user: req.session.passport.user.username, sign_up_success: error });
                                return
                            } else {
                                if (req.body.is_admin) {
                                    is_admin = true;
                                } else {
                                    is_admin = false;
                                }
                                log("Creating new user: $1", 'inf', [JSON.stringify(req.body)]);
                                bcrypt.genSalt(salt_rounds, function(err, salt) {
                                    console.log(err);
                                    bcrypt.hash(req.body.password, salt, null, function(err, hash) {
                                        console.log(err);
                                        db.query("INSERT INTO golfers (username,email,password,is_admin,profile_photo_title) VALUES ($1,$2,$3,$4,$5)", [req.body.username, req.body.email, hash, is_admin, req.file.filename])
                                            .then(function(data) {
                                                log("Successfully created user for $1", 'suc', [JSON.stringify(req.body)]);
                                                res.render('admin', { user: req.session.passport.user.username, sign_up_success: "Success! Signed up " + req.body.email + "." });
                                            })
                                            .catch(function(error) {
                                                log("Couldn't sign up user $1 error quering the golfers database:", 'err', [JSON.stringify(req.body)]);
                                                console.log(error);
                                                res.render('admin', { user: req.session.passport.user.username, sign_up_success: "Couldn't sign up user as there was an error quering the golfers database." });
                                            });
                                    });
                                });
                            }
                        });
                    } else {
                        log("Someone tried to access the admin page without admin rights user $1", 'wrn', [req.session.passport.user.email])
                        res.redirect('/');
                    }
                } else {
                    res.redirect('/');
                }
            })
            .catch(function(error) {
                log("Couldn't validate that $1 has admin rights as there was an error querying the golfers table:", 'err', [req.session.passport.user.email]);
                console.log(error);
                res.redirect('/');
            })
    })
})

// Place Bet
//
// The place bet route is to allow users to place bets.

router.post('/place_bet', function(req, res, next) {
    authenticate(req, res, null, function() {
        log("$1 is attempting to place a bet:", 'inf', [req.session.passport.user.email]);
        error_output = ''
        if (req.body.better == req.body.judge) {
            error_output += "The judge can't be involved in the bet, try chosing a different Judge"
        }
        if (isNaN(req.body.amount) || req.body.amount < 0 || req.body.amount == '') {
            if (error_output != '') {
                error_output += "<br><br>"
            }
            error_output += "The amount you entered is not valid, try entering a number"
        }
        if (req.body.bet == '') {
            if (error_output != '') {
                error_output += "<br><br>"
            }
            error_output += "The bet you want to place is empty, try entering something in the above sentance"
        }
        if (error_output != '') {
            res.send(error_output)
        } else {
            db.query("SELECT email, username FROM golfers WHERE username in ($1,$2)", [req.body.better, req.body.judge])
                .then(function(names) {
                    better_email = ''
                    judge_email = ''
                    if (names[0].username == req.body.better) {
                        better_email = names[0].email
                    } else if (names[1].username == req.body.better) {
                        better_email = names[1].email
                    }
                    if (names[0].username == req.body.judge) {
                        judge_email = names[0].email
                    } else if (names[1].username == req.body.judge) {
                        judge_email = names[1].email
                    }
                    if (better_email == '' || judge_email == '') {
                        error_output = "It doesn't look like those usernames exist, perhaps try again"
                        res.send(error_output)
                    } else {
                        db.query("INSERT INTO bets (gambler_1, gambler_2, judge, amount, bet_comment, date_created) VALUES ($1, $2, $3, $4, $5, $6)", [req.session.passport.user.email, better_email, judge_email, req.body.amount, req.body.bet, moment.utc()])
                            .then(function(data) {
                                log('Successully uploaded bet from $1 to the bets table', 's', [req.session.passport.user.email])
                                chat_bot(req, req.session.passport.user.username + " just bet " + req.body.better + " $" + req.body.amount + " that " + req.body.bet + "!")
                                res.send('success')
                            })
                            .catch(function(error) {
                                log("Couldn't insert bet from $1 as there was an error when quering the bets table:", 'err', [req.session.passport.user.email]);
                                console.log(error);
                                res.send('Whoops! Something went wrong uploading that bet, please try again');
                            })
                    }
                })
                .catch(function(error) {
                    log("Couldn't upload bet from $1 to the database as there was an error querying the golfers table:", 'e', [req.session.passport.user.email])
                    console.log(error)
                })
        }
    })
})

// Previous Bets
//
// This is pulled out as an AJAX function so that it can be called with a bet is submitted

router.post('/previous_bets', function(req, res, next) {
    authenticate(req, res, 'bets', function() {
        db.query(`SELECT g.username as gambler_1_name, g.profile_photo_title as gambler_1_photo, b.gambler_1, 
            a.username as gambler_2_name, a.profile_photo_title as gambler_2_photo, b.gambler_2, 
            c.username as judge_name, c.profile_photo_title as judge_photo, b.judge, 
            b.amount, b.bet_comment, b.date_created, b.accepted, b.date_accepted, b.winner
            FROM golfers as g, golfers as a, golfers as c, bets as b WHERE g.email=b.gambler_1 AND a.email=b.gambler_2 AND c.email=b.judge`)
            .then(function(bets) {
                db.query(`SELECT * FROM golfers`)
                    .then(function(golfers) {
                        var user = req.session.passport.user.email
                        stats = { your_exposure: 0, your_winnings: 0, all_won: 0, all_exposed: 0 }
                        for (row_1 = 0; row_1 < bets.length; row_1++) {
                            if (bets[row_1].gambler_1 == user || bets[row_1].gambler_2 == user) {
                                if (bets[row_1].winner == null) {
                                    stats.your_exposure += bets[row_1].amount
                                } else if (bets[row_1].winner == user) {
                                    stats.your_winnings += bets[row_1].amount
                                } else {
                                    stats.your_winnings -= bets[row_1].amount
                                }
                            }
                            if (bets[row_1].winner == null) {
                                stats.all_exposed += bets[row_1].amount
                            } else {
                                stats.all_won += bets[row_1].amount
                            }
                        }
                        sorted_bets = { to_be_accepted: '', open_bets: '', closed_bets: '' }
                        disable_text = `loading_button(this);`
                        for (row_1 = 0; row_1 < bets.length; row_1++) {
                            if (bets[row_1].accepted == null) {
                                if (bets[row_1].gambler_1 == user) {
                                    sorted_bets.to_be_accepted += `
                                        <div class='column bets-your_bet'>
                                            <div class='column bets-description'>
                                                <a>You</a> bet ${bets[row_1].gambler_2_name} $${bets[row_1].amount} that ${bets[row_1].bet_comment}. ${bets[row_1].judge_name} will be the judge.
                                            </div>
                                            <div class='column bets-action has-text-centered'>
                                                Waiting for ${bets[row_1].gambler_2_name} to accept.
                                            </div>
                                        </div>`
                                } else if (bets[row_1].gambler_2 == user) {
                                    sorted_bets.to_be_accepted += `
                                        <div class='column bets-your_bet'>
                                            <div class='column bets-description'>
                                                ${bets[row_1].gambler_1_name} bet <a>you</a> $${bets[row_1].amount} that ${bets[row_1].bet_comment}. ${bets[row_1].judge_name} will be the judge.
                                            </div>
                                            <div class='column bets-action has-text-centered'>
                                                <div class='columns is-mobile'>
                                                    <div class='column is-half has-text-centered'>
                                                        <button class='button bc-info_blue has-text-centered' onclick="${disable_text} accept_bet('${moment.utc(bets[row_1].date_created).format('YYYY-MM-DDTHH:mm:ss.SSSZ')}','accept','${bets[row_1].gambler_1_name}')">Accept Bet</button>
                                                    </div>
                                                    <div class='column is-half has-text-centered'>
                                                        <button class='button bc-danger_pink has-text-centered' onclick="${disable_text} accept_bet('${moment.utc(bets[row_1].date_created).format('YYYY-MM-DDTHH:mm:ss.SSSZ')}','reject','${bets[row_1].gambler_1_name}')">Reject Bet</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>`
                                } else {
                                    sorted_bets.to_be_accepted += `
                                        <div class='column bets-other_bet'>
                                            <div class='column bets-description'>
                                                ${bets[row_1].gambler_1_name} bet ${bets[row_1].gambler_2_name} $${bets[row_1].amount} that ${bets[row_1].bet_comment}. ${bets[row_1].judge_name} will be the judge.
                                            </div>
                                            <div class='column bets-action has-text-centered'>
                                                Waiting for ${bets[row_1].gambler_2_name} to accept.
                                            </div>
                                        </div>`
                                }
                            } else if (bets[row_1].winner == null) {
                                if (bets[row_1].judge == user) {
                                    sorted_bets.open_bets += `
                                        <div class='column bets-your_bet'>
                                            <div class='column bets-description'>
                                                ${bets[row_1].gambler_1_name} bet ${bets[row_1].gambler_2_name} $${bets[row_1].amount} that ${bets[row_1].bet_comment}. <a>You</a> are be the judge.
                                            </div>
                                            <div class='column bets-action has-text-centered'>
                                                <div class='columns is-mobile'>
                                                    <div class='column is-half has-text-centered'>
                                                        <button class='button bc-info_blue has-text-centered' onclick="${disable_text} judge_bet('${moment.utc(bets[row_1].date_created).format('YYYY-MM-DDTHH:mm:ss.SSSZ')}','won_${bets[row_1].gambler_1}',['${bets[row_1].gambler_1_name}','${bets[row_1].gambler_2_name}','${bets[row_1].amount}'])">${bets[row_1].gambler_1_name} Won</button>
                                                    </div>
                                                    <div class='column is-half has-text-centered'>
                                                        <button class='button bc-info_blue has-text-centered' onclick="${disable_text} judge_bet('${moment.utc(bets[row_1].date_created).format('YYYY-MM-DDTHH:mm:ss.SSSZ')}','won_${bets[row_1].gambler_2}',['${bets[row_1].gambler_2_name}','${bets[row_1].gambler_1_name}','${bets[row_1].amount}'])">${bets[row_1].gambler_2_name} Won</button>
                                                    </div>
                                                </div>
                                                <div class='columns is-mobile '>
                                                    <div class='column has-text-centered'>
                                                        <button class='button bc-danger_pink has-text-centered' onclick="${disable_text} judge_bet('${moment.utc(bets[row_1].date_created).format('YYYY-MM-DDTHH:mm:ss.SSSZ')}','cancel',['${bets[row_1].gambler_1_name}','${bets[row_1].gambler_2_name}','${bets[row_1].amount}'])">Withdrawal or Tie</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>`
                                } else {

                                }
                            } else {
                                if (bets[row_1].gambler_1 == user && bets[row_1].winner == user) {
                                    sorted_bets.closed_bets += `
                                        <div class='column bets-your_bet'>
                                            <div class='column bets-description'>
                                                <a>You</a> bet ${bets[row_1].gambler_2_name} $${bets[row_1].amount} that ${bets[row_1].bet_comment}. ${bets[row_1].judge_name} was the judge.
                                            </div>
                                            <div class='column bets-action has-text-centered'>
                                                <a class='bc-info_blue' style='padding:5px; border-radius:5px;'>You won this bet. +$${bets[row_1].amount} baby.</a>
                                            </div>
                                        </div>`
                                } else if (bets[row_1].gambler_2 == user && bets[row_1].winner == user) {
                                    sorted_bets.closed_bets += `
                                        <div class='column bets-your_bet'>
                                            <div class='column bets-description'>
                                                ${bets[row_1].gambler_2_name} bet <a>you</a> $${bets[row_1].amount} that ${bets[row_1].bet_comment}. ${bets[row_1].judge_name} was the judge.
                                            </div>
                                            <div class='column bets-action has-text-centered'>
                                                <a class='bc-info_blue' style='padding:5px; border-radius:5px;'>You won this bet. +$${bets[row_1].amount} baby. </a>
                                            </div>
                                        </div>`
                                } else if (bets[row_1].gambler_1 == user && bets[row_1].winner != user) {
                                    sorted_bets.closed_bets += `
                                        <div class='column bets-your_bet'>
                                            <div class='column bets-description'>
                                                <a>You</a> bet ${bets[row_1].gambler_2_name} $${bets[row_1].amount} that ${bets[row_1].bet_comment}. ${bets[row_1].judge_name} was the judge.
                                            </div>
                                            <div class='column bets-action has-text-centered'>
                                                <a class='bc-danger_pink' style='padding:5px; border-radius:5px;'>You lost this bet. -$${bets[row_1].amount}. Arghh. </a>
                                            </div>
                                        </div>`
                                } else if (bets[row_1].gambler_2 == user && bets[row_1].winner != user) {
                                    sorted_bets.closed_bets += `
                                        <div class='column bets-your_bet'>
                                            <div class='column bets-description'>
                                                ${bets[row_1].gambler_2_name} bet <a>you</a> $${bets[row_1].amount} that ${bets[row_1].bet_comment}. ${bets[row_1].judge_name} was the judge.
                                            </div>
                                            <div class='column bets-action has-text-centered'>
                                                <a class='bc-danger_pink' style='padding:5px; border-radius:5px;'>You lost this bet. -$${bets[row_1].amount} Arghh. </a>
                                            </div>
                                        </div>`
                                } else {
                                    for (row_2 = 0; row_2 < golfers.length; row_2++) {
                                        if (golfers[row_2].email == bets[row_1].winner) {
                                            bets[row_1].winner = golfers[row_2].username
                                        }
                                    }
                                    sorted_bets.closed_bets += `
                                        <div class='column bets-other_bet'>
                                            <div class='column bets-description'>
                                                ${bets[row_1].gambler_1_name} bet ${bets[row_1].gambler_2_name} $${bets[row_1].amount} that ${bets[row_1].bet_comment}. ${bets[row_1].judge_name} was the judge.
                                            </div>
                                            <div class='column bets-action has-text-centered'>
                                                ${bets[row_1].winner} won the bet.
                                            </div>
                                        </div>`
                                }
                            }
                        }
                        if (sorted_bets.to_be_accepted == '') {
                            sorted_bets.to_be_accepted = `<div class='column bets-other_bet bc-danger_pink'>Doesn't look like there is anything here...</div>`
                        }
                        if (sorted_bets.open_bets == '') {
                            sorted_bets.open_bets = `<div class='column bets-other_bet bc-danger_pink'>Doesn't look like there is anything here...</div>`
                        }
                        if (sorted_bets.closed_bets == '') {
                            sorted_bets.closed_bets = `<div class='column bets-other_bet bc-danger_pink'>Doesn't look like there is anything here...</div>`
                        }
                        res.send({ bets: sorted_bets, stats: stats });
                    })
                    .catch(function(error) {
                        log("Couldn't find all bets as there was an error when quering the golfers table:", 'err');
                        console.log(error);
                        res.send('error_getting_bets')
                    })
            })
            .catch(function(error) {
                log("Couldn't find all bets as there was an error when quering the bets table:", 'err');
                console.log(error);
                res.send('error_getting_bets')
            })
    })
})

// Accept Bets
//
// This POST request allows users to either accept or reject bets which have been wagered against them.

router.post('/accept_bet', function(req, res, next) {
    authenticate(req, res, 'bets', function() {
        db.query("SELECT * FROM bets WHERE date_created=$1", [moment.utc(req.body.time_stamp)])
            .then(function(data) {
                if (data.length > 0) {
                    if (data[0].gambler_2 == req.session.passport.user.email) {
                        if (req.body.action == 'accept') {
                            db.query("UPDATE bets SET accepted=TRUE, date_accepted=$1 WHERE date_created=$2", [moment.utc(), moment.utc(req.body.time_stamp)])
                                .then(function(update) {
                                    log("$1 successfully accepted bet $2", 's', [req.session.passport.user.email, moment(req.body.time_stamp)])
                                    chat_bot(req, "Look out! " + req.session.passport.user.username + " just accepted " + req.body.name + "'s bet!")
                                    res.send('success')
                                })
                                .catch(function(error) {
                                    log("Couldn't accept the bet $1 for $2 as there was an error querying the bets table:", 'err', [moment(req.body.time_stamp), req.session.passport.user.email]);
                                    console.log(error);
                                    res.send('Ah oh! Something went wrong. Try the request again.')
                                })
                        } else if (req.body.action == 'reject') {
                            db.query("DELETE FROM bets WHERE date_created=$1", [moment.utc(req.body.time_stamp)])
                                .then(function(update) {
                                    log("$1 successfully rejected bet $2", 's', [req.session.passport.user.email], moment(req.body.time_stamp))
                                    chat_bot(req, "Soft. " + req.session.passport.user.username + " just rejected " + req.body.name + "'s bet.")
                                    res.send('success')
                                })
                                .catch(function(error) {
                                    log("Couldn't reject the bet $1 for $2 as there was an error querying the bets table:", 'err', [moment(req.body.time_stamp), req.session.passport.user.email]);
                                    console.log(error);
                                    res.send('Ah oh! Something went wrong. Try the request again.')
                                })
                        } else {
                            log("$1 was trying to accept bet $2 but the action specified wasn't 'accept' or 'reject'", 'e', [req.session.passport.user.email, moment.utc(req.body.time_stamp)])
                            res.send("Ah oh! It doesn't look like you've said to accept or reject that bet. Try the request again.")
                        }
                    } else {
                        log("$1 was trying to accept bet $2 when that isn't their bet", 'e', [req.session.passport.user.email, moment.utc(req.body.time_stamp)])
                        res.send("Ah oh! It doesn't look like you need ot accept that bet")
                    }
                } else {
                    log("Couldn't find bet with timestamp $1 for $2", 'e', [moment.utc(req.body.time_stamp), req.session.passport.user.email])
                    res.send("Ah oh! It doesn't look like that bet exists anymore")
                }
            })
            .catch(function(error) {
                log("Couldn't find the bet with timestamp $1 as there was an error when quering the bets table:", 'err', [moment(req.body.time_stamp).format()]);
                console.log(error);
                res.send('Ah oh! Something went wrong. Try the request again.')
            })
    })
})

// Bet Outcome
//
// This POST request allows the judge of a bet to input who the winner of the bet was, or cancel the bet.

router.post('/bet_outcome', function(req, res, next) {
    authenticate(req, res, 'bets', function() {
        db.query("SELECT * FROM bets WHERE date_created=$1", [moment.utc(req.body.time_stamp)])
            .then(function(data) {
                if (data.length > 0) {
                    if (data[0].judge == req.session.passport.user.email) {

                        if (req.body.outcome.substring(0, 4) == 'won_') {
                            db.query("UPDATE bets SET winner=$1, date_won=$2 WHERE date_created=$3", [req.body.outcome.substring(4, req.body.outcome.length), moment.utc(), moment.utc(req.body.time_stamp)])
                                .then(function(update) {
                                    log("$1 successfully judged bet $2", 's', [req.session.passport.user.email, moment(req.body.time_stamp)])
                                    chat_bot(req, "Haha Boom! " + req.body.bet_info[0] + " just cost " + req.body.bet_info[1] + " $" + req.body.bet_info[2] + ". Nice win champ!")
                                    res.send('success')
                                })
                                .catch(function(error) {
                                    log("Couldn't accept the bet $1 for $2 as there was an error querying the bets table:", 'err', [moment(req.body.time_stamp), req.session.passport.user.email]);
                                    console.log(error);
                                    res.send('Ah oh! Something went wrong. Try the request again.')
                                })
                        } else if (req.body.outcome == 'cancel') {
                            db.query("DELETE FROM bets WHERE date_created=$1", [moment.utc(req.body.time_stamp)])
                                .then(function(update) {
                                    log("$1 successfully cancelled bet $2 as judge", 's', [req.session.passport.user.email], moment(req.body.time_stamp))
                                    chat_bot(req, "Put your money away boys. " + req.session.passport.user.username + " just cancelled the bet between " + req.body.bet_info[0] + " and " + req.body.bet_info[1] + ".")
                                    res.send('success')
                                })
                                .catch(function(error) {
                                    log("Couldn't reject the bet $1 for $2 as there was an error querying the bets table:", 'err', [moment(req.body.time_stamp), req.session.passport.user.email]);
                                    console.log(error);
                                    res.send('Ah oh! Something went wrong. Try the request again.')
                                })
                        } else {
                            log("$1 was trying to accept bet $2 but the action specified wasn't 'won_' or 'cancel'", 'e', [req.session.passport.user.email, moment.utc(req.body.time_stamp)])
                            res.send("Ah oh! It doesn't look like you've decided on a winner for that bet. Try the request again.")
                        }


                    } else {
                        log("$1 was trying to judge bet $2 when that isn't their bet to judge", 'e', [req.session.passport.user.email, moment.utc(req.body.time_stamp)])
                        res.send("Ah oh! It doesn't look like you need to judge that bet")
                    }
                } else {
                    log("Couldn't find bet with timestamp $1 for $2", 'e', [moment.utc(req.body.time_stamp), req.session.passport.user.email])
                    res.send("Ah oh! It doesn't look like that bet exists anymore")
                }
            })
            .catch(function(error) {
                log("Couldn't find the bet with timestamp $1 as there was an error when quering the bets table:", 'err', [moment(req.body.time_stamp).format()]);
                console.log(error);
                res.send('Ah oh! Something went wrong. Try the request again.')
            })
    })
})

// Previous Messages
//
// The previous messages route is for loading previous chat history from the 'chats' table and sending
// it to the user. It is called from the Chit Chat page automatically on load, but then also if the user
// requests older chats. Where it is these older chats that are requested the request will include a 
// 'previous_timestamp' variable which will mark when to collect prior to.
//
// The process first authenticates the user, if this is successful the 'chats' table is then queried to 
// collect all previous chats. Once these are collected, the array is parsed to collect only chats prior 
// to the 'previous_timestamp' variable. The process will continue until at least 15 chats have been collected.
// However, once 15 have been collected the script will continue to collect the remainder of the last days
// chats (i.e. if 14 chats are collected and the 15 is on a new day, the rest of this day will also be collected).
// This is to provide a more user friendly experience whereby a user doesn't have to request multiple times for
// the one conversation where that conversation takes place on the same day.


router.post('/previous_messages', function(req, res, next) {
    authenticate(req, res, 'chit_chat', function() {
        db.query("SELECT c.user_email, c.comment, c.timestamp, g.username, g.profile_photo_title FROM chat as c LEFT JOIN golfers as g ON c.user_email=g.email ORDER BY c.timestamp")
            .then(function(data) {
                var return_array = []
                if (data.length > 0) {
                    if (req.body.previous_timestamp) {
                        upper_date = moment.utc(req.body.previous_timestamp)
                    } else {
                        upper_date = moment.utc(data[data.length - 1].timestamp).add(1, 'd')
                    }
                    var collecting = false
                    var finished_collecting = false
                    for (message = data.length; message > 0; message--) {
                        if (finished_collecting == false) {
                            if (!moment.utc(data[message - 1].timestamp).isSame(upper_date, 'd') && moment.utc(data[message - 1].timestamp).diff(upper_date, 's') < 0) {
                                collecting = true
                            }
                            if (collecting == true) {
                                return_array.splice(0, 0, data[message - 1])
                                if (return_array[0].user_email == 'chat_bot') {
                                    return_array[0].username = 'Chat Bot'
                                    return_array[0].profile_photo_title = 'chat_bot.jpg'
                                }
                                if (message > 1) {
                                    if (return_array.length > 14 && !moment.utc(data[message - 1].timestamp).isSame(moment.utc(data[message - 2].timestamp), 'd')) {
                                        finished_collecting = true
                                    }
                                }
                            }
                        }
                    }
                    log("Successfully collected previous chat logs for $1", 'suc', [req.session.passport.user.email]);
                }
                res.send(return_array);
            })
            .catch(function(error) {
                log("Couldn't collect previous chat comments for $1 error quering the chat database:", 'err', [req.session.passport.user.email]);
                console.log(error);
                res.send("Whoops! Something went wrong.");
            });
    })
})

// Delete Message
//
// This POST request allows a user to delete a comment from the chat room.


router.post('/delete_message', function(req, res, next) {
    authenticate(req, res, 'chit_chat', function() {
        db.query("DELETE FROM chat WHERE timestamp = $1 AND user_email = $2", [moment.utc(req.body.time_stamp),req.session.passport.user.email])
            .then(function(data) {
                log("Successfully deleted chat $1 for $2", 'suc', [moment.utc(req.body.time_stamp),req.session.passport.user.email]);
                res.send('success');
            })
            .catch(function(error) {
                log("Couldn't collect delete chat from chat table for $1 error quering the chat database:", 'err', [req.session.passport.user.email]);
                console.log(error);
                res.send("Whoops! Something went wrong.");
            });
    })
})

// Photo Album Upload
//
// This request is to upload a photo to go in the photo album on '/photos'. It is called after a form on
// '/photos' is submitted. The user is first authenticated, if this is successful the 'image_uploaders.'
// is called (see abstracted_functions/image_upload_objects.js for a full explaination of how this works).
// This function returns some information about the uploaded file including its new filename, as well as the
// other request data. The photo is then inserted into the 'photos' table including the uploaded user, 
// timestamp and short_title. If all of this is successful the user is redirected to '/photos' which reloads 
// the page, this time including the new photo.

router.post('/photo_album_upload', function(req, res, next) {
    authenticate(req, res, 'photos', function() {
        image_uploaders.upload_photo_album.single('photo_file')(req, res, function(error) {
            if (error) {
                log('$1 has an error uploading the photo album photo:', 'err', [req.session.passport.user.email])
                console.log(error)
                res.render('photos', { user: req.session.passport.user.username, warning: error })
                return
            } else {
                log("Successfully uploaded $1 to the photos table", 'suc', [req.file.originalname]);
                db.query("INSERT INTO photos (photo_title, date_uploaded, uploaded_user_email, short_title) VALUES ($1,$2,$3,$4)", [req.file.filename, moment.utc(), req.session.passport.user.email, req.body.photo_title])
                    .then(function(data) {
                        log("Successfully added $1 to the photos table", 'suc', [req.file.filename])
                        chat_bot(req, req.session.passport.user.username + ' Just uploaded the a photo called ' + req.body.photo_title + '. Head to the photos page to see!')
                        res.redirect('/photos')
                    })
                    .catch(function(error) {
                        log("Couldn't upload $1 error quering the photos database:", 'err', [req.file.filename])
                        console.log(error)
                        res.redirect('/photos')
                    })
            }
        })
    })
})

// Delete Photo From Photo Album
//
// This request is to allow either an admin or the user who uploaded a photo to delete it. It is called
// from the '/photos' page. The user is first authenticated. Information about the photo they are trying to
// delete is collected by querying the 'photos' table. The user is then checked to see that they are
// either an admin or that they own the photo which they are trying to delete. If either of these is true then
// the photo is first removed from the 'photos' table and then deleted from the folder (./public/img/photo_album/).
// When this is complete a 'success' signal is sent back to the client which in turn removes the image from the 
// photos page.

router.post('/delete_photo', function(req, res, next) {
    authenticate(req, res, null, function() {
        log("$1 is attempting to delete $2", 'inf', [req.session.passport.user.email, req.body.photo_title]);
        db.query("SELECT uploaded_user_email FROM photos WHERE photo_title=$1", [req.body.photo_title])
            .then(function(data) {
                if (data.length > 0) {
                    if (data[0].uploaded_user_email == req.session.passport.user.email || req.session.passport.user.is_admin) {
                        db.query("DELETE FROM photos WHERE photo_title=$1", [req.body.photo_title])
                            .then(function(data) {
                                fs.unlinkSync('./public/img/photo_album/' + req.body.photo_title);
                                log("$1 successfully deleted $2", 'suc', [req.session.passport.user.email, req.body.photo_title]);
                                res.send('success');
                            })
                            .catch(function(error) {
                                log("$1 couldn't delete $2 as there was an error when quering the photos table:", 'err', [req.session.passport.user.email, req.body.photo_title]);
                                console.log(error);
                                res.send('Whoops! Something went wrong when deleting ' + req.body.photo_title + '.');
                            });
                    } else {
                        log("Couldn't delete $1 as $2 doesn't have permission", 'wrn', [req.body.photo_title, req.session.passport.user.email]);
                        res.send("Whoops! Doesn't look like you have permission to delete " + req.body.photo_title + '.');
                    }
                } else {
                    log("Couldn't find $1 in the photos table", 'err', [req.body.photo_title]);
                    res.send('Whoops! Something went wrong when deleting ' + req.body.photo_title + '.');
                }
            })
            .catch(function(error) {
                console.log("Couldn't find $1 as there was an error when quering the photos table:", 'err', [req.body.photo_title]);
                console.log(error);
                res.send('Whoops! Something went wrong when deleting ' + req.body.photo_title + '.');
            })
    })
})

// Profile Updates
//
// This request is called from the '/edit_profile' page which allows users to update their username,
// password and profile photo. For this a multipart form is sent to the server which may include blank fields
// where the user only wants to update certain fields.
//
// The process begins by authenticating the user by calling authenticate(). If this is successful a query is
// made to the 'golfers' table to collect the users password hash and current profile photo file. From here,
// the Multer library is used (see ./abstracted_functions/image_upload_objects.js for a full explaination) to
// pass the multi part form which may or may not include an image. If there is an error processing the request
// at this point it is because the file type is not an image. In this case the edit_profile page is returned with
// an error noting that that file type is not valid. Where an error is not thrown this means either that the
// image was uploaded into ./img/temp_photos correctly, or that there was no file included in the request (i.e.
// the user doesn't wish to update their profile photo).
//
// In the case of no error, the users password hash is compared to the provided password to double check they are
// the who they claim. When this passes three function are called in parallel: username, photo and password:
//
// username - this checks if the user has provided an updated username. If they have there are two checks performed:
// that the username is not already taken (to avoid confusion in the chat) and that the username is valid (only contains
// alphanumeric characters, is 4 or more but less than 100 characters long). If these tests pass then the new username
// is inserted in the 'golfers' table.
//
// photo - this inserts the photo filename into the 'golfers' table and then moves the photo from ./img/temp_photos
// to ./img/profile_pictures.
//
// password - this checks if the user has provided an updated password in either of the password fields. Note that
// the /edit_profile page requires the user to repeat their new password. This process first checks that the two
// passwords match, were they do the bcrypt library is used to create a hash of the new password and this is then
// uploaded into the 'golfers' db. 
//
// Once all three of these functions run the users session is terminated with req.logout(), the session is restarted
// using passport.authenticate() just as if they had logged in for the first time. This is done to reset the details
// in their session (including username). If this is successful the /edit_profile page is returned along with 
// notifications on what has been updated.

router.post('/submit_profile_update', function(req, res, next) {
    authenticate(req, res, 'edit_profile', function() {
        error_array = []
        success_array = []
        db.query("SELECT password, profile_photo_title FROM golfers WHERE email = $1", [req.session.passport.user.email])
            .then(function(previous_user_data) {
                if (previous_user_data.length > 0) {
                    image_uploaders.edit_profile_picture.single('photo_file')(req, res, function(error) {
                        if (error) {
                            log("Couldn't process profile update for $1 as there was an error uploading:", 'err', [req.session.passport.user.email])
                            console.log(error)
                            res.render('edit_profile', { user: req.session.passport.user.username, profile_photo_title: previous_user_data[0].profile_photo_title, output_notices: { error_output: [error + ' No changes were made.'], success_output: [] } });
                            return
                        } else {
                            log("Successfully collected user password for $1", 'suc', [req.session.passport.user.email]);
                            bcrypt.compare(req.body.password, previous_user_data[0].password, function(err, password_res) {
                                if (password_res == true) {
                                    log("$1 provided the correct password", 'suc', [req.session.passport.user.email]);
                                    async.parallel({
                                        username: function(callback) {
                                            if (req.body.username != '') {
                                                var update_username = req.body.username.replace(/[^\w\s]/gi, '')
                                                if (update_username != req.body.username) {
                                                    error_array.push(req.body.username + ' is not valid. Would you like to use ' + update_username + '?')
                                                    callback(null)
                                                } else if (req.body.username.length < 4) {
                                                    error_array.push(req.body.username + ' is not 4 or more characters long. Try something longer.')
                                                    callback(null)
                                                } else if (update_username.length > 100) {
                                                    error_array.push('The username ' + update_username + ' is too long. Want to try something less than 100 characters?')
                                                    callback(null)
                                                } else {
                                                    db.query("SELECT username FROM golfers WHERE username = $1", [update_username])
                                                        .then(function(usernames) {
                                                            if (usernames.length > 0) {
                                                                error_array.push('The username ' + update_username + ' is already taken. Want to try something else?')
                                                                callback(null)
                                                            } else {
                                                                db.query("UPDATE golfers SET username=$1 WHERE email=$2", [update_username, req.session.passport.user.email])
                                                                    .then(function(data) {
                                                                        log("Successfully updated username for $1", 'suc', [req.session.passport.user.email]);
                                                                        success_array.push("Your username is now updated to " + update_username)
                                                                        callback(null);
                                                                    })
                                                                    .catch(function(error) {
                                                                        log("Couldn't update username for $1 error quering the golfers database:", 'err', [req.session.passport.user.email]);
                                                                        console.log(error);
                                                                        error_array.push("Something went wrong updating your password, try again.")
                                                                        callback(null);
                                                                    })
                                                            }
                                                        })
                                                        .catch(function(error) {
                                                            log("Couldn't update username for $1 error quering the golfers database:", 'err', [req.session.passport.user.email]);
                                                            console.log(error);
                                                            error_array.push("Something went wrong updating your username, try again.")
                                                            callback(null);
                                                        })
                                                }
                                            } else {
                                                callback(null)
                                            }
                                        },
                                        photo: function(callback) {
                                            if (req.file) {
                                                db.query("UPDATE golfers SET profile_photo_title=$1 WHERE email=$2", [req.file.filename, req.session.passport.user.email])
                                                    .then(function(data) {
                                                        fs.rename('./public/img/temp_photos/' + req.file.filename, './public/img/profile_pictures/' + req.file.filename, function() {
                                                            log("Successfully updated profile picture for $1", 'suc', [req.session.passport.user.email]);
                                                            success_array.push("Your profile picture is now updated.")
                                                            callback(null)
                                                        })
                                                    })
                                                    .catch(function(error) {
                                                        log("Couldn't update image for $1 error quering the golfers database:", 'err', [req.session.passport.user.email]);
                                                        console.log(error);
                                                        error_array.push("Something went wrong updating your password, try again.")
                                                        callback(null);
                                                    });
                                            } else {
                                                callback(null);
                                            }
                                        },
                                        password: function(callback) {
                                            if (req.body.new_password_1 != '' || req.body.new_password_2 != '') {
                                                if (req.body.new_password_1 != req.body.new_password_2) {
                                                    error_array.push("It looks like the two new passwords you provided don't match! Maybe have another crack at it friend.")
                                                    callback(null);
                                                } else {
                                                    if (req.body.new_password_1.length > 4) {
                                                        bcrypt.genSalt(salt_rounds, function(err, salt) {
                                                            console.log(err);
                                                            bcrypt.hash(req.body.new_password_1, salt, null, function(err, hash) {
                                                                db.query("UPDATE golfers SET password=$1 WHERE email=$2", [hash, req.session.passport.user.email])
                                                                    .then(function(data) {
                                                                        log("Successfully updated password for $1", 'suc', [req.session.passport.user.email]);
                                                                        success_array.push("Your password is now updated")
                                                                        req.body.password = req.body.new_password_1
                                                                        callback(null);
                                                                    })
                                                                    .catch(function(error) {
                                                                        log("Couldn't update password for $1 error quering the golfers database:", 'err', [req.session.passport.user.email]);
                                                                        console.log(error);
                                                                        error_array.push("Something went wrong updating your password, try again.")
                                                                        callback(null);
                                                                    })
                                                            })
                                                        })
                                                    } else {
                                                        error_array.push("You new password must be at least five characters long. Other than that, whatever you want.")
                                                        callback(null);
                                                    }
                                                }
                                            } else {
                                                callback(null);
                                            }
                                        }
                                    }, function(err, results) {
                                        req.body.email = req.session.passport.user.email
                                        req.logout()
                                        passport.authenticate('local', { badRequestMessage: "Looks like you are missing either your email or password." }, function(error, user, info) {
                                            if (error || !user || user == false) {
                                                log("$1 had trouble reestablishing a session after updating their profile, this shouldn't have happened", 'err', [req.session.passport.user.email])
                                                return res.render('login', { warning: info.message });
                                            }
                                            req.login(user, loginErr => {
                                                if (loginErr) {
                                                    return next(loginErr);
                                                }
                                                req.session.save(function(err) {
                                                    log("Redirecting $1 to /edit_profile", 'inf', [req.session.passport.user.email]);
                                                    output_notices = { error_output: error_array, success_output: success_array }
                                                    db.query("SELECT username, is_admin, profile_photo_title FROM golfers WHERE email = $1", [req.session.passport.user.email])
                                                        .then(function(return_data) {
                                                            if (return_data.length > 0) {
                                                                log("Successfully collected updated data for $1", 'suc', [req.session.passport.user.email]);
                                                                res.render('edit_profile', { user: return_data[0].username, profile_photo_title: return_data[0].profile_photo_title, output_notices: output_notices });
                                                            } else {
                                                                res.redirect('/login')
                                                            }
                                                        })
                                                        .catch(function(return_data) {
                                                            log("Couldn't collect updated information for $1 as there was an error when quering the golfers table:", 'err', [req.session.passport.user.email]);
                                                            console.log(error);
                                                            res.render('edit_profile', { error_message: 'Whoops! Something went wrong, try reloading the page' });
                                                        })
                                                });
                                            });
                                        })(req, res, next);
                                    });
                                } else {
                                    log("$1 wasn't able to edit their profile because their password was wrong", 'err', [req.session.passport.user.email]);
                                    output_notices = { success_array: [], error_array: ["Woops! I don't think that is the correct password. No changes were made."] }
                                    res.render('edit_profile', { user: req.session.passport.user.username, profile_photo_title: photo_data[0].profile_photo_title, output_notices: output_notices });
                                    return
                                }
                            })
                        }
                    })
                } else {
                    res.redirect('/login');
                }
            })
            .catch(function() {
                log("Couldn't collect information for $1 as there was an error when quering the golfers table:", 'err', [req.session.passport.user.email]);
                console.log(error);
                res.render('edit_profile', { error_message: 'Ah oh! Something went wrong, try reloading the page' });
            })
    })
})

/* TOM SECTION. */

router.get('/scorecard', function(req, res, next) {


    tom_js.get_short_lboard(db, 1)
        .then(data => {

            lboard_html = tom_js.format_lboard(data)

            links_html = tom_js.format_hole_links()

            res.render('scorecard', {
                title: 'Scorecard',
                leaderboard: lboard_html,
                links: links_html
            })
        }).catch(error => { console.log(error) })

    // console.log(JSON.stringify(leaderboard_s));

    // res.render('scorecard', { title: 'Scorecard'});
});


router.get('/scorecard/card', function(req, res, next) {

    day = req.query.day;
    hole = req.query.hole;

    // Get current scores from the database
    tom_js.get_hole_scores(db, day, hole)
        .then(data => {

            var scores_html_ = tom_js.format_hole_scores(data);

            var top_scorer_ = tom_js.top_scorer(data);

            // Get hole info from the database
            tom_js.get_hole_info(db, day, hole)
                .then(data => {

                    details = JSON.stringify(data);

                    var distance_ = data[0].distance;
                    var par_ = data[0].par;
                    var pro_tip_ = data[0].pro_tip;

                    // Render the card with the right data
                    res.render('card', {
                        title: 'Hole Scoracard',
                        day: day,
                        hole: hole,
                        scores: scores_html_,
                        distance: distance_,
                        par: par_,
                        top_scorer: top_scorer_,
                        pro_tip: pro_tip_
                    });

                }).catch(error => { console.log(error) })


        }).catch(error => { console.log(error) })

});


router.post("/scorecard/card", function(req, res, next) {

    var user = req.user.username;
    var hole = req.body.hole;
    var day = req.body.day;
    var score = req.body.score;

    tom_js.log_score(db, user, hole, day, score)
        .then(data => {

            // Do nothing

        }).catch(error => { console.log("Something went awry") })


});

/******************************************* MODULE EXPORTS **************************************/

module.exports = router;