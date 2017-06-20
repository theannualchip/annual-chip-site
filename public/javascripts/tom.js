exports.get_short_lboard = function(db_connection, day) {

	db = db_connection;

	result = db.query('SELECT username, sum(score) as score FROM scores WHERE day = $1 GROUP BY username ORDER BY score', [day])

	return result;

}

exports.format_lboard = function(lboard) {

	var table = "";

	for (var i=0; i<lboard.length; i++) {

		var name = lboard[i].username;
		var score = lboard[i].score;
		var img = "";

		table += "<div>"
		
		switch(lboard[i].username) {
		    case "T Bish":
		        img = "tom.jpg";
		        break;
		    case "Sammy B":
		        img = "sam.jpg";
		        break;
		    };

		table += '<img class="img-circle" src="/img/' + img + '">'
		table +=  '<h6 class="float-left">' + name + '</h6></div>'  

	}

	return table;

};

function my_function() {

    // alert("I did something!");

    $('#hole_1').click(
	    function(){
	        $('.modal').addClass("is-active");
	        // css('border','0 none transparent');
	});
}