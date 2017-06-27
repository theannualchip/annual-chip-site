
module.exports = function(req, message) {
    req.app.io.emit('chat message', { user: 'Chat Bot', message: message });
}
