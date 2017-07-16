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
var chat_bot = require('./chat_bot.js');
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
        res.locals.standard_return={
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
                    log("Successfully collected user info for $1", 'suc', [decodeURIComponent(req.params.email)]);
                    res.render('profile', { user_info: data[0] });
                } else {
                    log("Couldn't find a user with email $1 in the golfers database", 'wrn', [decodeURIComponent(req.params.email)]);
                    res.render('profile', {warning: "Woops! It doesn't look like we have a user with email " + decodeURIComponent(req.params.email) });
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
                    log("Successfully collected user information for $1",'suc',[req.session.passport.user.email]);
                    res.render('edit_profile', { user: req.session.passport.user.username, profile_photo_title: data[0].profile_photo_title});
                } else {
                    res.redirect('/login');
                }
            })
            .catch(function(error) {
                log("Couldn't collect information for $1 as there was an error when quering the golfers table:",'err',[req.session.passport.user.email]);
                console.log(error);
                res.render('edit_profile', { error_message: 'Ah oh! Something went wrong, try reloading the page'});
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
        db.query("SELECT p.photo_title, p.short_title, g.email, g.username FROM photos as p, golfers as g WHERE p.uploaded_user_email=g.email AND image_context='album'")
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
                    log("Looks like there are no photos in the table, rendering page without any",'inf');
                    res.render('photos', { user: req.session.passport.user.username, warning:"Looks like there aren't any photos yet. Maybe you could upload one?"});
                }
            })
            .catch(function(error) {
                log("Couldn't find any photos as there was an error when quering the photos table:",'err');
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
        db.query("SELECT is_admin FROM golfers WHERE email=$1",[req.session.passport.user.email])
            .then(function(data) {
                if (data.length>0) {
                    if (data[0].is_admin) {
                        res.render('admin', { user: req.session.passport.user.username});
                    } else {
                        log("Someone tried to access the admin page without admin rights user $1",'wrn',[req.session.passport.user.email])
                        res.redirect('/');
                    }
                } else {
                    res.redirect('/');
                }
            })
            .catch(function(error) {
                log("Couldn't validate that $1 has admin rights as there was an error querying the golfers table:",'err',[req.session.passport.user.email]);
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
    // 

router.get('/bets', function(req, res, next) {
    authenticate(req, res, 'bets', function() {
        /*db.query("SELECT is_admin FROM golfers WHERE email=$1",[req.session.passport.user.email])
            .then(function(data) {
                if (data.length>0) {
                    if (data[0].is_admin) {
                        res.render('admin', { user: req.session.passport.user.username, is_admin: req.session.passport.user.is_admin, current_page: 'admin' });
                    } else {
                        log("Someone tried to access the admin page without admin rights user $1",'wrn',[req.session.passport.user.email])
                        res.redirect('/');
                    }
                } else {
                    res.redirect('/');
                }
            })
            .catch(function(error) {
                log("Couldn't validate that $1 has admin rights as there was an error querying the golfers table:",'err',[req.session.passport.user.email]);
                console.log(error);
                res.redirect('/');
            })
        */
        res.render('bets', { user: req.session.passport.user.username});
    })
})

/********************************** POST REQUESTS FOR VARIOUS THINGS *****************************/

router.post('/user_login', function(req, res, next) {
    passport.authenticate('local', { badRequestMessage: "Looks like you are missing either your email or password." }, function(error, user, info) {
        if (error || !user || user == false) {
            return res.render('login', { warning: info.message });
        }
        req.login(user, loginErr => {
            if (loginErr) {
                return next(loginErr);
            }
            req.session.save(function(err) {
                console.log("Redirecting \x1b[34m" + req.session.passport.user.email + "\x1b[0m to index.ejs");
                return res.redirect('/');
            });
        });
    })(req, res, next);
});

router.post('/user_signup', function(req, res, next) {
    if (req.isAuthenticated() && req.session.passport.user.is_admin) {
        image_uploaders.upload_profile_picture.single('photo_file')(req, res, function(error) {
            if (error) {
                console.log(error);
                res.render('admin', { user: req.session.passport.user.username, is_admin: req.session.passport.user.is_admin, current_page: 'admin', sign_up_success: error });
                return
            } else {
                if (req.body.is_admin) {
                    is_admin = true;
                } else {
                    is_admin = false;
                }
                console.log("Creating new user: \x1b[34m" + JSON.stringify(req.body) + "\x1b[0m");
                bcrypt.genSalt(salt_rounds, function(err, salt) {
                    console.log(err);
                    bcrypt.hash(req.body.password, salt, null, function(err, hash) {
                        console.log(err);
                        db.query("INSERT INTO golfers (username,email,password,is_admin,profile_photo_title) VALUES ($1,$2,$3,$4,$5)", [req.body.username, req.body.email, hash, is_admin, req.file.filename])
                            .then(function(data) {
                                console.log("\x1b[42m\x1b[37mSuccessfully created user for\x1b[0m \x1b[34m" + JSON.stringify(req.body) + "\x1b[0m");
                                res.render('admin', { user: req.session.passport.user.username, is_admin: req.session.passport.user.is_admin, current_page: 'admin', sign_up_success: "Success! Signed up " + req.body.email + "." });
                            })
                            .catch(function(error) {
                                console.log("Couldn't sign up user \x1b[34m" + JSON.stringify(req.body) + "\x1b[31m error quering the golfers database\x1b[0m:");
                                console.log(error);
                                res.render('admin', { user: req.session.passport.user.username, is_admin: req.session.passport.user.is_admin, current_page: 'admin', sign_up_success: "Couldn't sign up user as there was an error quering the golfers database." });
                            });
                    });
                });
            }
        });
    } else {
        res.redirect('/');
    }
});

router.post('/previous_messages',
    function(req, res, next) {
        if (req.isAuthenticated()) {
            db.query("SELECT c.user_email, c.comment, c.timestamp, g.username, g.profile_photo_title FROM chat as c, golfers as g WHERE c.user_email=g.email ORDER BY c.timestamp")
                .then(function(data) {
                    return_array = []
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
                                    if (message > 1) {
                                        if (return_array.length > 14 && !moment.utc(data[message - 1].timestamp).isSame(moment.utc(data[message - 2].timestamp), 'd')) {
                                            finished_collecting = true
                                        }
                                    }
                                }
                            }
                        }
                        console.log("\x1b[42m\x1b[37mSuccessfully collected previous chat logs\x1b[0m");
                    }
                    res.send(return_array);
                })
                .catch(function(error) {
                    console.log("Couldn't collect previous chat comments \x1b[31m error quering the chat database\x1b[0m:");
                    console.log(error);
                    res.send('index', { user: req.session.passport.user.username, user_email: req.session.passport.user.email, is_admin: req.session.passport.user.is_admin, current_page: 'chit_chat', error_message: "Woops! Something went wrong." });
                });
        } else {
            res.redirect('/login');
        }
    }
);

router.post('/photo_album_upload', function(req, res, next) {
    if (req.isAuthenticated()) {
        image_uploaders.upload_photo_album.single('photo_file')(req, res, function(error) {
            if (error) {
                console.log(error);
                res.render('photos', { user: req.session.passport.user.username, is_admin: req.session.passport.user.is_admin, current_page: 'photos', warning: error });
                return
            } else {
                console.log("\x1b[42m\x1b[37mSuccessfully uploaded \x1b[0m \x1b[34m" + req.file.originalname + "\x1b[0m");
                db.query("INSERT INTO photos (photo_title,date_uploaded,uploaded_user_email,image_context,short_title) VALUES ($1,$2,$3,$4,$5)", [req.file.filename, moment.utc(), req.session.passport.user.email, "album", req.body.photo_title])
                    .then(function(data) {
                        console.log("\x1b[42m\x1b[37mSuccessfully added \x1b[0m \x1b[34m" + req.file.filename + "\x1b[0m to the photos table");
                        res.redirect('/photos');
                    })
                    .catch(function(error) {
                        console.log("Couldn't upload \x1b[34m" + req.file.filename + "\x1b[31m error quering the photos database\x1b[0m:");
                        console.log(error);
                        res.redirect('/photos');
                    });
            }
        });
    } else {
        res.redirect('/');
    }
});

router.post('/delete_photo', function(req, res, next) {
    if (req.isAuthenticated()) {
        console.log(req.session.passport.user.email + " is attempting to delete \x1b[0m" + req.body.photo_title + "\x1b[0m");
        db.query("SELECT uploaded_user_email FROM photos WHERE photo_title=$1", [req.body.photo_title])
            .then(function(data) {
                if (data.length > 0) {
                    if (data[0].uploaded_user_email == req.session.passport.user.email || req.session.passport.user.is_admin) {
                        db.query("DELETE FROM photos WHERE photo_title=$1", [req.body.photo_title])
                            .then(function(data) {
                                fs.unlinkSync('./public/img/photo_album/' + req.body.photo_title);
                                console.log("\x1b[42m\x1b[37mSuccessfully deleted \x1b[0m \x1b[34m" + req.body.photo_title + "\x1b[0m");
                                res.send('success');
                            })
                            .catch(function(error) {
                                console.log("Couldn't delete \x1b[0m" + req.body.photo_title + "\x1b[31m as there was an error when quering the photos table\x1b[0m:");
                                console.log(error);
                                res.send('Ah oh... Something went wrong when deleting ' + req.body.photo_title + '.');
                            });
                    } else {
                        console.log("Couldn't delete \x1b[0m" + req.body.photo_title + "\x1b[0m as " + req.session.passport.user.email + " doesn't have permission");
                        res.send("Doesn't look like you have permission to delete " + req.body.photo_title + '.');
                    }
                } else {
                    console.log("Couldn't find \x1b[0m" + req.body.photo_title + "\x1b[0m in the photos table");
                    res.send('Ah oh... Something went wrong when deleting ' + req.body.photo_title + '.');
                }
            })
            .catch(function(error) {
                console.log("Couldn't find \x1b[0m" + req.body.photo_title + "\x1b[31m as there was an error when quering the photos table\x1b[0m:");
                console.log(error);
                res.send('Ah oh... Something went wrong when deleting ' + req.body.photo_title + '.');
            });
    } else {
        res.redirect('/');
    }
});

router.post('/submit_profile_update', function(req, res, next) {
    if (req.isAuthenticated()) {
        error_array = []
        success_array = []
        db.query("SELECT profile_photo_title FROM golfers WHERE email = $1", [req.session.passport.user.email])
            .then(function(photo_data) {
                if (photo_data.length > 0) {
                    db.query("SELECT password FROM golfers WHERE email = $1", [req.session.passport.user.email])
                        .then(function(password_data) {
                            image_uploaders.edit_profile_picture.single('photo_file')(req, res, function(error) {
                                if (error) {
                                    console.log("Couldn't process profile update for \x1b[0m" + req.session.passport.user.email + "\x1b[31m as there was an error uploading\x1b[0m:")
                                    console.log(error)
                                    error_array.push(error + ' No changes were made.')
                                    output_notices = {}
                                    output_notices.error_output = error_array
                                    output_notices.success_output = success_array
                                    res.render('edit_profile', { user: req.session.passport.user.username, is_admin: req.session.passport.user.is_admin, profile_photo_title: photo_data[0].profile_photo_title, current_page: 'edit_profile', output_notices: output_notices });
                                    return
                                } else {
                                    if (password_data.length > 0) {
                                        console.log("\x1b[42m\x1b[37mSuccessfully collected user password for \x1b[0m \x1b[34m" + req.session.passport.user.email + "\x1b[0m");
                                        bcrypt.compare(req.body.password, password_data[0].password, function(err, password_res) {
                                            if (password_res == true) {
                                                console.log("\x1b[34m" + req.session.passport.user.email + "\x1b[42m \x1b[37mprovided the correct password\x1b[0m");
                                                async.parallel({
                                                        username: function(callback) {
                                                            if (req.body.username != '') {
                                                                var update_username = req.body.username.replace(/[^\w\s]/gi, '')
                                                                if (update_username != req.body.username) {
                                                                    error_array.push(req.body.username + ' is not valid. Would you like to use ' + update_username + '?')
                                                                    callback(null)
                                                                } else {
                                                                    db.query("SELECT username FROM golfers")
                                                                        .then(function(usernames) {

                                                                            var username_taken = false
                                                                            for (row_1 = 0; row_1 < usernames.length; row_1++) {
                                                                                if (usernames[row_1].username == update_username) {
                                                                                    username_taken = true
                                                                                }
                                                                            }
                                                                            if (username_taken) {
                                                                                error_array.push('The username ' + update_username + ' is already taken. Want to try something else?')
                                                                                callback(null)
                                                                            } else {
                                                                                if (username_taken.length > 100) {
                                                                                    error_array.push('The username ' + update_username + ' is too long. Want to try something less than 100 characters?')
                                                                                    callback(null)
                                                                                } else {
                                                                                    db.query("UPDATE golfers SET username=$1 WHERE email=$2", [update_username, req.session.passport.user.email])
                                                                                        .then(function(data) {
                                                                                            console.log("\x1b[42m\x1b[37mSuccessfully updated username for \x1b[0m \x1b[34m" + req.session.passport.user.email + "\x1b[0m");
                                                                                            success_array.push("Your username is now updated to " + update_username)
                                                                                            callback(null);
                                                                                        })
                                                                                        .catch(function(error) {
                                                                                            console.log("Couldn't update username for \x1b[34m" + req.session.passport.user.email + "\x1b[31m error quering the golfers database\x1b[0m:");
                                                                                            console.log(error);
                                                                                            error_array.push("Something went wrong updating your password, try again.")
                                                                                            callback(null);
                                                                                        });
                                                                                }
                                                                            }
                                                                        })
                                                                        .catch(function(error) {
                                                                            console.log("Couldn't update username for \x1b[34m" + req.session.passport.user.email + "\x1b[31m error quering the golfers database\x1b[0m:");
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
                                                                            console.log("\x1b[42m\x1b[37mSuccessfully updated profile picture for \x1b[0m \x1b[34m" + req.session.passport.user.email + "\x1b[0m");
                                                                            success_array.push("Your profile picture is now updated.")
                                                                            callback(null)
                                                                        })

                                                                    })
                                                                    .catch(function(error) {
                                                                        console.log("Couldn't update image for \x1b[34m" + req.session.passport.user.email + "\x1b[31m error quering the golfers database\x1b[0m:");
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
                                                                                        console.log("\x1b[42m\x1b[37mSuccessfully updated password for \x1b[0m \x1b[34m" + req.session.passport.user.email + "\x1b[0m");
                                                                                        success_array.push("Your password is now updated")
                                                                                        req.body.password = req.body.new_password_1
                                                                                        callback(null);
                                                                                    })
                                                                                    .catch(function(error) {
                                                                                        console.log("Couldn't update password for \x1b[34m" + req.session.passport.user.email + "\x1b[31m error quering the golfers database\x1b[0m:");
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
                                                    },
                                                    function(err, results) {
                                                        req.body.email = req.session.passport.user.email
                                                        req.logout()
                                                        passport.authenticate('local', { badRequestMessage: "Looks like you are missing either your email or password." }, function(error, user, info) {
                                                            if (error) {
                                                                console.log('A login error occured')
                                                                console.log(error)
                                                            }
                                                            if (error || !user || user == false) {
                                                                return res.render('login', { warning: info.message });
                                                            }
                                                            req.login(user, loginErr => {
                                                                if (loginErr) {
                                                                    return next(loginErr);
                                                                }
                                                                req.session.save(function(err) {
                                                                    console.log("Redirecting \x1b[34m" + req.session.passport.user.email + "\x1b[0m to edit_profile.ejs");
                                                                    output_notices = {}
                                                                    output_notices.error_output = error_array
                                                                    output_notices.success_output = success_array
                                                                    db.query("SELECT username, is_admin, profile_photo_title FROM golfers WHERE email = $1", [req.session.passport.user.email])
                                                                        .then(function(return_data) {
                                                                            if (return_data.length > 0) {
                                                                                console.log("\x1b[42m\x1b[37mSuccessfully collected updated data for \x1b[0m \x1b[34m" + req.session.passport.user.email + "\x1b[0m");
                                                                                res.render('edit_profile', { user: return_data[0].username, is_admin: return_data[0].username.is_admin, profile_photo_title: return_data[0].profile_photo_title, current_page: 'edit_profile', output_notices: output_notices });
                                                                            } else {
                                                                                res.redirect('/login')
                                                                            }
                                                                        })
                                                                        .catch(function(return_data) {
                                                                            console.log("Couldn't collect updated information for \x1b[0m" + req.session.passport.user.email + "\x1b[31m as there was an error when quering the golfers table\x1b[0m:");
                                                                            console.log(error);
                                                                            res.render('edit_profile', { error_message: 'Ah oh! Something went wrong, try reloading the page', current_page: 'edit_profile' });
                                                                        })
                                                                });
                                                            });
                                                        })(req, res, next);
                                                    });
                                            } else {
                                                console.log("\x1b[34m" + req.session.passport.user.email + "\x1b[31m wasn't able to edit their profile because their password was wrong\x1b[0m");
                                                error_array.push("Woops! I don't think that is the correct password. No changes were made.")
                                                output_notices = {}
                                                output_notices.error_output = error_array
                                                output_notices.success_output = success_array
                                                res.render('edit_profile', { user: req.session.passport.user.username, is_admin: req.session.passport.user.is_admin, profile_photo_title: photo_data[0].profile_photo_title, current_page: 'edit_profile', output_notices: output_notices });
                                                return
                                            }
                                        })
                                    } else {
                                        res.redirect('/login');
                                    }
                                }
                            });
                        })
                        .catch(function(error) {
                            console.log("Couldn't collect information for \x1b[0m" + req.session.passport.user.email + "\x1b[31m as there was an error when quering the golfers table\x1b[0m:");
                            console.log(error);
                            res.render('edit_profile', { error_message: 'Ah oh! Something went wrong, try reloading the page', current_page: 'edit_profile' });
                        });
                } else {
                    res.redirect('/');
                }
            })
            .catch(function() {
                console.log("Couldn't collect information for \x1b[0m" + req.session.passport.user.email + "\x1b[31m as there was an error when quering the golfers table\x1b[0m:");
                console.log(error);
                res.render('edit_profile', { error_message: 'Ah oh! Something went wrong, try reloading the page', current_page: 'edit_profile' });
            })
    } else {
        res.redirect('/');
    }
});

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
                                pro_tip: pro_tip_ });

                }).catch(error => { console.log(error) })


        }).catch(error => { console.log(error) })

});

/* General Stuff */

module.exports = router;
