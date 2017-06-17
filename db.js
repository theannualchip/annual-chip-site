
var pgp = require('pg-promise')();
var dotenv = require('dotenv');

dotenv.load();

const database_object = {
    host: 'chip-db.cclyf5gm9q8m.us-west-2.rds.amazonaws.com',
    port: 5432,
    database: 'the_annual_chip',
    user: process.env.db_user,
    password: process.env.db_password
};

console.log(database_object);
module.exports = pgp(database_object);


