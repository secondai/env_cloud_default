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
const IPFS = require('ipfs')
const wrtc = require('wrtc') // or require('electron-webrtc')()
const WStar = require('libp2p-webrtc-star')


var utilLogger = require("./utils/logging");

const app = express();
app.argv = argv;
console.log('CLI:', app.argv.MONGODB);
console.log('Process:', process.env.MONGODB);
// console.log('LanguageServer:', process.env.LANGUAGE_SERVER);
console.log('PORT_ON: ',process.env.PORT_ON,' (inside docker if exists. available at http://localhost:PORT_ON):');
console.log('PUBLIC_HOST:', process.env.PUBLIC_HOST);
console.log('MONGODB_URI (on heroku):', process.env.MONGODB_URI);
console.log('REDIS_URL (on heroku):', process.env.REDIS_URL);
console.log('STELLAR_NETWORK', process.env.STELLAR_NETWORK);
console.log('OLD_INCOMING', process.env.OLD_INCOMING);
app.mongoDbName = app.argv.MONGODB || process.env.MONGODB;
global.app = app;

app.deepFreeze = function deepFreeze(obj) {

  // Retrieve the property names defined on obj
  var propNames = Object.getOwnPropertyNames(obj);

  // Freeze properties before freezing self
  propNames.forEach(function(name) {
    var prop = obj[name];

    // Freeze prop if it is an object
    if (typeof prop == 'object' && prop !== null)
      deepFreeze(prop);
  });

  // Freeze self (no-op if already frozen)
  return Object.freeze(obj);
}


// Load IPFS repo if exists (.env) 
function ipfsSetup(){
  return new Promise((resolve,reject)=>{

    setTimeout(async()=>{

      console.log('Starting ipfs setup');

      // OrbitDB uses Pubsub which is an experimental feature
      let repoDir = 'repo/ipfs1';

      const wstar = new WStar({ wrtc: wrtc })
      let ipfsOptions = {
        // repo: './ipfs-repo',

        init: true,
        // start: false, // we'll start it after overwriting the config file! 

        repo: repoDir,
        pass: 'passwordpasswordpasswordpassword', // i set this beforehand! 

        EXPERIMENTAL: {
          pubsub: true
        },

        libp2p: {
          modules: {
            transport: [wstar],
            discovery: [wstar.discovery]
          }
        },

        config: {
          "Addresses": {
            "Swarm": [
              "/ip4/0.0.0.0/tcp/4002",
              "/ip4/127.0.0.1/tcp/4003/ws",
              // "/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star",
              "/dns4/wrtc-star.discovery.libp2p.io/tcp/443/wss/p2p-webrtc-star"
            ],
            "API": "/ip4/127.0.0.1/tcp/5002",
            "Gateway": "/ip4/127.0.0.1/tcp/9090"
          },
          "Discovery": {
            "MDNS": {
              "Enabled": true,
              "Interval": 10
            },
            "webRTCStar": {
              "Enabled": true
            }
          },
          // "Bootstrap": [
          //   "/ip4/104.236.176.52/tcp/4001/ipfs/QmSoLnSGccFuZQJzRadHn95W2CrSFmZuTdDWP8HXaHca9z",
          //   "/ip4/104.131.131.82/tcp/4001/ipfs/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ",
          //   "/ip4/104.236.179.241/tcp/4001/ipfs/QmSoLPppuBtQSGwKDZT2M73ULpjvfd3aZ6ha4oFGL1KrGM",
          //   "/ip4/162.243.248.213/tcp/4001/ipfs/QmSoLueR4xBeUbY9WZ9xGUUxunbKWcrNFTDAadQJmocnWm",
          //   "/ip4/128.199.219.111/tcp/4001/ipfs/QmSoLSafTMBsPKadTEgaXctDQVcqN88CNLHXMkTNwMKPnu",
          //   "/ip4/104.236.76.40/tcp/4001/ipfs/QmSoLV4Bbm51jM9C4gDYZQ9Cy3U6aXMJDAbzgu2fzaDs64",
          //   "/ip4/178.62.158.247/tcp/4001/ipfs/QmSoLer265NRgSp2LA3dPaeykiS1J6DifTC88f5uVQKNAd",
          //   "/ip4/178.62.61.185/tcp/4001/ipfs/QmSoLMeWqB7YGVLJN3pNLQpmmEk35v6wYtsMGLzSr5QBU3",
          //   "/ip4/104.236.151.122/tcp/4001/ipfs/QmSoLju6m7xTh3DuokvT3886QRYqxAzb1kShaanJgW36yx",
          //   "/ip6/2604:a880:1:20::1f9:9001/tcp/4001/ipfs/QmSoLnSGccFuZQJzRadHn95W2CrSFmZuTdDWP8HXaHca9z",
          //   "/ip6/2604:a880:1:20::203:d001/tcp/4001/ipfs/QmSoLPppuBtQSGwKDZT2M73ULpjvfd3aZ6ha4oFGL1KrGM",
          //   "/ip6/2604:a880:0:1010::23:d001/tcp/4001/ipfs/QmSoLueR4xBeUbY9WZ9xGUUxunbKWcrNFTDAadQJmocnWm",
          //   "/ip6/2400:6180:0:d0::151:6001/tcp/4001/ipfs/QmSoLSafTMBsPKadTEgaXctDQVcqN88CNLHXMkTNwMKPnu",
          //   "/ip6/2604:a880:800:10::4a:5001/tcp/4001/ipfs/QmSoLV4Bbm51jM9C4gDYZQ9Cy3U6aXMJDAbzgu2fzaDs64",
          //   "/ip6/2a03:b0c0:0:1010::23:1001/tcp/4001/ipfs/QmSoLer265NRgSp2LA3dPaeykiS1J6DifTC88f5uVQKNAd",
          //   "/ip6/2a03:b0c0:1:d0::e7:1/tcp/4001/ipfs/QmSoLMeWqB7YGVLJN3pNLQpmmEk35v6wYtsMGLzSr5QBU3",
          //   "/ip6/2604:a880:1:20::1d9:6001/tcp/4001/ipfs/QmSoLju6m7xTh3DuokvT3886QRYqxAzb1kShaanJgW36yx",
          //   "/dns4/wss0.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmZMxNdpMkewiVZLMRxaNxUeZpDUb34pWjZ1kZvsd16Zic",
          //   "/dns4/wss1.bootstrap.libp2p.io/tcp/443/wss/ipfs/Qmbut9Ywz9YEDrz8ySBSgWyJk41Uvm2QJPhwDJzJyGFsD6",
          //   "/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star/ipfs/QmVNqmWGV248kCZpJq2yXSYzTQi5the7vxs82HLfZj3tcK" // necessary?
          // ]
        }
      }

      // Create IPFS instance
      const ipfs = new IPFS(ipfsOptions)

      app.ipfs = ipfs;

      ipfs.on('error', (err) => {
        console.error('IPFS ERROR:', err.type);
        // process.exit(); // should restart automatically! 
      });

      // ipfs.on('init', async ()=>{
      //   console.log('init');
      // })
      ipfs.on('ready', async () => {
        console.log('ready');
          
        let myId = await ipfs.id();
        console.log('IPFS ID:', myId);

        console.log('Ready to process new nodes (loading previous into ipfs)');
        resolve();

        return;

      })

      // ipfs.init({},(err,result)=>{
      //   console.log('INIT:', err,result);
      // })

    },3000);

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
