var socket = io();

function send_message() {
    message = $('#js-socket_tester').val();
    if (message!="") {
    	socket.emit('chat message', message);
    	$('#js-socket_tester').val('');
    }
}
socket.on('chat message', function(msg) {
    $('#js-text_output').append(msg + "<br>");
})

$('#js-socket_tester').on("keydown", function (e) {
    if (e.keyCode == 13) { 
        send_message();
    }
});