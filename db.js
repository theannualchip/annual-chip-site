var pgp = require('pg-promise')();
var dotenv = require('dotenv');
var log = require('./routes/abstracted_functions/log.js')

dotenv.load();

const database_object = {
    host: 'chip-db.cclyf5gm9q8m.us-west-2.rds.amazonaws.com',
    port: 5432,
    database: 'the_annual_chip',
    user: process.env.db_user,
    password: process.env.db_password
};

log("Connected to database: $1 at $2", 'inf', [database_object.database, database_object.host]);

module.exports = pgp(database_object);
