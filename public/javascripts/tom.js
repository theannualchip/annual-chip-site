var multiline = require('multiline');

exports.get_short_lboard = function(db_connection, day) {

	db = db_connection;

	query_string =  multiline.stripIndent(function(){/*
		
		WITH user_info AS (
			SELECT
				a.username,
				b.photo_title
			FROM
				golfers a
				INNER JOIN photos b ON (
					a.username = b.uploaded_user)
		),

		scores as (
			SELECT
				username,
				sum(score) as score
			FROM
				scores
			WHERE
				day = $1
			GROUP BY
				username
		)	

		SELECT
			a.*,
			COALESCE(b.score, 99) as score
		FROM
			user_info a
			LEFT JOIN scores b ON (
				a.username = b.username)
		ORDER BY
			score;
	*/
	});

	result = db.query(query_string, [day])

	return result;

}

exports.format_lboard = function(lboard) {

	var table = "";

	for (var i=0; i<lboard.length; i++) {

		var name = lboard[i].username;
		var score = lboard[i].score;
		var img = lboard[i].photo_title;

		// table += "<div class='columns'>"
		// table += '<div class="column is-4 align-middle-col "><img class="img-circle" src="/img/' + img + '"></div>'
		// table += '<div class="column is-4 align-middle-col "><span class="is-medium has-text-centered align-middle-el">' + name + '</span></div>'  
		// table += '<div class="column is-4 align-middle-col "><span class="is-medium has-text-centered align-middle-el">' + score + '</span></div></div>'  

		table += "<div class='columns'>"
		table += '<div class="column is-4 center-div"><img class="img-circle" src="/img/' + img + '"></div>'
		table += '<div class="column is-4 center-div"><strong>' + name + '</strong></div>'  
		table += '<div class="column is-4 center-div"><strong>' + score + '</strong></div></div>'  

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