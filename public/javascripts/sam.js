
/*var socket = io();

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
});*/

// nav

$('#js-menu_hamburger').on('click touch', function() {
	console.log($('#js-drop_down_menu').position().top);
	if ($('#js-drop_down_menu').position().top==-277) {
		$('#js-drop_down_menu').animate({top:53},500);
	} else {
		$('#js-drop_down_menu').animate({top:-277},500);
	}
});

