
var pgp = require('pg-promise')();
var dotenv = require('dotenv');

dotenv.load();

const database_object = {
    host: 'chip-db.cclyf5gm9q8m.us-west-2.rds.amazonaws.com',
    port: 5432,
    database: 'the_annual_chip',
    user: 'the_annual_chip',
    password: 'the_annual_chip'
};

console.log(database_object);
db = pgp(database_object);


var bcrypt = require('bcrypt-nodejs');
const salt_rounds = 10;

/*bcrypt.genSalt(salt_rounds, function(err, salt) {
    bcrypt.hash('password1', salt, function(err, hash) {
        db.query('INSERT INTO golfers (username,email,password) VALUES ($1,$2,$3)', ['Sammy B', 'samuel.brass@gmail.com', hash])
            .then(function(data) {
                console.log("Success!");
            })
            .catch(function(error) {
                console.log(error);
            });
    });
});*/

db.query("SELECT * FROM golfers WHERE username='Sammy B'")
.then(function(data){
	bcrypt.compare('password1', data[0].password, function(err, res) {
		console.log(res);
	});
	pgp.end();
})
.catch(function(error){
	console.log(error);
	pgp.end();
});