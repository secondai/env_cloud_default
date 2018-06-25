import express from 'express';
import path from 'path';
import logger from 'morgan';
import bodyParser from 'body-parser';


console.log('App Init');

const si = require('systeminformation');
  var usage = require('usage');

// restart/kill if memory exceeded significantly 
setInterval(async function(){
  let total = parseInt(process.env.WEB_MEMORY || '1024',10);
  total = total * (1024 * 1024); // mb to bytes
  // let mem = await si.mem();
  // console.log('Mem:', Math.round((mem.used/total)*100), 'MemFree:', mem.free, 'Used:', mem.used, 'Total:', total);
  // // .then(data => console.log(data))
  // // .catch(error => console.error(error));

  // linux-only (expecting heroku) 
  var pid = process.pid // you can use any valid PID instead
  usage.lookup(pid, function(err, result) {
    if(err){
      return console.error('usage lookup err:', err);
    }
    let mem = result.memory;

    console.log('Mem:', Math.round((mem/total)*100), 'Used:', mem, 'Total:', total);

  });

},5 * 1000);

// console.log('REDIS:', process.env.REDIS_PORT_6379_TCP_ADDR + ':' + process.env.REDIS_PORT_6379_TCP_PORT);

var argv = require('minimist')(process.argv.slice(2));

var helmet = require('helmet')
var cors = require('cors');
var cookieParser = require('cookie-parser')
var compression = require('compression')

const aws = require('aws-sdk');
// const IPFS = require('ipfs')
// const wrtc = require('wrtc') // or require('electron-webrtc')()
// const WStar = require('libp2p-webrtc-star')
var ipfsAPI = require('ipfs-api')
var ipfs;
try {
  ipfs = ipfsAPI(process.env.IPFS_HOST, process.env.IPFS_PORT, {protocol: process.env.IPFS_PROTOCOL}) // leaving out the arguments will default to these values
}catch(err){
  console.error('Failed ipfs-api:', err);
}


var utilLogger = require("./utils/logging");

const app = express();

app.argv = argv;
console.log('CLI:', app.argv.MONGODB);
console.log('Process:', process.env.MONGODB);
// console.log('LanguageServer:', process.env.LANGUAGE_SERVER);
// console.log('PORT_ON: ',process.env.PORT_ON,' (inside docker if exists. available at http://localhost:PORT_ON):');
console.log('PUBLIC_HOST:', process.env.PUBLIC_HOST);
console.log('MONGODB_URI (on heroku):', process.env.MONGODB_URI);
console.log('REDIS_URL (on heroku):', process.env.REDIS_URL);
console.log('STELLAR_NETWORK', process.env.STELLAR_NETWORK);
console.log('OLD_INCOMING', process.env.OLD_INCOMING);
app.mongoDbName = app.argv.MONGODB || process.env.MONGODB;
global.app = app;

var WebTorrent = require('webtorrent');
var WebTorrentClient = new WebTorrent();
WebTorrentClient.on('torrent', torrent=>{
  console.log('==WebTorrentClient==.on(torrent)');
})
WebTorrentClient.on('error', err=>{
  console.error('==WebTorrentClient==.on(error)', err);
})
app.WebTorrentClient = WebTorrentClient;

app.deepFreeze = function deepFreeze(o) {

  if(!o){
    return o;
  }

  Object.freeze(o);

  Object.getOwnPropertyNames(o).forEach(function (prop) {
    if (o.hasOwnProperty(prop)
    && o[prop] !== null
    && (typeof o[prop] === "object" || typeof o[prop] === "function")
    && !Object.isFrozen(o[prop])) {
      deepFreeze(o[prop]);
    }
  });
  
  return o;


  // // Retrieve the property names defined on obj
  // var propNames = Object.getOwnPropertyNames(obj);

  // // Freeze properties before freezing self
  // propNames.forEach(function(name) {
  //   var prop = obj[name];

  //   // Freeze prop if it is an object
  //   if (typeof prop == 'object' && prop !== null)
  //     deepFreeze(prop);
  // });

  // // Freeze self (no-op if already frozen)
  // return Object.freeze(obj);
}


// Load IPFS repo if exists (.env) 
function ipfsSetup(){
  return new Promise((resolve,reject)=>{

    setTimeout(async()=>{

      console.log('Starting ipfs setup');

      ipfs.id()
      .then(res => {
        console.log(`IPFS daemon active\nid: ${res.ID}`)
        app.ipfsIsReady = true;
        resolve(); // ready
      })
      .catch(err => {
        console.error('IPFS daemon inactive')
      })

      app.ipfs = ipfs;

      // OrbitDB uses Pubsub which is an experimental feature
      // let repoDir = 'repo/ipfs1';

      // const wstar = new WStar({ wrtc: wrtc })
      // let ipfsOptions = {
      //   config: {
      //     Addresses: {
      //       Swarm: [
      //         '/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star'
      //       ]
      //     }
      //   }
      // }

      // // Create IPFS instance
      // // ipfsOptions.start = true;
      // const ipfs = new IPFS(ipfsOptions)

      // app.ipfs = ipfs;

      // ipfs.on('error', (err) => {
      //   console.error('IPFS ERROR:', err.type, Object.keys(err));
      //   // process.exit(); // should restart automatically! 
      // });

      // // ipfs.on('init', async ()=>{
      // //   console.log('init');
      // // })
      // ipfs.on('ready', async () => {
      //   console.log('==IPFS Setup Ready==');
          
      //   app.ipfsIsReady = true;
        
      //   let myId = await ipfs.id();
      //   console.log('IPFS ID:', myId);

      //   console.log('Ready to process new nodes (loading previous into ipfs)');
      //   resolve();

      //   return;

      // })

      // // ipfs.init({},(err,result)=>{
      // //   console.log('INIT:', err,result);
      // // })

    },1000);

    console.info('===setup ipfs in 3 seconds===');

  });
}

app.ipfsReady = ipfsSetup();

// // IPFS middleware 
// app.use(async (req,res,next)=>{
//   await ipfsReady;
//   next();
// });




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

app.disable('x-powered-by');

// app.use(logger('dev', {
//   skip: () => app.get('env') === 'test'
// }));
app.use(bodyParser({limit: '10mb'}));
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
