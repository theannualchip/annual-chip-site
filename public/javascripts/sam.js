
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
