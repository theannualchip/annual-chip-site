
//var schedule = require('node-schedule');
/*
 
var sessions_purge = schedule.scheduleJob('0 0 0 * * *', function(){
  console.log("\x1b[33mPurging current_sessions for stale sessions\x1b[0m");
  cutoff_time=moment().subtract(1, 'days');
      db.query("DELETE FROM current_sessions WHERE last_active<$1", [cutoff_time])
        .then(function(data) {
            console.log("\x1b[42m\x1b[37mSuccessfully purged stale sessions from current_sessions\x1b[0m");
        })
        .catch(function(error) {
            console.log("\x1b[31mCouldn't purge current_sessions as there was an error quering the current_sessions database\x1b[0m:");
            console.log(error);
        });

});


*/