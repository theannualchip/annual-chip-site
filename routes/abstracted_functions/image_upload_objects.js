/************************************* THIRD PARTY DEPENDANCIES **********************************/

var path = require('path');
var fs = require('fs');
var moment = require('moment');
var multer = require('multer');

/**************************************** ABSTRACTED FUNCTIONS ***********************************/

var db = require('../../db.js');
var log = require('./log.js')

/****************************************** GLOBAL CONSTANTS *************************************/

const allowable_image_types = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg'];

/******************************************** MAIN SCRIPT ****************************************/

// get_unique_photo_filename()
//
// The get_unique_photo_filename function checks a 'filename' against existing files in 'dire-
// ctory' and existing filenames in the data returned by 'current_photo_list'. If the image 
// already exists, then the function will try filename-1, then filename-2 etc until an availa-
// ble option is found.

function get_unique_photo_filename(filename, directory, current_photo_list, call_back) {
    db.query(current_photo_list)
        .then(function(data) {
            var existing_names = [];
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
                    log("Couldn't find an available filename for $1", 'err', [filename]);
                    return call_back("error");
                }
            });
        })
        .catch(function(error) {
            log("Couldn't upload $1 error quering the photos database:", 'err', [filename]);
            console.log(error);
            return call_back("error");
        });
}

// photo_upload()
//
// This object tells the multer library what to do with files which are uploaded in 
// multipart forms (i.e. forms with files included). The ultimate output is to upload
// the file into 'destination' with a unique username as compared to the current images
// in the folder and the filenames returned by 'reference_query'.

function photo_upload(destination, reference_query, gifs) {
    return_object = multer.diskStorage({
        destination: destination,
        filename: function(req, file, cb) {
            if (allowable_image_types.indexOf(path.extname(file.originalname).toLowerCase()) > -1) {
                if (gifs == true || path.extname(file.originalname).toLowerCase() != '.gif') {
                    get_unique_photo_filename(file.originalname, './public/img/profile_pictures/', reference_query, function(new_file_name) {
                        if (new_file_name == "error") {
                            cb("Something went wrong uploading " + file.originalname.toLowerCase() + ". Try uploading a different image file, or even renaming it.");
                        } else {
                            cb(null, new_file_name);
                        }
                    });
                } else {
                    cb("We can't work with " + path.extname(file.originalname).toLowerCase() + " files. Try uploading a regular image file.");
                }
            } else {
                cb("We can't work with " + path.extname(file.originalname).toLowerCase() + " files. Try uploading a regular image file.");
            }
        }
    })
    return return_object
}

exports.upload_photo_album = multer({ storage: photo_upload('./public/img/photo_album/', 'SELECT photo_title FROM photos', true) });

exports.upload_profile_picture = multer({ storage: photo_upload('./public/img/profile_pictures/', 'SELECT profile_photo_title FROM golfers', false) });

exports.edit_profile_picture = multer({ storage: photo_upload('./public/img/temp_photos/', 'SELECT profile_photo_title FROM golfers', false) });
