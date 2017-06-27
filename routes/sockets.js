var pgp = require('pg-promise')();
var db = require("../db.js");
var moment = require('moment');

get_online_users = function(sockets) {
    online_users = [];
    for (user in sockets) {
        if (sockets[user].username) {
            if (online_users.indexOf(sockets[user].username) < 0) {
                online_users.push(sockets[user].username);
            }
        }
    }
    return online_users;
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
                        //check who is online emmit online object
                        online_users = get_online_users(io.sockets.connected);
                        io.emit('online update', online_users);
                        io.emit('chat message', { username: "Chat Bot", message: socket.username + " just joined the conversation.", profile_photo_title: 'chat_bot.jpg', timestamp: moment() });
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
                io.emit('chat message', { username: "Chat Bot", message: socket.username + " has left the conversation.", profile_photo_title: 'chat_bot.jpg', timestamp: moment() });
            } else {
                console.log("\x1b[31m Unusual disconnect for \x1b[0m" + socket.id + "\x1b[31m. No username or email included in socket object \x1b[0m");
            }
        });

        socket.on('chat message', function(message) {
            db.query("INSERT INTO chat (user_email,comment,timestamp) VALUES ($1,$2,$3)", [socket.useremail, message, moment()])
                .then(function(data) {
                    console.log("\x1b[42m\x1b[37mSuccessfully added \x1b[0m \x1b[34m" + message + "\x1b[0m to chat db");
                    io.emit('chat message', { username: socket.username, message: message, profile_photo_title: socket.profile_photo_title, timestamp: moment() });
                })
                .catch(function(error) {
                    console.log("Couldn't upload message \x1b[34m" + message + "\x1b[31m error quering the chat database\x1b[0m:");
                    console.log(error);
                });
        });
    });
}
