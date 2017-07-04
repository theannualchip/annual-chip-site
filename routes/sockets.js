var pgp = require('pg-promise')();
var db = require("../db.js");
var moment = require('moment');

get_online_users = function(sockets,io) {
    var return_object = { online: [], offline: [] };
    db.query("SELECT username, last_active, email, profile_photo_title FROM golfers")
        .then(function(data) {
            for (row_1 = 0; row_1 < data.length; row_1++) {
                var is_online = false;
                for (user in sockets) {
                    if (sockets[user].useremail == data[row_1].email) {
                        is_online = true;
                    }
                }
                if (is_online) {
                    return_object.online.push(data[row_1])
                } else {
                    return_object.offline.push(data[row_1])
                }
            }
            console.log("\x1b[42m\x1b[37mSuccessfully collected online and offline golfers\x1b[0m");
            io.emit('online update', return_object);
        })
        .catch(function(error) {
            console.log("Couldn't get online golfers \x1b[31m error quering the golfers database\x1b[0m:")
            console.log(error)
        })
}

module.exports = function(io) {
    io.on('connection', function(socket) {
        socket.on('add user', function(user_email) {
            console.log("Attempting to connect user: " + user_email);
            db.query("SELECT * FROM golfers WHERE email=$1", [user_email])
                .then(function(data) {
                    if (data.length > 0) {
                        console.log("\x1b[42m\x1b[37mSuccessfully connected socket for\x1b[0m \x1b[34m" + user_email + "\x1b[0m");
                        socket.useremail = user_email;
                        socket.username = data[0].username;
                        socket.profile_photo_title = data[0].profile_photo_title;
                        get_online_users(io.sockets.connected,io);
                        io.emit('chat message', { username: "Chat Bot", message: socket.username + " just joined the conversation.", profile_photo_title: 'chat_bot.jpg', timestamp: moment.utc() });               
                    } else {
                        console.log("Couldn't connect socket for \x1b[34m" + user_email + "\x1b[31m the email they provided is not valid\x1b[0m:");
                        socket.disconnect();
                    }
                })
                .catch(function(error) {
                    console.log("Couldn't connect socket for \x1b[34m" + user_email + "\x1b[31m error quering the golfers database\x1b[0m:");
                    console.log(error);
                    socket.disconnect();
                });
        });
        socket.on('disconnect', function() {
            if (socket.useremail) {
                console.log("\x1b[42m\x1b[37mSuccessfully disconnected socket for\x1b[0m \x1b[34m" + socket.useremail + "\x1b[0m");
                io.emit('chat message', { username: "Chat Bot", message: socket.username + " has left the conversation.", profile_photo_title: 'chat_bot.jpg', timestamp: moment.utc() });
                get_online_users(io.sockets.connected,io);
            } else {
                console.log("\x1b[31m Unusual disconnect for \x1b[0m" + socket.id + "\x1b[31m. No username or email included in socket object \x1b[0m");
            }
        });

        socket.on('chat message', function(message) {
            db.query("INSERT INTO chat (user_email,comment,timestamp) VALUES ($1,$2,$3)", [socket.useremail, message, moment.utc()])
                .then(function(data) {
                    console.log("\x1b[42m\x1b[37mSuccessfully added \x1b[0m \x1b[34m" + message + "\x1b[0m to chat db");
                    io.emit('chat message', { username: socket.username, message: message, profile_photo_title: socket.profile_photo_title, timestamp: moment.utc() });  
                })
                .catch(function(error) {
                    console.log("Couldn't upload message \x1b[34m" + message + "\x1b[31m error quering the chat database\x1b[0m:");
                    console.log(error);
                });
        });
    });
}
