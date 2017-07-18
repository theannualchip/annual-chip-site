//  +++++++++++++++++++++++++++++++++++++
//  DATABASE FUNCTIONS
//  +++++++++++++++++++++++++++++++++++++

exports.get_hole_scores = function(db_connection, day, hole) {

	db = db_connection;

	query_string = `
		WITH scores as (
			SELECT
				username,
				score
			FROM
				scores
			WHERE
				day = ${day} AND
				hole = ${hole}
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
	`
	result = db.query(query_string)

	return result;
};

exports.get_hole_info = function(db_connection, day, hole) {

	// DB connection
	db = db_connection;

	hole = hole

	// Hole details
	query_string = `
		SELECT
			*
		FROM
			hole_info
		WHERE
			hole = ${hole}
	`

	result = db.query(query_string, [day])

	return result;

};


exports.get_short_lboard = function(db_connection, day) {

	db = db_connection;

	query_string = `

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
	`

	result = db.query(query_string, [day])

	return result;

};


exports.log_score = function(db_connection, user, hole, day, score) {

	db = db_connection;

	query_string = `
	INSERT INTO scores (username, day, hole, score)
    	VALUES ({user}, {day}, {hole}, {score});
	`
	result = db.query(query_string)

	return result;

};


//  +++++++++++++++++++++++++++++++++++++
//  WEB CONTENT CREATION FUNCTIONS
//  +++++++++++++++++++++++++++++++++++++

exports.format_lboard = function(lboard) {

	var output = "<div class='main-gallery js-flickity' data-flickity-options='{\"freeScroll\": true}'>";

	for (var i=0; i<lboard.length; i++) {

		var name = lboard[i].username;
		var score = lboard[i].score;
		var pic_name = lboard[i].profile_photo_title;
		var rank = i+1;

		flick_cell_element = `
		  <div class="gallery-cell center-div has-text-centered">
		    <div>
		      <div>
		        <img class="lboard_image" src="/img/profile_pictures/${pic_name}">
		        <span class="button__badge">${rank}</span>
		      </div>
		      <div><strong style="font-size:10pt"> ${name} </strong></div>
		      <div><strong style="font-size:8pt"> ${score} </strong></div>
		    </div>  
		  </div>
		`;

		output += flick_cell_element

	}

	output += "</div>"

	return output;

};


exports.format_hole_scores = function(scores) {

	var output = "<div class='main-gallery js-flickity' data-flickity-options='{\"freeScroll\": true}'>";

	for (var i=0; i<scores.length; i++) {

		var name = scores[i].username;
		var score = scores[i].score;
		var pic_name = scores[i].profile_photo_title;
		var tag_ = "is-success"

		if (score == 99) { 
			tag_ = "is-dark"
			score = "-"
		}

		flick_cell_element = `
		  <div class="score gallery-cell center-div has-text-centered">
		    <div>
		      <div>
		        <img class="lboard_image" src="/img/profile_pictures/${pic_name}">
		      </div>
		      <div><span class="tag ${tag_}"> ${name}: ${score} </span> </div>
		    </div>  
		  </div>
		`;

		output += flick_cell_element
	}

	output += "</div>"

	return output;

};


exports.top_scorer = function(scores) {

	var min_score = 98
	var min_player = "..."

	for (var i=0; i<scores.length; i++) {

		var name = scores[i].username;
		var score = scores[i].score;


		if (score < min_score) {

			min_score = score;
			min_player = name;

		};
	}

	return min_player;

};

exports.format_hole_links = function() {

	var outputJSON = [];

	var hole_nums = [9,18,9];

	for (var j=0; j < 3; j++) {

		hole_num = hole_nums[j]

		var output = "<div class='columns is-mobile is-gapless'>"

		for (var i=1; i<=hole_num; i++) {

			day = j + 1

			hole_html = `
			  <div class="column box-hole" style="background: url('/img/holes/texture/${i}.jpg'); background-size:cover;">
			    <a href = "/scorecard/card?day=${day}&hole=${i}">
			      <h1 class='title has-text-centered main_theme-number'> Hole ${i} </h1>
			    </a> 
			  </div>
			`;

			// // Add new column if
			if( i % 3 == 0) {

				if (i == hole_num) {
					hole_html += "</div>"
				} else {
					hole_html += "</div> <div class='columns is-gapless is-mobile'>"
				}

			}

			output += hole_html

		}

		outputJSON[j] = output

	}

	return outputJSON;

};
