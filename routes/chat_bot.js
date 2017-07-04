var db = require("../db.js");
var moment = require('moment');

module.exports = function(req, message) {
    db.query("INSERT INTO chat (user_email,comment,timestamp) VALUES ($1,$2,$3)", ['chat_bot', message, moment.utc()])
        .then(function(data) {
            console.log("\x1b[42m\x1b[37mSuccessfully added \x1b[0m \x1b[34m" + new_file_name + "\x1b[0m to photos db");
            req.app.io.emit('chat message', { username: "Chat Bot", message: message, profile_photo_title: 'chat_bot.jpg', timestamp: moment.utc() });
        })
        .catch(function(error) {
            console.log("Couldn't upload chat bot message \x1b[34m" + message + "\x1b[31m error quering the chat database\x1b[0m:");
            console.log(error);
        });
}
