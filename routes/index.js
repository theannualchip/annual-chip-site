/* Dependancies */

var express = require('express');
var router = express.Router();
var path = require('path');
var fs = require('fs');
var pgp = require('pg-promise')();
var tom_js = require("../public/javascripts/tom_backend.js");
var db = require("../db.js");
var passport_setup = require('./passport_setup.js');
var passport = require('passport');
var bcrypt = require('bcrypt-nodejs');
var moment = require('moment');
var multer = require('multer');
const salt_rounds = 10;

/* MESSAGES */

var chat_bot = require('./chat_bot.js');

/* SAM SECTION. */

var allowable_image_types = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg'];

function get_unique_photo_filename(filename, directory, current_photo_list, call_back) {
    db.query(current_photo_list)
        .then(function(data) {
            existing_names = [];
            if (data.length > 0) {
                for (row_1 = 0; row_1 < data.length; row_1++) {
                    existing_names.push(data[row_1].photo_title);
                }
            }
            fs.readdir(directory, function(err, files) {
                if (files.indexOf(filename) < 0 && existing_names.indexOf(filename) < 0) {
                    return call_back(filename);
                } else {
                    count = 1;
                    while (count < 100) {
                        temp_file_name = filename.substring(0, filename.length - path.extname(filename).length) + "-" + count + path.extname(filename);
                        if (files.indexOf(temp_file_name) < 0 && existing_names.indexOf(temp_file_name) < 0) {
                            return call_back(temp_file_name);
                            count += 1;
                        } else {
                            count += 1;
                        }
                    }
                    console.log("\x1b[31mCouldn't find an available filename for \x1b[34m" + filename + "\x1b[0m.");
                    return call_back("error");
                }
            });
        })
        .catch(function(error) {
            console.log("Couldn't upload \x1b[34m" + filename + "\x1b[31m error quering the photos database\x1b[0m:");
            console.log(error);
            return call_back("error");
        });
}

var photo_album_storage = multer.diskStorage({
    destination: './public/img/photo_album/',
    filename: function(req, file, cb) {
        if (allowable_image_types.indexOf(path.extname(file.originalname).toLowerCase()) > -1) {
            get_unique_photo_filename(file.originalname, './public/img/photo_album/', 'SELECT photo_title FROM photos', function(new_file_name) {
                if (new_file_name == "error") {
                    cb("Something went wrong uploading " + file.originalname.toLowerCase() + ". Try uploading a different image file, or even renaming it.");
                } else {
                    db.query("INSERT INTO photos (photo_title,date_uploaded,uploaded_user_email,image_context,short_title) VALUES ($1,$2,$3,$4,$5)", [new_file_name, moment.utc(), req.session.passport.user.email, "album", req.body.photo_title])
                        .then(function(data) {
                            console.log("\x1b[42m\x1b[37mSuccessfully added \x1b[0m \x1b[34m" + new_file_name + "\x1b[0m to photos db");
                            cb(null, new_file_name);
                        })
                        .catch(function(error) {
                            console.log("Couldn't upload \x1b[34m" + new_file_name + "\x1b[31m error quering the photos database\x1b[0m:");
                            console.log(error);
                            error_message = "Something went wrong uploading " + file.originalname.toLowerCase() + ". Try uploading a different image file, or even renaming it.";
                            cb(error_message);
                        });
                }
            });
        } else {
            cb("We can't work with " + path.extname(file.originalname).toLowerCase() + " files. Try uploading a regular image file.");
        }
    }
})

var upload_photo_album = multer({ storage: photo_album_storage });

var profile_photo_storage = multer.diskStorage({
    destination: './public/img/profile_pictures/',
    filename: function(req, file, cb) {
        if (allowable_image_types.indexOf(path.extname(file.originalname).toLowerCase()) > -1) {
            get_unique_photo_filename(file.originalname, './public/img/profile_pictures/', 'SELECT profile_photo_title FROM golfers', function(new_file_name) {
                if (new_file_name == "error") {
                    cb("Something went wrong uploading " + file.originalname.toLowerCase() + ". Try uploading a different image file, or even renaming it.");
                } else {
                    console.log("\x1b[42m\x1b[37mSuccessfully added \x1b[0m \x1b[34m" + new_file_name + "\x1b[0m to photos db");
                    cb(null, new_file_name);
                }
            });
        } else {
            cb("We can't work with " + path.extname(file.originalname).toLowerCase() + " files. Try uploading a regular image file.");
        }
    }
})

var upload_profile_picture = multer({ storage: profile_photo_storage });

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
        upload_profile_picture.single('photo_file')(req, res, function(error) {
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

router.get('/',
    function(req, res, next) {
        if (req.isAuthenticated()) {
            fs.readdir('./public/img/loading_images/', function(error, images) {
                if (error) {
                    console.error("\x1b[31mCouldn't collect read files in ./public/img/loading_images/ because of an error\x1b[0m:")
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
                    res.render('index', { user: req.session.passport.user.username, user_email: req.session.passport.user.email, is_admin: req.session.passport.user.is_admin, current_page: 'chit_chat', loading_image: todays_photo });
                }
            })
        } else {
            res.redirect('/login');
        }
    }
);

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
                                if (!moment.utc(data[message - 1].timestamp).isSame(upper_date, 'd') && moment.utc(data[message - 1].timestamp).diff(upper_date, 's')<0) {
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

router.get('/login', function(req, res, next) {
    req.session.destroy(function(err) {
        res.render('login', {});
    });
})

router.get('/admin', function(req, res, next) {
    if (req.isAuthenticated() && req.session.passport.user.is_admin) {
        res.render('admin', { user: req.session.passport.user.username, is_admin: req.session.passport.user.is_admin, current_page: 'admin' });
    } else {
        res.redirect('/');
    }
})

router.get('/photos', function(req, res, next) {
    if (req.isAuthenticated()) {
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
                            console.log("\x1b[31m Can't find the photo \x1b[34m" + data[row_1].photo_title + "\x1b[31m in the photo_album folder\x1b[0m:");
                        }
                    }
                    res.render('photos', { user: req.session.passport.user.username, is_admin: req.session.passport.user.is_admin, current_page: 'photos', image_array: image_array });
                } else {
                    console.log("Looks like there are no photos in the table, rendering page without any.");
                    res.render('photos', { user: req.session.passport.user.username, is_admin: req.session.passport.user.is_admin, current_page: 'photos' });
                }
            })
            .catch(function(error) {
                console.log("Couldn't find any photos \x1b[31m as there was an error when quering the photos table\x1b[0m:");
                console.log(error);
                res.render('photos', { user: req.session.passport.user.username, is_admin: req.session.passport.user.is_admin, current_page: 'photos' });
            });
    } else {
        res.redirect('/');
    }
})

router.post('/photo_album_upload', function(req, res, next) {
    if (req.isAuthenticated()) {
        upload_photo_album.single('photo_file')(req, res, function(error) {
            if (error) {
                console.log(error);
                res.render('photos', { user: req.session.passport.user.username, is_admin: req.session.passport.user.is_admin, current_page: 'photos', warning: error });
                return
            } else {
                console.log("\x1b[42m\x1b[37mSuccessfully uploaded \x1b[0m \x1b[34m" + req.file.originalname + "\x1b[0m");
                db.query("UPDATE photos SET short_title=$1 WHERE photo_title=$2", [req.body.photo_title, req.file.filename])
                    .then(function() {
                        console.log("\x1b[42m\x1b[37mSuccessfully updated short_title for \x1b[0m \x1b[34m" + req.file.filename + "\x1b[0m");
                        res.redirect('/photos');
                    })
                    .catch(function(error) {
                        console.log("Couldn't update short_title for \x1b[0m" + req.file.filename + "\x1b[31m as there was an error when quering the photos table\x1b[0m:");
                        res.redirect('/photos');
                    })

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


/* TOM SECTION. */

router.get('/scorecard', function(req, res, next) {


    tom_js.get_short_lboard(db, 1)
        .then(data => {

            lboard_html = tom_js.format_lboard(data)

            links_html = tom_js.format_hole_links(1)

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

       res.render('card', {title: 'Individual Hole', day: day, hole: hole});
});

/* General Stuff */

module.exports = router;
