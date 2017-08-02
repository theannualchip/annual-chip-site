/******************************************** CONTENTS ********************************************/

//............(1) Photos Page

/******************************************* PHOTOS PAGE ******************************************/



/********************************************* OLD CODE *******************************************/

// full height

function resize_to_full() {
    $('.full_height').each(function() {
        $(this).css('min-height', $(window).height() - 53 + 'px');
    });
    $('.full_height_less').each(function() {
        $(this).css('height', $(window).height() - 2 * 53 + 'px');
    });
}

$(window).resize(function() {
    resize_to_full();
});

resize_to_full();

//photos

function add_changer_to_photo_upload() {
    $("#js-photo_upload_input").change(function() {
        $('#js-photo_upload_delete_warning').html('');
        $("#js-photo_upload_output").html($(this).val().replace(/^.*[\\\/]/, ''));
        $("#js-hidden_to_begin").toggleClass('hidden_to_begin', false);
        resize_to_full();
        $('#js-photo_upload-name').focus();
    });
}

add_changer_to_photo_upload();

$('#js-photo_upload-name').on("keyup", function() {
    if ($('#js-photo_upload-name').val()) {
        $('#js-photo_upload-submit').prop('disabled', false);
    } else {
        $('#js-photo_upload-submit').prop('disabled', true);

    }
});

$("#js-profile_upload_input").change(function() {
    $("#js-profile_upload_output").html($(this).val().replace(/^.*[\\\/]/, '') + "<br><br>");
});

$('#js-photo_upload_close').on('click touch', function() {
    $('#js-photo_upload-input_holder').html("<input type='file' class='level-left hide_input' name='photo_file' id='js-photo_upload_input'>");
    $("#js-photo_upload_output").html("");
    add_changer_to_photo_upload();
    $("#js-hidden_to_begin").toggleClass('hidden_to_begin', true);
});

$('#js-photo_upload-submit').on('click touch', function() {
    $('#js-photo_upload-button-contents').html('<i class="fa fa-cog fa-spin fa-3x fa-fw"></i>');
    document.photo_upload_form.submit()
});

$('.on_hover_pointer').on('click touch', function() {
    photo_title = this.id.substring(23, this.id.length);
    $($(this).children()[0]).html('<i class="fa fa-cog fa-spin font-small fa-fw"></i>')
    $.ajax({
            method: "POST",
            url: "/delete_photo",
            data: { photo_title: photo_title }
        })
        .done(function(return_status) {
            if (return_status != 'success') {
                $('#js-photo_upload_delete_warning').html("<div class='notification bc-danger_pink has-text-centered'>" + return_status + "</div>");
            } else {
                $('#js-photo_upload_imge_container-' + photo_title.replace(/(:|\.|\[|\]|,|=|@)/g, "\\$1")).remove();
            }
        });
});

$('.photo_album-image_wrapper').on('click touch', function() {
    if ($(this).hasClass('full_screen_image')) {
        $(this).toggleClass('photo_album-image_wrapper', true);
        $(this).toggleClass('full_screen_image', false);

        $(this).children().css('margin-top', 'auto');

    } else {
        $(this).toggleClass('full_screen_image', true);
        $(this).toggleClass('photo_album-image_wrapper', false);
        $(this).children().css('margin-top', ($(this).height() - $(this).children().height()) / 2 + "px");
    }
})

// EDIT PROFILE

$("#js-edit_profile-photo_upload").change(function() {
    $("#js-edit_profile-photo_upload-name").html('<br>' + $(this).val().replace(/^.*[\\\/]/, '') + "<br>");
});

// BETS PAGE


function bets_form_tidy() {
    $('#js-update_bets-error').toggleClass('toggle-display_none', true)
    if ($('#js-betting_form-amount').val()) {
        $('#js-betting_form-amount').width(($('#js-betting_form-amount').val().length + 1) * 8 + 10)
    } else {
        $('#js-betting_form-amount').width(20)
    }
    error_output = ''
    // Names
    if ($('#js-betting_form-better_2').val() == $('#js-betting_form-judge').val()) {
        error_output += "The judge can't be involved in the bet, try chosing a different Judge"
    }
    // Amount
    if (isNaN($('#js-betting_form-amount').val()) || $('#js-betting_form-amount').val() < 0 || $('#js-betting_form-amount').val() == '') {
        if (error_output != '') {
            error_output += "<br><br>"
        }
        error_output += "The amount you entered is not valid, try entering a number"
    }
    // Bet
    if ($('#js-betting_form-comment').text() == '') {
        if (error_output != '') {
            error_output += "<br><br>"
        }
        error_output += "The bet you want to place is empty, try entering something in the above sentance"
    }
    if (error_output != '') {
        $('#js-betting_form-success').toggleClass('toggle-display_none', true)
        $('#js-betting_form-error').html(error_output)
        $('#js-betting_form-error').toggleClass('toggle-display_none', false)
        $('#js-betting_form-submit').prop('disabled', true);
        return false
    } else {
        $('#js-betting_form-error').html('')
        $('#js-betting_form-error').toggleClass('toggle-display_none', true)
        $('#js-betting_form-submit').prop('disabled', false);
        return true
    }
}

bets_form_tidy()

$(".form-betting_form-inline_text").each(function() {
    $(this).on('keyup change', function() {
        bets_form_tidy()
    })
})

$('#js-betting_form-comment').on('focus', function() {
    if ($('#js-betting_form-comment').text() == bet_placeholder) {
        $('#js-betting_form-comment').text('')
    }
})

$('#js-betting_form-comment').on('focusout', function() {
    if ($('#js-betting_form-comment').text() == '') {
        $('#js-betting_form-comment').text(bet_placeholder)
    }
})

$('#js-betting_form-submit').on('click', function() {
    if (bets_form_tidy()) {
        $('#js-betting_form-submit').html('<div class="betting_form-submit_loading"><i class="fa fa-cog fa-spin fa-3x fa-fw"></i></div>')
        $('#js-betting_form-submit').prop('disabled', true);
        send_object = {
            better: $('#js-betting_form-better_2').val(),
            amount: $('#js-betting_form-amount').val(),
            bet: $('#js-betting_form-comment').text(),
            judge: $('#js-betting_form-judge').val()
        }
        $.ajax({
                method: "POST",
                url: "/place_bet",
                data: send_object
            })
            .done(function(return_status) {
                collect_bets()
                if (return_status='success') {
                    $('#js-betting_form-success').toggleClass('toggle-display_none', false)
                    $('#js-betting_form-submit').prop('disabled', false);
                } else {
                    $('#js-betting_form-success').toggleClass('toggle-display_none', true)
                    $('#js-betting_form-error').html(return_status)
                    $('#js-betting_form-error').toggleClass('toggle-display_none', false)
                    $('#js-betting_form-submit').prop('disabled', true);
                }
                $('#js-betting_form-submit').html('Submit Bet')
            });
    }
})

function accept_bet(time_stamp,action,name) {
    $('#js-update_bets-error').toggleClass('toggle-display_none', true)
    $.ajax({
                method: "POST",
                url: "/accept_bet",
                data: {time_stamp:time_stamp,action:action,name:name}
            })
            .done(function(return_status) {
                if (return_status!='success') {
                    $('#js-update_bets-error').html=return_status
                    $('#js-update_bets-error').toggleClass('toggle-display_none', false)
                }
                collect_bets()
            });
}

function judge_bet(time_stamp,outcome,bet_info) {
    $('#js-update_bets-error').toggleClass('toggle-display_none', true)
    $.ajax({
                method: "POST",
                url: "/bet_outcome",
                data: {time_stamp:time_stamp,outcome:outcome,bet_info:bet_info}
            })
            .done(function(return_status) {
                if (return_status!='success') {
                    $('#js-update_bets-error').html=return_status
                    $('#js-update_bets-error').toggleClass('toggle-display_none', false)
                }
                collect_bets()
            });
}

function loading_button(element) {
    $(element).html('<div class="betting_form-submit_loading"><i class="fa fa-cog fa-spin fa-3x fa-fw"></i></div>');
    $(element).closest('.bets-action').find('button').each(function(i) {
        $(this).css({'color':'#4a4a4a'})
        $(this).prop('disabled', true)
    })
}


