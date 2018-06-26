require('babel-register');
if(process.env.OLD_STARTUP == 'true'){
	require('./init');
} else {
	require('./launch');
}
