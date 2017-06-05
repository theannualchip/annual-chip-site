exports.get_short_leaderboard = function(db_connection, day) {

	db = db_connection;

	data = db.query('SELECT username, sum(score) as score FROM scores WHERE day = $1 GROUP BY username ORDER BY score', [day]);

	return data;

}