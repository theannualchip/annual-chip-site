module.exports = function(io) {
    io.on('connection', function(socket) {
        //console.log("A User Connected");
        socket.on('chat message', function(msg) {
            console.log(msg);
            io.emit('chat message',msg);
        });
    });
}
