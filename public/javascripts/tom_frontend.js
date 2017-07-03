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


$("#test").click(function(){
	alert("hello");
});


