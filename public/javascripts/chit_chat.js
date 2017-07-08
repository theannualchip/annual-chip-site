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
                <div class='comment_title-time' id='${moment.utc(timestamp).local().format()}'>
                    ${moment.utc(timestamp).local().format('h:mm a')}
                </div>
            </div>
            <div class='comment_message'><div>${escape_html(message)}</div></div>
        </div>
    </div>`
    return html_output;
}

function create_chat_break(previous_timestamp) {
    if (moment(previous_timestamp).isSame(moment(), 'd')) {
        date_output = 'Today'
    } else if (moment(previous_timestamp).add(1, 'd').isSame(moment(), 'd')) {
        date_output = 'Yesterday'
    } else {
        date_output = moment(previous_timestamp).format('D MMMM YY')
    }
    var html_output = `<div class='column is-full-width'>
        <span class='chit_chat-time_stamp_break'>
            ${date_output}
        </span>
    </div>`
    return html_output

}

function message_publisher(message_array, callback) {
    if (message_array != null) {
        if (message_array.length > 0) {
            if ($('#js-chat_output').children().length == 0) {
                last_message = message_array[message_array.length - 1]
                $('#js-chat_output').html(output_chat_message(last_message.username, last_message.profile_photo_title, last_message.comment, last_message.timestamp))
                starting_message = message_array.length - 1
            } else {
                starting_message = message_array.length
            }
            for (message = starting_message; message > 0; message--) {

                previous_user = $($('#js-chat_output').find('.comment_title-user')[0]).html().trim()
                previous_timestamp = $($('#js-chat_output').find('.comment_title-time')[0]).attr('id')
                current_message = message_array[message - 1]
                if (moment(previous_timestamp).isSame(moment(current_message.timestamp), 'd')) {
                    if (previous_user == current_message.username) {
                        $($('#js-chat_output').find('.comment_message')[0]).prepend(`<div>${escape_html(current_message.comment)}</div>`)
                    } else {
                        $('#js-chat_output').prepend(output_chat_message(current_message.username, current_message.profile_photo_title, current_message.comment, current_message.timestamp))
                    }
                } else {
                    if (!$($($('#js-chat_output').children()[0]).children()[0]).hasClass('chit_chat-time_stamp_break')) {
                        console.log($($('#js-chat_output').children()[0]).html())
                        $('#js-chat_output').prepend(create_chat_break(previous_timestamp))
                    }
                    $('#js-chat_output').prepend(output_chat_message(current_message.username, current_message.profile_photo_title, current_message.comment, current_message.timestamp))
                }
            }
            $('#js-chat_output').prepend(create_chat_break(message_array[0].timestamp))
        }
    }
    callback()
}

function message_publisher_to_end(message, callback) {
    if (message != null && message.message.length > 0) {
        if ($('#js-chat_output').children().length == 0) {
            $('#js-chat_output').html(output_chat_message(message.username, message.profile_photo_title, message.message, message.timestamp))
            $('#js-chat_output').prepend(create_chat_break(message.timestamp))
        } else {
            previous_user = $($('#js-chat_output').children()[$('#js-chat_output').children().length - 1]).find('.comment_title-user').html().trim()
            previous_timestamp = $($('#js-chat_output').children()[$('#js-chat_output').children().length - 1]).find('.comment_title-time').attr('id')
            if (moment(previous_timestamp).isSame(moment(message.timestamp), 'd')) {
                if (previous_user == message.username) {
                    $($('#js-chat_output').children()[$('#js-chat_output').children().length - 1]).find('.comment_message').append(`<div>${escape_html(message.message)}</div>`)
                } else {
                    $('#js-chat_output').append(output_chat_message(message.username, message.profile_photo_title, message.message, message.timestamp))
                }
            } else {
                $('#js-chat_output').append(create_chat_break(message.timestamp))
                $('#js-chat_output').append(output_chat_message(message.username, message.profile_photo_title, message.message, message.timestamp))
            }
        }
        callback()
    }
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
            if (moment.utc(return_object.offline[row_1].last_active).local().isSame(moment(), 'd')) {
                last_online = moment.utc(return_object.offline[row_1].last_active).local().format('h:mm a');
            } else {
                last_online = moment.utc(return_object.offline[row_1].last_active).local().format('D/MM/YY');
            }
            html_output += `<div class='column is-full-width side_bar_container background_color-grey'>
                <div class='side_bar_image'>
                    <img class='ensure_square-side_bar black_and_white_img' src='/img/profile_pictures/${return_object.offline[row_1].profile_photo_title}'/>
                </div>
                <div class='side_bar-comment'>
                    ${escape_html(return_object.offline[row_1].username)} - Offline
                    <br>
                    Last Online ${last_online}
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
                data: {}
            })
            .done(function(chat_messages) {
                message_publisher(chat_messages, function() {
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
})

$(window).resize(function() {
    resize_everything();
})

var placeholder_string = "Something you'd like to say?"

function send_message() {
    message = $('#js-chit_chat-chat_p').text();
    if (message != "" && message != placeholder_string) {
        socket.emit('chat message', message);
        $('#js-chit_chat-chat_p').html('')
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
    message_publisher_to_end(msg, function() {
        $('#js-chit_chat-chat_output').imagesLoaded(function() {
            $('.ensure_square').each(function() {
                square_up(this, 40);
            })
        })
        $('#js-chit_chat-chat_output').animate({ scrollTop: $('#js-chit_chat-chat_output')[0].scrollHeight }, 250)
    })
});

$('#js-chit_chat-chat_p').on("keydown", function(e) {
    if (e.keyCode == 13) {
        send_message();
        return false
    }
});

$('#js-chat_output-request_messages-button').on('click touch', function() {
    if ($('#js-chat_output-request_messages-button span').html().trim() == 'Want older conversations?') {
        $('#js-chat_output-request_messages-button').html('<div class="chat_output-request_messages-loading"><i class="fa fa-cog fa-spin fa-3x fa-fw"></i></div>')
        if ($('#js-chat_output').find('.comment_title-time')[0]) {
            data = { previous_timestamp: $($('#js-chat_output').find('.comment_title-time')[0]).attr('id') }
        } else {
            data = {}
        }
        $.ajax({
                method: "POST",
                url: "/previous_messages",
                data: data
            })
            .done(function(chat_messages) {
                if (chat_messages.length > 0) {
                    message_publisher(chat_messages, function() {
                        $('#js-chit_chat-chat_output').imagesLoaded(function() {
                            $('.ensure_square').each(function() {
                                square_up(this, 40);
                            })
                            $('#js-chat_output-request_messages-button').html('<span>Want older conversations?</span>')
                        })
                    })
                } else {
                    $('#js-chat_output-request_messages-container').html(`<div class='chat_output-request_messages-button-spent background-color-danger_pink'>
                        <span>
                            Looks like thats it!
                        </span>
                    </div>`)
                }
            })
    }
})
