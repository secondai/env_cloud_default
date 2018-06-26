require('babel-register');
require('dotenv').config();
if(process.env.OLD_STARTUP == 'true'){
	// OLD
	require('./old/init');
} else {
	// NEW (self-contained)
	require('./init');
}
