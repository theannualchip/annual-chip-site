/************************************* THIRD PARTY DEPENDANCIES **********************************/

var moment = require('moment')

/**************************************** ABSTRACTED FUNCTIONS ***********************************/

var db = require("../../db.js")
var log = require("./log.js")

/******************************************** MAIN SCRIPT ****************************************/

// chat_bot()
//
// This file is intended to give the routes file a way to post Chat Bot chat messages to the chat room
// outside of the sockets.js file. It takes two inputs; the req object which is the request from the 
// client which triggered this event (any req will actually work as the socket.io is bound to the express 
// server) and the message to post. This message is first input into the 'chats' table and then emitted
// to all current sockets.

module.exports = function(req, message) {
    db.query("INSERT INTO chat (user_email,comment,timestamp) VALUES ($1,$2,$3)", ['chat_bot', message, moment.utc()])
        .then(function(data) {
            log("Successfully added chat bot message $1 to the chat db",'s',[message]);
            req.app.io.emit('chat message', { username: "Chat Bot", message: message, profile_photo_title: 'chat_bot.jpg', timestamp: moment.utc() });
        })
        .catch(function(error) {
            log("Couldn't upload chat bot message $1 error quering the chat database:",'e',[message]);
            console.log(error);
        });
}
