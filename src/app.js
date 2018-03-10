import express from 'express';
import path from 'path';
import logger from 'morgan';
import bodyParser from 'body-parser';


console.log('App Init');

// console.log('REDIS:', process.env.REDIS_PORT_6379_TCP_ADDR + ':' + process.env.REDIS_PORT_6379_TCP_PORT);

var argv = require('minimist')(process.argv.slice(2));

var helmet = require('helmet')
var cors = require('cors');
var cookieParser = require('cookie-parser')
var compression = require('compression')
const aws = require('aws-sdk');

var utilLogger = require("./utils/logging");

const app = express();
app.argv = argv;
console.log('CLI:', app.argv.MONGODB);
console.log('Process:', process.env.MONGODB);
console.log('LanguageServer:', process.env.LANGUAGE_SERVER);
console.log('PORT_ON: ',process.env.PORT_ON,' (inside docker if exists. available at http://localhost:PORT_ON):');
console.log('PUBLIC_HOST:', process.env.PUBLIC_HOST);
console.log('MONGODB_URI (on heroku):', process.env.MONGODB_URI);
console.log('REDIS_URL (on heroku):', process.env.REDIS_URL);
app.mongoDbName = app.argv.MONGODB || process.env.MONGODB;
global.app = app;

// aws setup
aws.config.region = 'us-west-1';
app.aws = aws;

// global.console = utilLogger;
// utilLogger.debug("Overriding 'Express' logger");
// app.use(utilLogger.middleware);
app.use(require('morgan')('combined', { "stream": utilLogger.stream }));

// GraphQL Setup (mongoose models) 
app.graphql = require('./graphql').default;
app.use(cors({
	origin: '*',
	credentials: true
}));
app.use(cookieParser())

// app.use(helmet({
// }))

app.use(compression())

// View engine setup
// - no views 
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'pug');

// app.use(logger('dev', {
//   skip: () => app.get('env') === 'test'
// }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, '../public')));

// Session (redis)
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
var redis = require("redis");

var redisClient;
if(process.env.REDIS_URL){
  redisClient = redis.createClient(process.env.REDIS_URL);
} else {
  redisClient = redis.createClient(6379, app.argv.REDIS_HOST || process.env.REDIS_HOST || 'redis');
}
// {
//     // db: 'redisdb1'
// });
redisClient.on("error", function (err) {
    console.error("Error " + err);
});
const redisOptions = {
	client: redisClient,
}
app.use(session({
  store: new RedisStore(redisOptions),
  secret: 'sdjkfhsdjkhf92312',
  resave: false,
  saveUninitialized: true,
  cookie: {
  	domain: false, //'acme.etteserver.test',
  	sameSite: false
  }
}));


// Routes
app.use('/', require('./routes').default);

// Catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// Error handler
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  res
    .status(err.status || 500)
    .render('error', {
      message: err.message
    });
});

export default app;
