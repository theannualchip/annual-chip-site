function my_function() {

    // alert("I did something!");

    $('#hole_1').click(
	    function(){
	        $('.modal').addClass("is-active");
	        // css('border','0 none transparent');
	});
};

function go_to_hole() {

    // alert("I did something!");

    // Find the day number

	var all = $(".is-active").map(function() {
	    return this.innerHTML;
	}).get();

	alert(all);

  	// Find the hole number

  	// Go to the hole page (card.ejs) with these parameters



    $('#hole_1').click(
	    function(){
	        $('.modal').addClass("is-active");
	        // css('border','0 none transparent');
	});
};




// Respond to a hole click
$(function(){

	// Want to respond to a click on the .box-hole class
	$('.box-hole').on('click',function(){

	    // Find the day number
	    var day_string = $(".is-active").find(".day-label").html();
	    var day_num = day_string.match(/[0-9]/)

	  	// Find the hole number
		var hole_num = $(this).children('h1').html();

	  	// Go to the hole page (card.ejs) with these parameters
	  	$.get( "/scorecard", { name: "Tom", Hole: "13" }, function( data ) {
		    $( "#scorecard_output" ).html( data );
		});

	  	alert("Day" + day_num + " hole number " + hole_num);
	 });


});
