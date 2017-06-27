var multiline = require('multiline');

exports.get_short_lboard = function(db_connection, day) {

	db = db_connection;

	query_string =  multiline.stripIndent(function(){/*

		WITH scores as (
			SELECT
				username,
				sum(score) as score
			FROM
				scores
			GROUP BY
				username
		)	

		SELECT
			a.username,
			a.profile_photo_title,
			COALESCE(b.score, 99) as score
		FROM
			golfers a
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

	var output = "<div class='main-gallery js-flickity'>";

	for (var i=0; i<lboard.length; i++) {

		var name = lboard[i].username;
		var score = lboard[i].score;
		var pic_name = lboard[i].profile_photo_title;
		var rank = i+1;

		flick_cell_element = `
		  <div class="gallery-cell center-div has-text-centered">
		    <div>
		      <div>
		        <img class="img-circle" src="/img/profile_pictures/${pic_name}">
		        <span class="button__badge">${rank}</span>
		      </div>
		      <div><strong> ${name} </strong></div>
		      <div><strong> ${score} </strong></div>
		    </div>  
		  </div>
		`;

		output += flick_cell_element

	}

	output += "</div>"

	return output;

};


function my_function() {

    // alert("I did something!");

    $('#hole_1').click(
	    function(){
	        $('.modal').addClass("is-active");
	        // css('border','0 none transparent');
	});
}