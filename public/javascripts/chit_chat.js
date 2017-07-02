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
    <div class='is-full-width margin_top_and_bottom'>
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
            <div class='comment_message'>`
            html_output += escape_html(message)
            html_output += `</div>
        </div>
    </div>`
    return html_output;
}

var socket = io();

function update_own_profile(user_object) {
    var html_output = `<div class='column is-full-width side_bar-profile_container'>
                        <div class='side_bar-username'>
                            ${escape_html(user_object.username)} <a href='/edit_profile'>edit profile?</a>
                        </div>
                        <img class='side_bar-profile_picture' src='/img/profile_pictures/${user_object.profile_photo_title}'/>
                    </div>`
    $('#js-chat_side_bar-your_profile').html(html_output);
}

socket.on('online update', function(return_object) {
    html_output = ''
    for (row_1 = 0; row_1 < return_object.online.length; row_1++) {
        if (return_object.online[row_1].email != variables.user_email) {
            html_output += `<div class='column is-full-width side_bar_container background_color-info_blue'>
                <div class='side_bar_image'>
                    <img class='ensure_square-side_bar' src='/img/profile_pictures/${return_object.online[row_1].profile_photo_title}'/>
                </div>
                <div class='side_bar-comment'>
                    ${escape_html(return_object.online[row_1].username)} - Online
                    <br>
                    &nbsp;
                </div>
            </div>`
        } else {
            update_own_profile(return_object.online[row_1])
        }
    }
    for (row_1 = 0; row_1 < return_object.offline.length; row_1++) {
        if (return_object.offline[row_1].email != variables.user_email) {
            html_output += `<div class='column is-full-width side_bar_container background_color-grey'>
                <div class='side_bar_image'>
                    <img class='ensure_square-side_bar black_and_white_img' src='/img/profile_pictures/${return_object.offline[row_1].profile_photo_title}'/>
                </div>
                <div class='side_bar-comment'>
                    ${escape_html(return_object.offline[row_1].username)} - Offline
                    <br>
                    Last Online ${moment(return_object.offline[row_1].last_active).format('D/MM/YY')}
                </div>
            </div>`
        }
    }
    $('#js-chat_side_bar').html(html_output);
    $('#js-chat_side_bar').imagesLoaded(function() {
        $('.ensure_square-side_bar').each(function() {
            square_up(this, 40);
        })
    })
});

function resize_everything() {
    window_height = $(window).height();
    $('#js-chit_chat_loader').css('height', window_height - 53 + 'px')
    $('#js-chit_chat-chat_output').css('height', window_height - 2 * 53 + 'px')
    $('#js-chit_chat-side_bar').css('height', window_height - 53 + 'px')
    $('#js-chit_chat-chat_input-text').css('width', $('#js-chit_chat-input_container').width() - 64 + 'px')
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
    var image_object = new Image();
    image_object.src = $(image_obj).attr("src");
    image_width = image_object.width
    image_height = image_object.height
    if (image_height <= image_width) {
        new_width = image_width * size / image_height
        $(image_obj).css('height', size + 'px')
        $(image_obj).css('width', new_width + 'px')
        $(image_obj).css('margin-left', -(new_width - size) / 2 + 'px')
    } else if (image_height > image_width) {
        $(image_obj).css('width', size + 'px')
        new_height = image_height * size / image_width
        $(image_obj).css('height', new_height + 'px')
        $(image_obj).css('margin-top', -(new_height - size) / 2 + 'px')
    }
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
                $('#js-chit_chat-chat_output').imagesLoaded(function() {
                    $('.ensure_square').each(function() {
                        square_up(this, 40);
                    })
                    progress(100, function() {
                        $('#js-chit_chat-chat_input').toggleClass('toggle-display_none', false)
                        $('#js-chit_chat-side_bar').toggleClass('toggle-display_none', false)
                        $('#js-chit_chat-chat_output').toggleClass('toggle-display_none', false)
                        resize_everything()
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

var placeholder_string = "Something you'd like to say?"

function send_message() {
    message = $('#js-chit_chat-chat_p').text();
    if (message != "" && message != placeholder_string) {
        socket.emit('chat message', message);
        $('#js-chit_chat-chat_p').html(placeholder_string)
        $('#js-chit_chat-chat_p').toggleClass('toggle-text_place_holder', true)
        $('#js-chit_chat-chat_p').blur()
    }
}

$('#js-chit_chat-chat_p').on('focus', function() {
    if ($('#js-chit_chat-chat_p').html() == placeholder_string || $('#js-chit_chat-chat_p').hasClass('toggle-text_place_holder')) {
        $('#js-chit_chat-chat_p').html('')
        $('#js-chit_chat-chat_p').toggleClass('toggle-text_place_holder', false)
    }
})

$('#js-chit_chat-chat_p').on('focusout', function() {
    if ($('#js-chit_chat-chat_p').html() == '') {
        $('#js-chit_chat-chat_p').html(placeholder_string)
        $('#js-chit_chat-chat_p').toggleClass('toggle-text_place_holder', true)
    }
})

socket.on('chat message', function(msg) {
    $('#js-chat_output').append(output_chat_message(msg.username, msg.profile_photo_title, msg.message, msg.timestamp));
    $('#js-chit_chat-chat_output').imagesLoaded(function() {
        $('.ensure_square').each(function() {
            square_up(this, 40);
        })
    })
    $('#js-chit_chat-chat_output').animate({scrollTop:$('#js-chit_chat-chat_output')[0].scrollHeight},250)
});

$('#js-chit_chat-chat_p').on("keydown", function(e) {
    if (e.keyCode == 13) {
        send_message();
        return false
    }
});
