var entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
};

function escape_html(string) {
    return String(string).replace(/[&<>"'`=\/]/g, function(s) {
        return entityMap[s];
    });
}

function output_chat_message(username, image_name, message, timestamp) {
    aus_time = moment(timestamp).format('h:mm a');
    html_output = `
    <div class='is-full-width'>
        <div class='is-full-width'>
            <div class='comment_image'>
                <img class='ensure_square' src='/img/profile_pictures/${image_name}'/>
            </div>
            <div class='comment_title'>
                <div class='column'>
                    <div class='comment_title-user'>
                    ${escape_html(username)}
                    </div>
                    <div class='comment_title-time'>
                        ${aus_time}
                    </div>
                </div>
                <div class='comment_message'>
                    ${escape_html(message)}
                </div>
            </div>
        </div>
    </div>`
    return html_output;
}

var socket = io();

socket.on('online update', function(online_users) {
    html_output = `<h1>${variables.user}</h1>`;
    for (row_1 = 0; row_1 < online_users.length; row_1++) {
        if (online_users[row_1] != variables.user)
            html_output += '<li>' + online_users[row_1] + '</li>';
    }
    console.log('taco')
    $('#js-chat_side_bar').html(html_output);
});

function resize_everything() {
    window_height = $(window).height();
    $('#js-chit_chat_loader').css('height', window_height - 53 + 'px')
    $('#js-chit_chat-chat_output').css('height', window_height - 2 * 53 + 'px')
    $('#js-chit_chat-side_bar').css('height', window_height - 53 + 'px')
}

function progress(final, call_back) {
    current_value = $('#js-main_theme-loading_window-progress').val()
    if (current_value < final) {
        $('#js-main_theme-loading_window-progress').val(current_value + 1)
        setTimeout(function() { progress(final, call_back) }, 10)
    } else {
        call_back();
    }
}

function square_up(image_obj, size) {
    if ($(image_obj).height() <= $(image_obj).width()) {
        $(image_obj).css('height', size + 'px')
        $(image_obj).css('width', 'auto')
    } else if ($(image_obj).height() >= $(image_obj).width()) {
        $(image_obj).css('width', size + 'px')
        $(image_obj).css('height', 'auto')
    }
    $(image_obj).css('margin-left', -($(image_obj).width()-size)/2 + 'px' )
    $(image_obj).css('margin-top', -($(image_obj).height()-size)/2 + 'px' )
}

$(window).on('load', function() {
    resize_everything();
    $('#js-chit_chat_loader').toggleClass('toggle-display_none', false)
    $('#js-chit_chat_loader').animate({ 'opacity': 1 }, 100)
    progress(34, function() {
        $.ajax({
                method: "POST",
                url: "/previous_messages",
            })
            .done(function(chat_messages) {
                if (chat_messages != null) {
                    for (row_1 = 0; row_1 < chat_messages.length; row_1++) {
                        $('#js-chat_output').append(output_chat_message(chat_messages[row_1].username, chat_messages[row_1].profile_photo_title, chat_messages[row_1].comment, moment(chat_messages[row_1].timestamp).add(10, 'hours')));
                    }
                }
                $('#js-chat_output div div img').on('load', function() {
                    $('.ensure_square').each(function() {
                        square_up(this, 40);
                    })
                    progress(100, function() {
                        $('#js-chit_chat-chat_input').toggleClass('toggle-display_none', false)
                        $('#js-chit_chat-side_bar').toggleClass('toggle-display_none', false)
                        $('#js-chit_chat-chat_output').toggleClass('toggle-display_none', false)
                        $('#js-chit_chat_loader').animate({ 'opacity': 0 }, 50, function() {
                            $('#js-chit_chat_loader').toggleClass('toggle-display_none', true)
                            $('#js-chit_chat-chat_input').animate({ 'bottom': 0 }, 250, function() {
                                $('#js-chit_chat-side_bar').animate({ 'right': 0 }, 250, function() {
                                    $('#js-chit_chat-chat_output').animate({ 'left': 0 }, 250)
                                    socket.emit('add user', variables.user_email);
                                })
                            })
                        })
                    })
                })
            })
    })
})

$(window).resize(function() {
    resize_everything();
})

/*

function send_message() {
    message = $('#js-chat_input').val();
    if (message != "") {
        socket.emit('chat message', message);
        $('#js-chat_input').val('');
    }
}

socket.on('chat message', function(msg) {
    $('#js-chat_output').append(output_chat_message(msg.username, msg.profile_photo_title, msg.message, msg.timestamp));
    $('#js-chat_output').animate({
        scrollTop: $('#js-chat_output')[0].scrollHeight + 'px'
    }, 500);
});

$('#js-chat_input').on("keydown", function(e) {
    if (e.keyCode == 13) {
        send_message();
    }
}); */
