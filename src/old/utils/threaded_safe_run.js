import { spawn } from 'child_process';

import bigi from 'bigi'
import bitcoin from 'bitcoinjs-lib'


// const stdlib = require('@stdlib/stdlib');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

const {VM} = require('vm2');

const ThreadedSafeRun = (evalString, context = {}, requires = [], threadEventHandlers, requestId, mainIpcId, nodeId, timeout) => {
  return new Promise(async (resolve, reject)=>{

    // console.log('starting ThreadedSafeRun (cannot console.log inside there/here (when run in a sandbox!)!)');
    let ob = {evalString, context, requires, threadEventHandlers, requestId, mainIpcId, nodeId, timeout}; 

    let combinedOutputData = '';
    // let nodeThread = new NodeThread((ob) => {

      // console.log('{"test":"test"}');

      // let ThreadedSafeRun;
      // try {
      //   require("babel-register");
      //   ThreadedSafeRun = require('./src/utils/threaded_safe_run').default;
      // }catch(err){
      //   return console.log(`"Error:${err.toString()}"`);
      // }
      // // return;

      // const events = require('events');
      // let eventEmitter = new events.EventEmitter();
      let eventEmitter = app.eventEmitter;

      // let runSafe = require('./src/utils/run_safe');

      // const { VM } = require('vm2');

      // const IPFS = require('ipfs')

      // let ipfs = new IPFS({
      //   repo: 'repos/ipfs/' + (Math.random()).toString() + (new Date()).getTime().toString(),
      //   "Addresses": {
      //     "Swarm": [],
      //     "API": false,
      //     "Gateway": false
      //   },
      //   "Discovery": {
      //     "MDNS": {
      //       "Enabled": false,
      //       "Interval": 10
      //     },
      //     "webRTCStar": {
      //       "Enabled": false
      //     }
      //   },
      //   "Bootstrap": []
      // });


      const request = require('request-promise-native');

      process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

      const stringSimilarity = require('string-similarity');

      // add loadSchema() function for handling requests for schemas 
      // - also "validate schema" using type and data 

      const NodeRSA = require('node-rsa');
      const crypto = require('crypto');
      var CryptoJS = require("crypto-js");

      var StellarSdk = require('stellar-sdk');
      var stellarServer;
      // console.log('STELLAR_NETWORK:', process.env.STELLAR_NETWORK);
      switch(process.env.STELLAR_NETWORK){
        case 'public':
          StellarSdk.Network.usePublicNetwork();
          stellarServer = new StellarSdk.Server('https://horizon.stellar.org');
          break;
        case 'test':
        default:
          StellarSdk.Network.useTestNetwork();
          stellarServer = new StellarSdk.Server('https://horizon-testnet.stellar.org');

          // console.error('Missing process.env.STELLAR_NETWORK');
          // throw "Missing process.env.STELLAR_NETWORK"
          break;
      }

      const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '2k3jfh2jkh32cn983ucr892nuv982v93'; // Must be 256 bytes (32 characters)
      const IV_LENGTH = 16; // For AES, this is always 16

       
      let cJSON = require('circular-json');

      const uuidv4 = require('uuid/v4');


      const JSZip = require('jszip');


      const socketioClient = require('socket.io-client');

      app.socketioServers = app.socketioServers || {};

      // const ipc = require('node-ipc');
      // let ipcId = 'second-worker-' + uuidv4();
      // ipc.config.id = ipcId;
      // ipc.config.retry = 1500;
      // // ipc.config.sync= true; // do NOT have sync on! otherwise everything queues up, which sucks! 
      // // ipc.config.maxConnections = 1; // doesnt work when set here!
      // ipc.config.logger = ()=>{}

      // ipc.connectTo(ob.mainIpcId, () => { // ipc.config.socketRoot + ipc.config.appspace + ipcId
      //   ipc.of[ob.mainIpcId].on(
      //       'response',
      //       function(data){
      //         // ipc.log('got a message from world : ', data);
      //         // console.log('"REPONSE FROM WORLD"');
      //         eventEmitter.emit('response',data);
      //       }
      //   );
      // })

      const fetchNodes = (filterOpts) => {

        filterOpts = filterOpts || {};
        filterOpts.responseType = filterOpts.responseType || 'cjson'; // cjson 
        filterOpts.sqlFilter = filterOpts.sqlFilter || {};
        filterOpts.dataFilter = filterOpts.dataFilter || {};

        return new Promise(async (resolve, reject) => {
          // resolve('REULT FROM fetchNodes!');
          // // emit "fetch" command to main brain 
          //  - no callback, so listen in a different way 
          // - everything in universe should be done through ipc??
          // ipc.connectTo('second-main', () => {
            let nextIpcId = uuidv4()
            // ipc.of['second-main'].on('connect', () => {


              let fetchnodesStart = (new Date()).getTime();

              eventEmitter.on('response', function _listener(r){
                if(r.id != nextIpcId){
                  // skipping if not this event emitted for
                  return;
                }

                eventEmitter.removeListener('response', _listener);

                let fetchnodesEnd = (new Date()).getTime();
                let fetchnodesTime = (fetchnodesEnd - fetchnodesStart);
                // console.log('fetchnodesTime:', fetchnodesTime);


                // resolve('RESULT FROM fetchNodes, after ipc command and response2!');
                try {
                  resolve(r.data);
                }catch(err){
                  console.error('Err: failed fetchNodes response');
                  console.error(err);
                  resolve([]);
                }

              })

              // ipc.of[ob.mainIpcId].emit('command', {
              eventEmitter.emit('command', {
                // cmdId: 
                id: nextIpcId,
                command: 'fetchNodes',
                filter: filterOpts
              });

              // ,(result)=>{
              //   resolve('REULT FROM fetchNodes!');
              // });
            // });
          // });

        })

      }

      const fetchNodesInMemory = (filter) => {

        return new Promise(async (resolve, reject) => {

          setupIpcWatcher({
              command: 'fetchNodesInMemory', // whole thing for now
              requestId: ob.requestId,
              filter              
          }, (r)=>{
            resolve(r.data);
          })


        })

      }


      const fetchNodesInMemoryByIds = (_ids) => {

        return new Promise(async (resolve, reject) => {

          setupIpcWatcher({
              command: 'fetchNodesInMemoryByIds', // whole thing for now
              requestId: ob.requestId,
              _ids              
          }, (r)=>{
            resolve(r.data);
          })


        })

      }
      


      // passed-in libs as required and available
      let required = {};
      for(let r of ob.requires){
        if(Array.isArray(r)){
          // ['utils','../utils']
          required[r[0]] = require(r[1]);
        } else {
          required[r] = require(r);
        }
      }

      // helper function for interprocess communication (funcInSandbox) 
      // - reaching back to main/starter memory
      const setupIpcWatcher = (commandOpts, resolveFunc) => {

        let nextIpcId = uuidv4()

        eventEmitter.on('response', function _listener(r){
          // return resolve('FUCK5');
          if(r.id != nextIpcId){
            // skipping if not this event emitted for
            return;
          }

          eventEmitter.removeListener('response', _listener);

          resolveFunc(r);
        })

        if(commandOpts.id){
          throw "Unable to use id in command!"
        }
        commandOpts.id = nextIpcId;
        // ipc.of[ob.mainIpcId].emit('command', commandOpts);
        eventEmitter.emit('command', commandOpts);

      }

      const lodash = require('lodash');
      const rsa = require('node-rsa');
      var jsSchema = require('js-schema');

      const {google} = require('googleapis');

      let RouteParser = require('route-parser');

      require("underscore-query")(lodash);

      const getPrivateIdentity = () => {
        return new Promise(async (resolve, reject)=>{

          let nodes;
          try{
            nodes = await fetchNodes({
              // responseType: 'json',
              sqlFilter: {
                nodeId: null,
                type: 'identity_private:0.0.1:local:3298f2j398233'
              }
            });
            if(!nodes.length){
              throw "No private identity";
            }
          }catch(err){
            return reject({
              err: 'shit, no identity'
            });
          }

          let IdentityNode = nodes[0];
          resolve(IdentityNode);

        });

      }


      const getIpfsHashForString = (str) => {
        return new Promise(async (resolve, reject)=>{

          // Runs in ThreadedVM 
          // - putting this here means it PROBABLY won't have all the context we'd hope for

          // should validate code/schema too? 

          setupIpcWatcher({
              command: 'getIpfsHashForString', // whole thing for now
              requestId: ob.requestId,
              dataString: str
          }, (r)=>{
            resolve(r.data);
          })

        });
      }

      const npminstall = (packageName) => {
        return new Promise(async (resolve, reject)=>{

          // Runs in ThreadedVM 
          // - putting this here means it PROBABLY won't have all the context we'd hope for

          // should validate code/schema too? 

          setupIpcWatcher({
              command: 'npminstall', // whole thing for now
              requestId: ob.requestId,
              package: packageName
          }, (r)=>{
            resolve(r.data);
          })

        });
      }

      const publishNodeToChain = async (opts) => {

        let {
          node,
          chain // identity for chain, to lookup where to publish to 
        } = opts;


        let TMP_PRIVATE_KEY_FOR_WRITING = 'LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQpNSUlDWEFJQkFBS0JnUUNjdVhvdlUrUlp5ODVLTXFMYWtZU0gxbWRWV2RwRVV0Z2NYVXlHeVU1aFZlVE83QmtWCi9reGVDMnVwY3hPd05uckJPZHN2SEkzbnJySUxndDkwL2hDU0hLenhoT0ZMUkVvckdvS3RTRUh4STcvU256emwKV3RWM2dUL0lQNUdWSEl5dnVKQngzaEN0aTBkSDU1RFpHOGlNR1oyeWNHcFY3M0RlejNoSG1lQmg2d0lEQVFBQgpBb0dBY0pDcldKalp0MEV4dm9zVit3UnZleDBjaE9vUFllbGF2U3lwelZtRENWZ25DaFA3aEpkc2hGT1JsVmhJCitOUjRZSlpNZms3MUFVV3hMYUZuRytGclJsRTJUOTZiZTR1MDZlMDJWRURuQTlFUjh1aGpENTQ5bnVkOVZjVG8KMDVZVm8vZnUvZGFKTXVsbDR5WjBSSmVuelR3UVBrSlVNN2xQaHhodXZEMTg1S2tDUVFEenQ1MUxwRTV0ZjBCTQpyZVpmR1dFNEVlUzNjL016TkJyUWwxZFc2a3IwQkU0K25HeTNCMUlaVU5tSXpkMldqK1ZHTWgwZXd3WHlJTUpzCnl0TjF6UVJWQWtFQXBKK0Fpd25HNjNlNW5IeEVUVHpybldYSDgvMUQ0UDkrRU96YUNSU2YzRE5yTlZXdW8wN2wKNXk2RU1CelJJZVpLUzF4QmJQRWhWRHNzNzNDc2VtUU5Qd0pCQU1QTkJJWTgzdldCZ25zWVN6aWovME00dlBQVwpKOUUvVHp1K0d1RXRJa0toSXV1U2FKVXpRSFl1U2xacWJsZ0VDME0yQjhjckQ1L1RTZUIxb3lYRkxIRUNRRWdvCk9ibTM0VjhZclZ6d0F5Z3Z5YjdGL0N6d0dDNnBEbUx3em1rb2h5R0gwRGdpaEZmRW4zVURxS0ZHSUV6Um1rTUoKL3d0M2JmcHpyYkNPSEt2UTZ4VUNRREN2NnZDMk5EZjR2TU5wcUhmc2RVZ0NWKzhVaGl0MTljM0oydVhmLzdQMwpEYkFJd1VqUmI0NW1XOTArZXJFaEExTG9HbXEyaHI2QTc4L05xZHBpdUtJPQotLS0tLUVORCBSU0EgUFJJVkFURSBLRVktLS0tLQ==';


        let TMP_REMOTE_CHAIN_PUBLIC_KEY = 'LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUlHZk1BMEdDU3FHU0liM0RRRUJBUVVBQTRHTkFEQ0JpUUtCZ1FDQk5uRkMya1Z5bllDZGg0NDFOeEZxQjJUVgpLVFlaUFBaZ01mU2RxcmRDT0FGcTNnMFcyVG12U3pTMnFZNDNEVjgwdHB6ekVOaTRibk9rT1VGVmw5WGk1NTNDCisraGRucWcrcEFHYlQ5UDNDcjdyNkNOMVpOQlB4OEpYbnlXTmZ4ek5oaStyQ21hMUVwWmFvUkhiVnhUWDE3MFYKVzJxeW95Wkk4cUc5cnNxQjdRSURBUUFCCi0tLS0tRU5EIFBVQkxJQyBLRVktLS0tLQ==';

        // temporary, for writing initial languages
        let keyString = (new Buffer( TMP_PRIVATE_KEY_FOR_WRITING,'base64')).toString('utf8');
        let key = new NodeRSA(keyString);
        let pubKey = key.exportKey('public');
        let chainPubKey = (new Buffer( TMP_REMOTE_CHAIN_PUBLIC_KEY,'base64')).toString('utf8');

        let nodeInputStr = JSON.stringify(node);

        console.log('getting ipfs hash');

        let ipfsHashData = await getIpfsHashForString(nodeInputStr);
        let ipfsHash = ipfsHashData.hash;

        console.log('ipfsHash to sign:', ipfsHash);

        let ref = uuidv4();
        let version = '1';
        let nonce = uuidv4();

        // ipfsHash + sha256(pubKey) + version + nonce
        let strToSign = [
          ipfsHash, 
          // SHA256(this.state.pubKey).toString(),
          pubKey,
          // btoa(this.state.pubKey),
          chainPubKey, 
          ref,
          version,
          nonce
        ];

        strToSign = strToSign.join('');
        let signature = key.sign(strToSign,'hex');

        // console.log('signature:', signature);

        let nodeToAdd = {
          nodeInputStr, // converted to ipfsHash 
          pubKey,
          ref,
          version,
          nonce,
          signature
        }

        
        // console.log('Adding node to chain');
        let nodeAdded = await request({
          // url: 'http://localhost:7011/nodes/add',
          url: 'https://api.getasecond.com/nodes/add',
          method: 'POST',
          body: nodeToAdd,
          json: true
        });

        console.log('Node added');

        return {
          type: 'ipfshash:0.0.1:local:3029fj',
          data: {
            hash: ipfsHash
          }
        };

      }
      


      app.globalCache = app.globalCache || {};
      app.globalCache.SearchFilters = app.globalCache.SearchFilters || {};


      // Get codenode and parents/children  
      // - from nodeId passed in
      // - cache, until code changes are made 
      //   - or simply cache for a limited time period? (testing: 2 minutes) 

      let codeNode;

      if(app.globalCache.SearchFilters['exact_codeNode:'+nodeId]){
        console.log('Using cached codeNode for vm');
        codeNode = app.globalCache.SearchFilters['exact_codeNode:'+nodeId];
      } else {
        // console.log('Not using cached codeNode for vm');
        codeNode = await fetchNodes({
          responseType: 'cjson',
          sqlFilter: {
            _id: nodeId
          }
        });
        // console.log('CodeNode Matches (should contain parent!)', JSON.stringify(codeNode, null, 2));
        codeNode = codeNode[0];
        // app.globalCache.SearchFilters['exact_codeNode:'+nodeId] = codeNode;
        // setTimeout(()=>{
        //   console.log('de-caching internal codeNode');
        //   app.globalCache.SearchFilters['exact_codeNode:'+nodeId] = null;
        // },2 * 60 * 1000);
      }

      // app_base and platform_nodes for CodeNode 
      // - useful to have as "global" values for the request, so we don't have to pass to each loadCapabilities function 
      function getParentNodes1(node){
        let nodes = [node];
        if(node.parent){
          nodes = nodes.concat(getParentNodes1(node.parent));
        }
        return nodes;
      }
      let parentNodes = getParentNodes1(codeNode);
      let platformClosest = lodash.find(parentNodes, node=>{
        return (
          node.type.split(':')[0] == 'platform_nodes'
        )
      });
      let appBaseClosest = lodash.find(parentNodes, node=>{
        return (
          node.type.split(':')[0] == 'app_base'
          ||
          node.type.split(':')[0] == 'app_parts'
        )
      });

      // console.log('platformClosest?', (platformClosest && platformClosest._id) ? true:false, nodeId);
      // console.log('appBaseClosest?', (appBaseClosest && appBaseClosest._id) ? true:false, nodeId);
      if(!platformClosest){
        console.error('Missing platformClosest for CodeNode:', JSON.stringify(codeNode, null, 2));
      }

      let funcInSandbox = Object.assign({
        universe: {
          runRequest: app.secondAI.MySecond.runRequest,
          npm: {
            install: npminstall
          },
          appBaseClosest,
          platformClosest,
          process: process,
          env: process.env, // just allow all environment variables to be accessed 
          console,
          lodash,
          required, // "requires" libs
          require,
          jsSchema,
          rsa,
          bitcoin,
          bigi,
          uuidv4,
          cJSON,
          JSZip,
          stringSimilarity,
          RouteParser,
          aws: app.aws,
          setTimeout,
          setInterval,
          clearTimeout,
          clearInterval,
          eventEmitter,
          globalCache: app.globalCache,

          // client
          // - attaching to remote server 
          socketioClient, 
          socketioServers: app.socketioServers, // where I'm the client, connected to a remote socketio server 

          // websocket server 
          // - clients attached to server (IoT devices) 
          socketIOServer: app.socketIOServer,
          wsClients: app.wsClients, 
          socketioClients: app.socketioClients,

          google,
          webrequest: request, // use similar to request-promise: https://www.npmjs.com/package/request-promise

          sleep: (ms)=>{
            return new Promise((resolve,reject)=>{
              setTimeout(resolve,ms)
            })
          },
          checkPackage: (pkgName)=>{
            app.globalCache.packages = app.globalCache.packages || {};
            return app.globalCache.packages[pkgName] || {};
          },
          installPackage: (pkgName)=>{
            // manages package installation 
            // - simultaneous, etc. 
            return new Promise((resolve,reject)=>{
              // create global package tracker
              console.log('installPackage1');
              app.globalCache.packages = app.globalCache.packages || {};
              if(!app.globalCache.packages[pkgName]){
                let onInstallResolve;
                let onInstall = new Promise((resolve2)=>{
                  onInstallResolve = resolve2;
                });
                app.globalCache.packages[pkgName] = {
                  installing: false,
                  installed: false,
                  errorInstalling: null,
                  onInstallResolve,
                  onInstall
                }
              }
              let pkg = app.globalCache.packages[pkgName];
              console.log('pkg:', pkg);
              if(pkg.installing){
                console.log('waiting for install, in progress');
                return pkg.onInstall.then(resolve);
              }
              if(pkg.installed){
                // all good, return resolved
                console.log('installed already, ok!');
                return resolve(true);
              }
              
              if(pkg.errorInstalling){
                console.log('Unable to load, previous error installing (try uninstalling, then reinstalling)');
                return resolve(false);
              }
              
              // install
              pkg.installing = true;
              const { exec } = require('child_process');
              exec('npm install ' + pkgName, (err, stdout, stderr) => {
                if (err) {
                  console.error(`exec error installing package!: ${err}`);
                  pkg.installing = false;
                  pkg.errorInstalling = true;
                  return;
                }
                console.log(`Exec Result: ${stdout}`);
                
                // resolve all waiting scripts (including in this block) 
                pkg.onInstallResolve(true);
                pkg.installed = true;
                pkg.installing = false;
                
              });
              
              pkg.onInstall.then(resolve);
              
            });

          },

          isParentOf: (parentId, node1)=>{
            // console.log('isParentOf', parentId);
            function getParentNodeIds(node){
              let nodes = [node._id];
              if(node.parent){
                nodes = nodes.concat(getParentNodeIds(node.parent));
              }
              return nodes;
            }
            
            let parentNodeIds1 = getParentNodeIds(node1);
            if(parentNodeIds1.indexOf(parentId) !== -1){
              return true;
            }
            return false;

          },

          getParentRoot: (node)=>{
            // get the root of a node (follow parents) 
            // - parent probably doesnt have the full chain filled out (TODO: node.nodes().xyz) 
            function getParentNodes(node){
              let nodes = [node];
              if(node.parent){
                nodes = nodes.concat(getParentNodes(node.parent));
              }
              return nodes;
            }
            
            let parentNodes1 = getParentNodes(node);
            return parentNodes1[parentNodes1.length - 1];

          },

          sameAppPlatform: (node1, node2)=>{
            // console.log('sameAppPlatform');
            // return true;

            function getParentNodes2(node){
              let nodes = [node];
              if(node.nodeId && !node.parent){
                // console.error('parent chain broken in sameAppPlatform', node.type, node._id);
                throw 'parent chain broken in sameAppPlatform'
              }
              if(node.parent){
                nodes = nodes.concat(getParentNodes2(node.parent));
              }
              return nodes;
            }

            // if parent chain doesnt exist (or is broken) then just rebuild on-the-fly? 
            // - using reference version of nodesDb (w/ parents, children) 
            
            let parentNodes1;
            let parentNodes2;

            try {
              parentNodes1 = getParentNodes2(node1);
            }catch(err){
              let tmpnode1 = lodash.find(app.nodesDbParsed,{_id: node1._id});
              try {
                parentNodes1 = getParentNodes2(tmpnode1);
              }catch(err2){
                console.error(err2);
              }
            }
            try {
              parentNodes2 = getParentNodes2(node2);
            }catch(err){
              let tmpnode2 = lodash.find(app.nodesDbParsed,{_id: node2._id});
              try {
                parentNodes2 = getParentNodes2(tmpnode2);
              }catch(err2){
                console.error(err2);
              }
            }

            // console.log('NodeParents2:', node2._id, parentNodes2.length);

            // see if first match of each is correct (aka "outwards" (not from root, but from nodes)) 
            let platformClosest1 = lodash.find(parentNodes1, node=>{
              return (
                node.type.split(':')[0] == 'platform_nodes'
              )
            });
            let appBaseClosest1 = lodash.find(parentNodes1, node=>{
              return (
                node.type.split(':')[0] == 'app_base'
                ||
                node.type.split(':')[0] == 'app_parts'
              )
            });

            let platformClosest2 = lodash.find(parentNodes2, node=>{
              return (
                node.type.split(':')[0] == 'platform_nodes'
              )
            });
            let appBaseClosest2 = lodash.find(parentNodes2, node=>{
              return (
                node.type.split(':')[0] == 'app_base'
                ||
                node.type.split(':')[0] == 'app_parts'
              )
            });

            // if(appBaseClosest2){
            //   console.log('appBase MATCH');
            // } else {
            //   // console.log('nomatch appBase', node2._id);
            //   try {
            //     console.log(node2.parent._id);
            //     console.log(node2.parent.parent._id);
            //   }catch(err){}
            // }

            // if(platformClosest1 && platformClosest2){
            //   console.log('platform MATCH');
            // } else {
            //   console.log('nomatch');
            // }

            if(
              platformClosest1 &&
              platformClosest2 &&
              appBaseClosest1 &&
              appBaseClosest2 &&
              platformClosest1.data.platform == platformClosest2.data.platform
              &&
              appBaseClosest1.data.appId == appBaseClosest2.data.appId
              ){
              // console.log('sameAppPlatform TRUE');
              return true;
            }

            // console.log('Missed sameAppPlatform');
            // console.log('sameAppPlatform false');
            return false;

          },

          sameParentChain: (node1, node2)=>{
            function getParentIds(node){
              let ids = [node._id];
              if(node.parent){
                ids = ids.concat(getParentIds(node.parent));
              }
              return ids;
            }
            
            let parentIds1 = getParentIds(node1);
            let parentIds2 = getParentIds(node2);

            if(lodash.intersection(parentIds1, parentIds2).length){
              return true;
            }

            return false;

          },

          WebTorrent: app.WebTorrentClient,
          IPFS: {
            ipfs: app.ipfs,
            onReady: app.ipfsReady,
            isReady: ()=>{
              if(app.ipfsIsReady){
                return true;    
              } else {
                return false;
              }
            },

            pin: (buffersToPin)=>{

              return new Promise(async (resolve, reject)=>{

                // pin multiple!
                let returnSingle = false;
                if(!lodash.isArray(buffersToPin)){
                  returnSingle = true;
                  buffersToPin = [buffersToPin];
                }

                let hashResult;
                try {
                  hashResult = await app.ipfs.files.add(buffersToPin);
                  console.log('hashResult:', hashResult);
                  let ipfsHashes = hashResult.map(result=>result.hash);
                  console.log('IPFS hashes to pin:', ipfsHashes);
                  for(let ipfsHash of ipfsHashes){
                    if(!ipfsHash){
                      console.error('Skipping invalid hash, empty from results', );
                      continue;
                    }
                    await app.ipfs.pin.add(ipfsHash);
                  }
                  if(returnSingle){
                    resolve({
                      type: 'ipfs_hash:..',
                      data: {
                        hash: ipfsHashes[0]
                      }
                    });
                  } else {
                    resolve({
                      type: 'ipfs_hashes:..',
                      data: {
                        hashes: ipfsHashes
                      }
                    });
                  }
                }catch(err){
                  console.error('IPFS pin failure:', err);
                  resolve({
                    type: 'ipfs_error_pinning:..',
                    data: {
                      error: true,
                      hashResult,
                      err
                    }
                  });
                }

              });


            }
          },

          directToSecond: (opts)=>{
            // to an External second
            return new Promise(async (resolve, reject)=>{

              let url = opts.url;
              url = url.split('http://localhost').join('http://docker.for.mac.localhost');

              // make web request to Node 
              // - just passing through the Node, assume any Auth is already included 
              let response = await request.post({
                method: 'post',
                url: url, //connectNode.data.connection, // expecting URL at first! 
                body: opts.RequestNode, //ExternalRequestNode.data.RequestNode,
                json: true
              })

              // console.log('Response from directToSecond:', opts.url, JSON.stringify(response,null,2));

              resolve(response);

            })
          },

          directToSecondViaWebsocket: (opts)=>{
            // to an External second
            return new Promise(async (resolve, reject)=>{
              // opts = {
              //   clientId,
              //   RequestNode
              // }

              let clientId = opts.clientId;

              // exists?
              if(!app.wsClients[clientId]){
                console.error('Client ID does NOT exist for directToSecondViaWebsocket, cannot send request when not connected');
                return resolve({
                  type: 'error:...',
                  data: 'Failed cuz clientId does NOT exist for directToSecondViaWebsocket'
                });
              }

              // start emitter listening for response 
              let requestId = uuidv4();

              // TODO: have a timeout for failed responses (ignore "late" responses?) ? 
              eventEmitter.once(`ws-response-${requestId}`, function _listener(r){
                console.log('Response to WEBSOCKET request, from RPI!');
                resolve(r.data);
              });

              // Make request via websocket 
              let ws = app.wsClients[clientId].ws;

              console.log('Making ws.send request with requestId, type, data-as-node'); 

              ws.send({
                requestId,
                type: 'request',
                data: opts.RequestNode
              });

              console.log('Made websocket request, waiting for response');

              // resolve(response);

            })
          },

          getIdentityForAddress: (address)=>{
            return new Promise(async (resolve, reject)=>{


              console.error('--Deprecated--');

              // fetches 1st bitcoin transaction for wallet address 
              // - uses decoded first transaction as an IPFS link 
              // - link: https://github.com/ipfs/js-ipfs/tree/master/examples/ipfs-101
              // - ipfs pinning service: https://www.eternum.io (with an API) 

              // currently just using "language" server! (not on bitcoin/ipfs while testing) 

              // notice, using docker.for.mac.localhost !!! (temporary)

              let walletReqData = JSON.parse('{"operationName":null,"variables":{"address":"'+address+'"},"query":"query ($address: String) {  walletOne(filter: {address: $address}) {    _id    address    transactions { txId   text }    createdAt    updatedAt    __typename  }}"}');

              let walletResult = await request.post({
                method: 'post',
                url: process.env.LANGUAGE_SERVER, 
                body: walletReqData,
                json: true
              })

              // Now get ipfs info 
              // - todo, using language server still
              let hash = walletResult.data.walletOne.transactions[0].text; // first result in transaction list 

              let ipfsReqData = JSON.parse('{"operationName":null,"variables":{"hash":"'+hash+'"},"query":"query ($hash: String) {  ipfsFileOne(filter: {hash: $hash}) {    _id    hash    text    createdAt    updatedAt    __typename  }}"}');

              let ipfsResult = await request.post({
                method: 'post',
                url: process.env.LANGUAGE_SERVER, //'http://docker.for.mac.localhost:7011/graphql',
                body: ipfsReqData,
                json: true
              })


              // Now get ipfs info 
              // - todo, using language server still
              console.log('ipfs text:', ipfsResult.data.ipfsFileOne.text, typeof ipfsResult.data.ipfsFileOne.text);
              // window.xx = ipfsResult.data.ipfsFileOne.text;

              let node;
              if(lodash.isString(ipfsResult.data.ipfsFileOne.text)){
                node = JSON.parse(ipfsResult.data.ipfsFileOne.text);
              } else {
                node = ipfsResult.data.ipfsFileOne.text;
              }

              resolve(node);


            })
          },

          // converts words to an address, posts address (temporary, should post on-chain and use ipfs) 
          createAddressForIdentity: (username, publicKey, connection)=>{
            return new Promise(async (resolve, reject)=>{
              // fetches 1st bitcoin transaction for wallet address 
              // - uses decoded first transaction as an IPFS link 
              // - link: https://github.com/ipfs/js-ipfs/tree/master/examples/ipfs-101
              // - ipfs pinning service: https://www.eternum.io (with an API) 

              // currently just using "language" server! (not on bitcoin/ipfs while testing) 

              // notice, using docker.for.mac.localhost !!! (temporary)

              console.log('createAddressForIdentity');
              console.log('connection:', connection);

              // Create IPFS values (ExternalIdentityNode as JSON) 
              // - external_identity:0.0.1:local:8982f982j92 
              //   - publicKey
              // - external_identity_connect_method:0.0.1:local:382989239hsdfmn
              //   - method: 'http'
              //   - connection: http://*.second.com/ai 
              let ExternalIdentityNode = {
                type: 'external_identity:0.0.1:local:8982f982j92',
                data: {
                  publicKey, //: '-----BEGIN PUBLIC KEY-----\nMFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAI+ArOUlbt1k2G2n5fj0obEn4mpCfYEx\nvSZy2c/0tv2caC0AYbxZ4vzppGVjxf+L6fythmWRB0vcwyXHy57fm7ECAwEAAQ==\n-----END PUBLIC KEY-----'
                },
                nodes: [{
                  type: 'external_identity_connect_method:0.0.1:local:382989239hsdfmn',
                  data: {
                    method: 'http',
                    connection, //: 'https://infinite-brook-40362.herokuapp.com/ai'
                  }
                }]
              };

              console.log({
                username, 
                publicKey, 
                connection,
                ExternalIdentityNode
              });
              
              let subname = ''; // empty is for root 
              let usernameSplit = username.split('@');
              if(usernameSplit.length > 1){
                subname = usernameSplit[0];
                username = usernameSplit[1];
              }

              // add to stellar and ipfs (nodechain) 
              console.log('Adding to stellar and ifps (nodechain)');

              // Identity ipfs hash 
              // - add to nodechain (pins ipfshash) 
              let identityIpfsHash;
              try {
                let chainResult = await publishNodeToChain({
                  node: ExternalIdentityNode
                });
                identityIpfsHash = chainResult.data.hash;
              }catch(err){
                console.error('Failed writing identity IpfsHash to nodechain', err);
                return reject();
              }


              console.log('Adding to stellar:', identityIpfsHash, username);

              // Add to stellar
              var pairSource = StellarSdk.Keypair.fromSecret(process.env.STELLAR_SEED);
              let pkTargetSeed = crypto.createHash('sha256').update(username).digest(); //returns a buffer
              var pairTarget = StellarSdk.Keypair.fromRawEd25519Seed(pkTargetSeed);

              console.log('pkTarget Seed:', pairTarget.secret());



              // Update data (manageData operation) 
              console.log('Building transaction (multisig manageData)');

              // expecting targetAccount to already exist (aka was claimed, is now being updated)
              // - dont automatically CLAIM right now, this is just for UPDATING (targetAccount must exist)! 
              let targetAccount;
              try {
                targetAccount = await funcInSandbox.universe.getStellarAccount(pairTarget.secret(), {claim: true});
                // targetAccount = await stellarServer.loadAccount(pairTarget.publicKey())
                console.log('Found targetAccount (from getStellarAccount):'); //, targetAccount);
              } catch(err){
                console.error('Failed finding existing account for username. Should have already claimed!', err);
                return reject();
              }

              // Start building the transaction for manageData update
              let transaction = new StellarSdk.TransactionBuilder(targetAccount)

              .addOperation(StellarSdk.Operation.manageData({
                name: subname + '|second',
                value: identityIpfsHash
              }))
              // .addMemo(StellarSdk.Memo.hash(b32))
              .build();

              // Sign the transaction to prove you are actually the person sending it.
              transaction.sign(pairTarget); // targetKeys
              transaction.sign(pairSource); // sourceKeys

              // send to stellar network
              let stellarResult = await stellarServer.submitTransaction(transaction)
              .then(function(result) {
                console.log('Stellar manageData Success! Results:'); //, result);
                return result;
              })
              .catch(function(error) {
                console.error('Stellar Something went wrong (failed updating data)!', error);
                // If the result is unknown (no response body, timeout etc.) we simply resubmit
                // already built transaction:
                // server.submitTransaction(transaction);
                return null;
              });

              // console.log('stellarResult', stellarResult);

              if(!stellarResult){
                console.error('Failed stellar createAddressForIdentity');
                return reject();
              }

              console.log('stellarResult succeeded! (createAddressForIdentity)');

              return resolve({
                type: 'boolean:..',
                data: true
              })



              // let ipfsHash = uuidv4();

              // let ipfsReqData = JSON.parse('{"operationName":null,"variables":{"hash":"'+ipfsHash+'","text":'+ExternalIdentityNode+'},"query":"mutation ($hash: String    $text: String) {  ipfsFileCreate(record: {hash: $hash   text: $text}) {    recordId    __typename  }}"}');

              // console.log('ipfsReqData:',ipfsReqData);

              // let ipfsResult = await request.post({
              //   method: 'post',
              //   url: process.env.LANGUAGE_SERVER, //'http://docker.for.mac.localhost:7011/graphql',
              //   body: ipfsReqData,
              //   json: true
              // })

              // console.log('ipfs text:', ipfsResult.data.ipfsFileCreate.recordId);

              // if(!ipfsResult.data.ipfsFileCreate.recordId){
              //   console.error('Failed ipfs');
              //   return reject();
              // }

              // // resolve({
              // //   CREATED: true,
              // //   ipfsResult
              // // })

              // // // Add IPFS hash to Bitcoin ledger (must be first transaction, otherwise should fail!) 

              // // add to ipfs (todo)

              // // transform to "string[space]string[space]string[space]" format 
              // words = lodash.compact(words.split(' ')).join(' ').split('"').join('').split("'").join('');
              // // transform to wallet address 
              // var hash = bitcoin.crypto.sha256(words)
              // console.log('hash:', hash);
              // var d = bigi.fromBuffer(hash)
              // console.log('d:', d);
              // var keyPair = new bitcoin.ECPair(d)
              // var address = keyPair.getAddress()
              // console.log('Remote Second Wallet Address', address);

              // let transactionsVal = JSON.stringify([{
              //   txId: uuidv4(),
              //   text: ipfsHash
              // }]);

              // let walletReqData = JSON.parse('{"operationName":null,"variables":{"address":"'+address+'","transactions":'+transactionsVal+'},"query":"mutation ($address: String    $transactions: [WalletsWalletsTransactionsInput]) {  walletCreate(record: {address: $address   transactions: $transactions}) {    recordId    __typename  }}"}');

              // let walletResult = await request.post({
              //   method: 'post',
              //   url: process.env.LANGUAGE_SERVER, 
              //   body: walletReqData,
              //   json: true
              // })

              // console.log('wallet create result:', walletResult);

              // try {

              //   if(!walletResult.data.walletCreate.recordId){
              //     console.error('Failed ipfs');
              //     return reject();
              //   }

              //   return resolve({
              //     type: 'boolean:..',
              //     data: true
              //   }); 
              // }catch(err){
              //   // might have already created wallet entry, error, but continue for now...
              //   console.error('WALLET DUPLICATE!!!!');
              //   return resolve({
              //     type: 'boolean:..',
              //     data: true
              //   });
              // }

              // // let walletReqData = JSON.parse('{"operationName":null,"variables":{"address":"'+address+'"},"query":"query ($address: String) {  walletOne(filter: {address: $address}) {    _id    address    transactions { txId   text }    createdAt    updatedAt    __typename  }}"}');

              // // let walletResult = await request.post({
              // //   method: 'post',
              // //   url: process.env.LANGUAGE_SERVER, 
              // //   body: walletReqData,
              // //   json: true
              // // })

              // // // Now get ipfs info 
              // // // - todo, using language server still
              // // let hash = walletResult.data.walletOne.transactions[0].text; // first result in transaction list 





              // // // Now get ipfs info 
              // // // - todo, using language server still
              // // console.log('ipfs text:', ipfsResult.data.ipfsFileOne.text, typeof ipfsResult.data.ipfsFileOne.text);
              // // // window.xx = ipfsResult.data.ipfsFileOne.text;

              // // let node;
              // // if(lodash.isString(ipfsResult.data.ipfsFileOne.text)){
              // //   node = JSON.parse(ipfsResult.data.ipfsFileOne.text);
              // // } else {
              // //   node = ipfsResult.data.ipfsFileOne.text;
              // // }

              // // resolve(node);


            })
          },

          // converts words to an address, posts address (temporary, should post on-chain and use ipfs) 
          manageData: (network, username, field, nodeValue)=>{
            return new Promise(async (resolve, reject)=>{

              // writing a node to identity 

              console.log('manageData', network, username, field);

              let subname = ''; // empty is for root 
              let usernameSplit = username.split('@');
              if(usernameSplit.length > 1){
                subname = usernameSplit[0];
                username = usernameSplit[1];
              }

              // add to stellar and ipfs (nodechain) 
              console.log('manageData for Identity on stellar and ifps (nodechain)');

              // ipfs hash
              // - add to nodechain (pins ipfshash) 
              let nodeIpfsHash;
              try {
                let chainResult = await publishNodeToChain({
                  chain: 'dev@second', // TODO: should publish to my "personal" nodechain, that nobody can access, but that seeds my ipfs hashes 
                  node: nodeValue
                });
                nodeIpfsHash = chainResult.data.hash;
              }catch(err){
                console.error('Failed writing identity IpfsHash to nodechain', err);
                return reject();
              }


              console.log('Adding to stellar:', nodeIpfsHash, username);

              // Add to stellar
              var pairSource = StellarSdk.Keypair.fromSecret(process.env.STELLAR_SEED);
              let pkTargetSeed = crypto.createHash('sha256').update(username).digest(); //returns a buffer
              var pairTarget = StellarSdk.Keypair.fromRawEd25519Seed(pkTargetSeed);

              console.log('pkTarget Seed:', pairTarget.secret());



              // Update data (manageData operation) 
              console.log('Building transaction (multisig manageData)');

              // expecting targetAccount to already exist (aka was claimed, is now being updated)
              // - dont automatically CLAIM right now, this is just for UPDATING (targetAccount must exist)! 
              let targetAccount;
              try {
                targetAccount = await funcInSandbox.universe.getStellarAccount(pairTarget.secret(), {claim: false});
                // targetAccount = await stellarServer.loadAccount(pairTarget.publicKey())
                console.log('Found targetAccount (from getStellarAccount):'); //, targetAccount);
              } catch(err){
                console.error('Failed finding existing account for username. Should have already claimed!', err);
                return reject();
              }

              // Start building the transaction for manageData update
              let transaction = new StellarSdk.TransactionBuilder(targetAccount)

              .addOperation(StellarSdk.Operation.manageData({
                name: subname + '|' + field,
                value: nodeIpfsHash
              }))
              // .addMemo(StellarSdk.Memo.hash(b32))
              .build();

              // Sign the transaction to prove you are actually the person sending it.
              transaction.sign(pairTarget); // targetKeys
              transaction.sign(pairSource); // sourceKeys

              // send to stellar network
              let stellarResult = await stellarServer.submitTransaction(transaction)
              .then(function(result) {
                console.log('Stellar manageData Success! Results:'); //, result);
                return result;
              })
              .catch(function(error) {
                console.error('Stellar Something went wrong (failed updating data)!', error);
                // If the result is unknown (no response body, timeout etc.) we simply resubmit
                // already built transaction:
                // server.submitTransaction(transaction);
                return null;
              });

              // console.log('stellarResult', stellarResult);

              if(!stellarResult){
                console.error('Failed stellar manageData');
                return reject();
              }

              console.log('stellarResult succeeded! (manageData)');

              return resolve({
                type: 'boolean:..',
                data: true
              })


            })
          },

          getStellarAccount: async (targetSeed, opts)=>{

            // Returns an account for an identity/username that we control 
            // - if necessary: claims account (creates), sets up multi-sig

            console.log('getStellarAccount:', targetSeed);

            opts = opts || {
              claim: true
            }

            var pairSource = StellarSdk.Keypair.fromSecret(process.env.STELLAR_SEED);
            var pairTarget = StellarSdk.Keypair.fromSecret(targetSeed);

            console.log('pkSource Seed:', pairSource.secret());
            console.log('pkTarget Seed:', pairTarget.secret());


            // Load Target account
            let targetAccount = await stellarServer
            .loadAccount(pairTarget.publicKey())
            .catch(()=>{
              return false;
            })

            if(targetAccount){
              // target account exists
              // - should already be owned by me 

              let sourceIsSigner = lodash.find(targetAccount.signers,{public_key: pairSource.publicKey()});
              if(sourceIsSigner){
                // already claimed, but I'm the owner 
                // - multi-sig is already setup 

                // all good with this targetAccount! 
                console.log('targetAccount all set with multisig for updating!');
                return targetAccount;

              } else {
                // exists, and I'm not the owner 
                // - could also check to see if it is unprotected? (unlikely, maybe on testnet only) 
                // - could check the "data.willSellFor" field to see if it is for sale? 
                console.error('Username exists and you are not the owner'); // TODO: return who the owner is 
                return false;

              }


            }


            // identity Account doesn't exist 
            // - register account (and setup multisig) if I have a balance in my sourceAccount 


            // Load source account
            let sourceAccount;
            try {
              sourceAccount = await stellarServer.loadAccount(pairSource.publicKey())
            }catch(err){
              // problem with account 
              return false;
            }

            // get source balance 
            if(sourceAccount){
              let balance = 0;
              balance = sourceAccount.balances[0].balance;

              console.log('Balance:', balance);

              balance = parseInt(balance,10);
              if(balance < 10){
                console.error('Insufficient balance in account for creation:', sourceAccount.balances[0].balance);
                return false;
              }
            }


            // Claim account
            if(!opts.claim){
              console.error('NOT claiming even though targetAccount doesnt exist!');
              return false;
            }

            // Start building the transaction.
            let transaction = new StellarSdk.TransactionBuilder(sourceAccount)
            .addOperation(StellarSdk.Operation.createAccount({
              destination: pairTarget.publicKey(),
              startingBalance: "3.0"
              // source: pair
            }))
            .build();

            // Sign the transaction to prove you are actually the person sending it.
            transaction.sign(pairSource); // sourceKeys

            // send to stellar network
            let stellarResult = await stellarServer.submitTransaction(transaction)
            .then(function(result) {
              console.log('Stellar Success createAccount'); // , result); 
              return result;
            })
            .catch(function(error) {
              console.error('Stellar Something went wrong!', error);
              // If the result is unknown (no response body, timeout etc.) we simply resubmit
              // already built transaction:
              // server.submitTransaction(transaction);
              return null;
            });

            // console.log('stellarResult', stellarResult);
            if(!stellarResult){
              console.error('Failed creating account');
              return false;
            }

            console.log('Created account, starting multisig (reloading account)');

            // reload the account 
            targetAccount = await stellarServer.loadAccount(pairTarget.publicKey())

            // Add multisig 
            console.log('adding multisig after creating username'); //, targetAccount);

            // set multi-sig on this account 
            // - will fail if I am unable to claim 

            // Start building the transaction.
            let transaction2 = new StellarSdk.TransactionBuilder(targetAccount)
            .addOperation(StellarSdk.Operation.setOptions({
              signer: {
                ed25519PublicKey: pairSource.publicKey(),
                weight: 1
              }
            }))
            .addOperation(StellarSdk.Operation.setOptions({
              masterWeight: 1, // set master key weight (should really be nothing, and controlled by this other key?) 
              lowThreshold: 2, // trustlines
              medThreshold: 2, // manageData
              highThreshold: 2  // setOptions (multi-sig)
            }))
            .build();

            // Sign the transaction to prove you are actually the person sending it.
            transaction2.sign(pairTarget); // sourceKeys
            // transaction2.sign(pairSource); // sourceKeys

            // send to stellar network
            let stellarResult2 = await stellarServer.submitTransaction(transaction2)
            .then(function(result) {
              console.log('Stellar MultiSig Setup Success!'); // Results:', result);
              return result
            })
            .catch(function(error) {
              console.error('Stellar Something went wrong (failed multisig)!', error);
              // If the result is unknown (no response body, timeout etc.) we simply resubmit
              // already built transaction:
              // server.submitTransaction(transaction);
              return null;
            });

            // console.log('Multisig result:', stellarResult2);

            if(!stellarResult2){
              console.error('Failed multisig setup');
              return false;
            }

            // return final targetAccount (with signers, etc.) 
            console.log('Returning targetAccount after creating and adding multi-sig');
            targetAccount = await stellarServer.loadAccount(pairTarget.publicKey())

            return targetAccount;

          },


          TalkToSecond: ({ExternalIdentityNode, InputNode}) => {
            return new Promise(async (resolve, reject) => {

              // make a request (assuming http for now) to an external Second 
              // - could also be local/on-page? 

              console.error('Using WRONG TalkToSecond! Should use capability');

              let url = lodash.find(ExternalIdentityNode.nodes,{
                type: 'external_identity_connect_method:0.0.1:local:382989239hsdfmn'
              }).data.connection;

              console.log('ExternalIdentity connection url:', url);

              let response = await request.post({
                method: 'post',
                url: url,
                body: InputNode,
                json: true
              })

              resolve(response.secondResponse);

              // $.ajax({
              //   url: url,
              //   method: 'POST',
              //   contentType: 'application/json',
              //   data: JSON.stringify(InputNode),
              //   success: (response)=>{
              //     // expecting a "secondResponse" object that contains a Node 
              //     if(!response.secondResponse){
              //       console.error('Failed making secondResponse');
              //       reject('Failed making secondResponse');
              //       return;
              //     }
              //     resolve(response.secondResponse);
              //   },
              //   error: err=>{
              //     reject(err);
              //   }
              // })

            })
          },

          loadAndRunCapability: (nameSemver, opts, input)=>{
            return new Promise(async(resolve, reject)=>{

              // Run rsa capability 
              let capNode = await funcInSandbox.universe.loadCapability(nameSemver, opts);
              let returnNode = await funcInSandbox.universe.runCapability(capNode, input);

              resolve(returnNode);

            })
          },
          loadCapability: (nameSemver, opts)=>{
            opts = opts || {};
            return new Promise(async (resolve, reject)=>{

              // console.log('--Load capability'); //, platformClosest._id, funcInSandbox.universe.isParentOf ? true:false);

              // Returns the Node for the capability specified
              let capabilityNodes = await funcInSandbox.universe.searchMemory({
                filter: {
                  sqlFilter: {
                    type: "capability:0.0.1:local:187h78h23",
                    // nodeId: null, // NEW: app-level. OLD: top-level/root,
                    data: {
                      key: nameSemver // todo: semver with version!
                    }
                  },
                  filterNodes: tmpNodes=>{
                    return new Promise((resolve, reject)=>{
                      // tmpNodes = tmpNodes.filter(tmpNode=>{
                      //   return tmpNode.data.method == 'read';
                      // })

                      // try {
                      //   console.log('platformClosest._id', platformClosest._id);
                      // }catch(err){
                      //   console.error('NO PLATFORMClOSEST');
                      // }
                      tmpNodes = lodash.filter(tmpNodes, tmpNode=>{

                        if(funcInSandbox.universe.isParentOf(platformClosest._id, tmpNode)){
                          // console.log('FOUND IT UNDER SAME APP!!!!!', tmpNode._id);
                          // console.log('FOUND PARENT1!');
                          return true;
                        }
                        return false;
                      })
                      resolve(tmpNodes);
                    });
                  },
                }
              });
              // capabilityNodes = universe.lodash.sortBy(capabilityNodes,capNode=>{
              //   let orderNode = universe.lodash.find(capNode.nodes, {type: 'order_level:0.0.1:local:382hf273'});
              //   return orderNode ? orderNode.data.level:0;
              // });

              if(!capabilityNodes || !capabilityNodes.length){
                console.error('Unable to find capability!', nameSemver);

                let allNodes = await funcInSandbox.universe.searchMemory({});
                console.error('Failed capabilityNode',nameSemver); //, allNodes);
                debugger;

                return reject();
              }

              if(capabilityNodes.length > 1){
                console.error('TOO MANY capability nodes!');
                // return reject();
              }

              return resolve(capabilityNodes[0]);
              
            })
          },
          runCapability: (capNode, externalInputNode)=>{
            // opts = opts || {};
            return new Promise(async (resolve, reject)=>{

              // Pass in InputNode to capability! 

              let codeNode = lodash.find(capNode.nodes, {type: 'code:0.0.1:local:32498h32f2'});

              let inputNode = {
                type: 'capability_input_node:0.0.1:local:29f8239a13h9',
                data: {
                  capabilityNode: capNode,
                  externalInputNode: externalInputNode
                }
              }

              // run in vm
              let responseNode;
              try {
                responseNode = await funcInSandbox.universe.runNodeCodeInVM({
                  codeNode, 
                  dataNode: inputNode
                });
              }catch(err){
                console.error('In VM error:', err);
                responseNode = {
                  type: 'err_in_vm:6231',
                  data: {
                    err: err || {},
                    error: err
                  }
                }
              }

              resolve(responseNode);
              
            })
          },

          capabilities: ()=>{

            return {
              privateIdentity: getPrivateIdentity,
              sign: StringNode=>{
                // expecting a type:string:0.0.1:local:289hf329h93
                // sign a string using internal IdentityNode (only 1 expected) 

                return new Promise(async (resolve, reject)=>{

                  let stringToSign = StringNode.data;

                  let IdentityNode = await getPrivateIdentity();
                  let privateKey = IdentityNode.data.private;

                  let key = new rsa(privateKey);
                  let signed = key.sign(stringToSign);

                  resolve({
                    type: 'string:0.0.1:local:289hf329h93',
                    data: signed.toString('base64')
                  });

                });
              },
              verify: ChallengeVerifyNode=>{
                // expecting a type:challenge_verify:0.0.1:local:93fj92hj832ff2
                // - verify that what was passed-in 

                return new Promise(async (resolve, reject)=>{

                  // let stringToSign = ChallengeVerifyNode.data;

                  // let IdentityNode = await getPrivateIdentity();
                  // let privateKey = IdentityNode.data.private;

                  let key = new rsa(ChallengeVerifyNode.data.publicKey);

                  let verified = key.verify(ChallengeVerifyNode.data.challenge, ChallengeVerifyNode.data.solution, undefined, 'base64'); // todo

                  resolve({
                    type: 'boolean:0.0.1:local:98h8fh28h3232f',
                    data: verified
                  });

                });
              },
              encryptPrivate: StringNode=>{
                // expecting a type:string:0.0.1:local:289hf329h93
                // sign a string using internal IdentityNode (only 1 expected) 

                return new Promise(async (resolve, reject)=>{

                  try {

                    let stringToEncrypt = StringNode.data;

                    let IdentityNode = await getPrivateIdentity();
                    let privateKey = IdentityNode.data.private;

                    // Encrypt 
                    // let ciphertext;
                    // try {
                    //   ciphertext = CryptoJS.AES.encrypt('test1', 'private kmk');
                    // }catch(err){
                    //   console.error(err);
                    //   return resolve({
                    //     type: 'string',
                    //     data: 'test2'
                    //   });
                    // }

                    // return resolve({
                    //   // what: 'ok',
                    //   sha: CryptoJS.SHA256('fuck').toString()
                    // });

                    let customEncryptionKey = CryptoJS.SHA256(privateKey).toString().substr(0,32);

                    let iv = crypto.randomBytes(IV_LENGTH);
                    let cipher = crypto.createCipheriv('aes-256-cbc', new Buffer(customEncryptionKey), iv);
                    let encrypted = cipher.update(stringToEncrypt);

                    encrypted = Buffer.concat([encrypted, cipher.final()]);

                    let ciphertext = iv.toString('hex') + ':' + encrypted.toString('hex');

                    resolve({
                      type: 'string:0.0.1:local:289hf329h93',
                      data: ciphertext
                    });

                    // let key = new rsa(privateKey);
                    // let encrypted = key.encryptPrivate(stringToEncrypt);

                    // resolve({
                    //   type: 'string:0.0.1:local:289hf329h93',
                    //   data: encrypted.toString('base64') //encrypted //.toString('base64')
                    // });
                  }catch(err){
                    return resolve({
                      type: 'error:..',
                      data: {
                        str: 'Failed encrypting!'
                      }
                    });
                  }

                });
              },
              decryptPrivate: StringNode=>{
                // expecting a type:string:0.0.1:local:289hf329h93
                return new Promise(async (resolve, reject)=>{

                  try {

                    let stringToDecrypt = StringNode.data;

                    let IdentityNode = await getPrivateIdentity();
                    let privateKey = IdentityNode.data.private;

                    // // Decrypt 
                    // var bytes  = CryptoJS.AES.decrypt(stringToDecrypt, privateKey);
                    // var plaintext = bytes.toString(CryptoJS.enc.Utf8);

                    let customEncryptionKey = CryptoJS.SHA256(privateKey).toString().substr(0,32);

                    let textParts = stringToDecrypt.split(':');
                    let iv = new Buffer(textParts.shift(), 'hex');
                    let encryptedText = new Buffer(textParts.join(':'), 'hex');
                    let decipher = crypto.createDecipheriv('aes-256-cbc', new Buffer(customEncryptionKey), iv);
                    let decrypted = decipher.update(encryptedText);

                    decrypted = Buffer.concat([decrypted, decipher.final()]);

                    // return decrypted.toString();
                    let plaintext = decrypted.toString();

                    resolve({
                      type: 'string:0.0.1:local:289hf329h93',
                      data: plaintext
                    });

                    // let key = new rsa(privateKey);
                    // let decrypted;
                    // try {                  
                    //   decrypted = key.decrypt( new Buffer(StringNode.data,'base64')); // uses Private Key!
                    // }catch(err){
                    //   return resolve({
                    //     err: err,
                    //     str: err.toString()
                    //   });
                    // }

                    // resolve({
                    //   type: 'string:0.0.1:local:289hf329h93',
                    //   data: {
                    //     StringNode,
                    //     decrypted
                    //   }
                    // });
                  }catch(err){
                    return resolve({
                      type: 'error:..',
                      data: {
                        str: 'Failed decrypting'
                      }
                    });
                  }

                });
              },
              externalRequest: ExternalRequestNode => {
                return new Promise(async (resolve,reject)=>{

                  // Make a request to an external Second 
                  // data: {
                  //   ExternalIdentityNode, // must include connect_method
                  //   RequestNode: InitiateIdentifyNode
                  // }

                  // ExternalIdentityNode needs to have a NodeChild w/ a connect_method 
                  let connectNode = lodash.find(ExternalRequestNode.data.ExternalIdentityNode.nodes, {type: 'external_identity_connect_method:0.0.1:local:382989239hsdfmn'});
                  if(!connectNode){
                    console.error('Missing ConnectNode!');
                    return reject({
                      type: 'internal_error_output:0.0.1:local:32948x2u3cno2c',
                      data: {
                        str: 'Missing existing ExternalIdentity connect_method child!'
                      }
                    })
                  }

                  console.log('Making external request');

                  // make web request to Node 
                  // - just passing through the Node, assume any Auth is already included 
                  let response = await request.post({
                    method: 'post',
                    url: connectNode.data.connection, // expecting URL at first! 
                    body: ExternalRequestNode.data.RequestNode,
                    json: true
                  })

                  // ONLY returning a "second" response! (no other URL is allowed besides this, for now) 
                  return resolve(response.secondResponse);


                })
              }
            }

          }, // check for capabilities, call capabilities with a Node 
          getCapabilityAndRunWithNodeAsInput: ({capability, InputNode}) =>{

            // Finds a capability (added hownow?) 
            // - runs Code with 

            setupIpcWatcher({
                command: 'getCapabilityAndRunWithNodeAsInput', // whole thing for now
                data,
                capability,
                InputNode
            }, (r)=>{
              resolve(r.data);
            })

          },
          reportProblem: (problem)=>{
            // how to report this problem so it can be tracked down? 
            return true;
          }, 
          hasChildNode: (node, matcher)=>{
            // allow "matcher" to be a function? 
            return lodash.find(node.nodes,matcher);
          },
          historyLog: (data, type, logLevel)=>{
            return new Promise(async (resolve, reject)=>{

              // Runs in ThreadedVM 
              // - putting this here means it PROBABLY won't have all the context we'd hope for

              // should validate code/schema too? 

              setupIpcWatcher({
                  command: 'historyLog', // whole thing for now
                  data,
                  type,
                  logLevel
              }, (r)=>{
                resolve(r.data);
              })

            });
          },

          findNode: (filterObj) => {
            return new Promise(async (resolve, reject)=>{

              // Runs in ThreadedVM 
              // - putting this here means it PROBABLY won't have all the context we'd hope for

              // should validate code/schema too? 

              setupIpcWatcher({
                  command: 'findNode', // whole thing for now
                  filter: filterObj
              }, (r)=>{
                resolve(r.data);
              })

            });
          },

          newNode: (node, skipWaitForResolution, skipRebuild) => {
            return new Promise(async (resolve, reject)=>{

              // Runs in ThreadedVM 
              // - putting this here means it PROBABLY won't have all the context we'd hope for

              // should validate code/schema too? 

              setupIpcWatcher({
                  command: 'newNode', // whole thing for now
                  node,
                  skipWaitForResolution,
                  skipRebuild
              }, (r)=>{
                resolve(r.data);
              })

            });
          },
          
          updateNode: (node, skipWaitForResolution, skipRebuild) => {
            return new Promise(async (resolve, reject)=>{

              // Runs in ThreadedVM 
              // - putting this here means it PROBABLY won't have all the context we'd hope for

              // should validate code/schema too? 

              if(!node){
                console.error('Missing Node to update!');
                return reject();
              }
              node = Object.assign({},node);

              node = {
                _id: node._id || undefined,
                name: node.name || undefined, 
                nodeId: node.nodeId || undefined,
                type: node.type || undefined,
                data: node.data || undefined,
                active: node.hasOwnProperty('active') ? node.active : undefined,
                createdAt: node.createdAt || undefined,
                updatedAt: (new Date()).getTime(),
              }

              // console.log('Node to update:', JSON.stringify(node,null,2));

              setupIpcWatcher({
                  command: 'updateNode', // whole thing for now
                  node,
                  skipWaitForResolution,
                  skipRebuild
              }, (r)=>{
                resolve(r.data);
              })

            });

          },
          
          removeNode: (node, skipWaitForResolution, skipRebuild) => {
            return new Promise(async (resolve, reject)=>{

              // Runs in ThreadedVM 
              // - putting this here means it PROBABLY won't have all the context we'd hope for

              // should validate code/schema too? 

              if(!node){
                console.error('Missing Node to remove!');
                return reject();
              }
              node = Object.assign({},node);

              node = {
                _id: node._id || undefined
              }

              // console.log('Node to update:', JSON.stringify(node,null,2));

              setupIpcWatcher({
                  command: 'removeNode', // whole thing for now
                  node,
                  skipWaitForResolution,
                  skipRebuild
              }, (r)=>{
                resolve(r.data);
              })

            });

          },

          rebuildMemory: (skipWaitForResolution) => {
            return new Promise(async (resolve, reject)=>{

              // used to manually rebuild memory after making bulk changes 
              // - queues up "afterUpdate" events? 

              setupIpcWatcher({
                  command: 'rebuildMemory', 
                  skipWaitForResolution
              }, (r)=>{
                resolve(r.data);
              })

            });

          },

          getRequestCache: (opts) => {
            return new Promise(async (resolve, reject)=>{

              // Runs in ThreadedVM 
              // - putting this here means it PROBABLY won't have all the context we'd hope for

              // should validate code/schema too? 

              setupIpcWatcher({
                  command: 'getRequestCache', // whole thing for now
                  requestId: ob.requestId
              }, (r)=>{
                resolve(r.data);
              })

            });
          },
          setRequestCacheKeyValue: (key, value) => {
            return new Promise(async (resolve, reject)=>{

              // Runs in ThreadedVM 
              // - putting this here means it PROBABLY won't have all the context we'd hope for

              // should validate code/schema too? 

              setupIpcWatcher({
                  command: 'setRequestCacheKeyValue', // whole thing for now
                  requestId: ob.requestId,
                  key,
                  value
              }, (r)=>{
                resolve(r.data);
              })

            });
          },

          httpResponse: (action, data) => {
            return new Promise(async (resolve, reject)=>{

              // Runs in ThreadedVM 
              // - putting this here means it PROBABLY won't have all the context we'd hope for

              // should validate code/schema too? 

              setupIpcWatcher({
                  command: 'httpResponse', // whole thing for now
                  requestId: ob.requestId,
                  action,
                  data
              }, (r)=>{
                resolve(r.data);
              })

            });
          },

          httpSession: (action, data) => {
            return new Promise(async (resolve, reject)=>{

              // Runs in ThreadedVM 
              // - putting this here means it PROBABLY won't have all the context we'd hope for

              // should validate code/schema too? 

              setupIpcWatcher({
                  command: 'httpSession', // whole thing for now
                  requestId: ob.requestId,
                  action,
                  data
              }, (r)=>{
                resolve(r.data);
              })

            });
          },

          runNodeCodeInVMSimple: (opts) => {
            return new Promise(async (resolve, reject)=>{

              // only use this for comparison! 
              // - do NOT use for reaching outside at all, expect the INPUT to include everything necessary! 
              try {

                let code = opts.codeNode.data.code;
                let sandbox = {
                  SELF: opts.codeNode,
                  INPUT: opts.dataNode,
                  miniverse: {
                    lodash
                  }
                }

                const simpleVM = new VM({
                    timeout: 1000,
                    sandbox
                });

                try {
                  let output = simpleVM.run(code); 
                  resolve(output); // does NOT handle promises! 
                  // resolve(true);
                }catch(err){
                  // reject(undefined);
                  resolve(undefined);
                }

              }catch(err){
                console.error('Failed runNodeCodeInVMSimple', err);
              }

            });

          },

          runNodeCodeInVM: (opts) => {
            return new Promise(async (resolve, reject)=>{

              // console.log('runNodeCodeInVM');

              // Runs in ThreadedVM 
              // - putting this here means it PROBABLY won't have all the context we'd hope for

              // should validate code/schema too? 

              if(!opts.codeNode){
                console.error('Missing codeNode for runNodeCodeInVM');
                return reject();
              }
              if(!opts.codeNode.data){
                console.error('Missing codeNode.data for runNodeCodeInVM');
                return reject();
              }
              if(!opts.codeNode.data.code){
                console.error('Missing codeNode.data.code for runNodeCodeInVM');
                return reject();
              }

              // // parent?
              // try {
              //   console.log('-1');
              //   console.log(opts.codeNode.parent.type.split(':')[0]);
              //   console.log(opts.codeNode.parent.parent.type.split(':')[0]);
              //   console.log(opts.codeNode.parent.parent.parent.type.split(':')[0]);
              //   console.log(opts.codeNode.parent.parent.parent.parent.type.split(':')[0]);
              //   console.log(opts.codeNode.parent.parent.parent.parent.parent.type.split(':')[0]);
              //   console.log('-2');
              // }catch(err){

              // }

              try {

                let code = opts.codeNode.data.code;


                let datetime = (new Date());

                setupIpcWatcher({
                  command: 'ThreadedSafeRun',
                  code: code,
                  SELF: opts.codeNode,
                  INPUT: opts.dataNode || opts.inputNode,
                  requestId: ob ? ob.requestId : uuidv4(), // from ob.context!!
                  mainIpcId: ob ? ob.mainIpcId : uuidv4(),
                  nodeId: opts.codeNode._id,
                  timeout: opts.timeout,
                  workGroup: opts.workGroup,
                  workers: opts.workers,
                  datetime: datetime.getSeconds() + '.' + datetime.getMilliseconds()
                }, (r)=>{
                  resolve(r.data);
                })

              } catch(err){
                console.error('Failed runNodeCodeInVM', err, Object.keys(opts.codeNode));
              }


            });

          },
          searchMemory: (opts) => {
            return new Promise(async (resolve, reject)=>{
              app.sm123 = app.sm123 || 1;
              let sm123 = app.sm123 + 0;
              app.sm123++;

              console.log('Running searchMemory', sm123);

              // resolve('universe result! ' + ob.context.tenant.dbName);
              // console.log('searchMemory1');
              opts = opts || {};
              opts.lean = opts.lean ? true:false;
              opts.filter = opts.filter || {};
              opts.filter.sqlFilter = opts.filter.sqlFilter || {};
              opts.filter.dataFilter = opts.filter.dataFilter || {}; // underscore-query
              // console.log('FetchNodes:', opts.filter.sqlFilter);

              // Check cache 
              if(opts.cache && (process.env.IGNORE_MEMORY_CACHE || '').toString() !== 'true'){
                if(app.globalCache.SearchFilters[opts.cache]){
                  // console.log('Used cache (skipped IPC fetchNodes)');
                  return resolve(app.globalCache.SearchFilters[opts.cache]);
                } else {
                  // console.log('Not cached yet:', opts.cache);
                }
              } else {
                // console.log('No cache attempted, fetchingNodes');
              }

              // console.log('SLOW:', opts.cache ? opts.cache:'NoCache');

              let nodes;
              try{
                nodes = await fetchNodes(opts.filter);
              }catch(err){
                console.error(err);
                return resolve({
                  err: 'shit'
                });
              }

              // console.log('NODES FOR fetchNodes:', nodes.length);
              // if(nodes && nodes.length){
              //   console.log('Node:', nodes[0]);
              // }

              // console.log('internal searchMemory result length:', nodes.length);

              // run "filterNode" after all the results are found
              if(typeof(opts.filter.filterNodes) == 'function'){
                try {
                  // console.log('FilterNodes:', sm123, nodes.length);
                  if(nodes.length == app.nodesDbParsed.length){
                    console.error('Did NOT filter search at all (filterNodes length is max)!', sm123, 'CodeNode._id:', codeNode ? codeNode._id:null);
                  }
                  nodes = opts.filter.filterNodes(nodes); // may be a promise (probably is!) 
                }catch(err){
                  console.error('Failed filterNodes1', err);
                  return;
                }
              }

              Promise.resolve(nodes)
              .then(nodes=>{
                // add result to cache
                if(opts.cache){
                  // app.globalCache.SearchFilters[opts.cache] = nodes; // UNCOMMENT TO ENABLE SEARCH CACHE (expensive/intensive?) 
                }
                // console.log('Ending searchMemory', sm123, 'nodes:', nodes.length);
                if(opts.lean){
                  resolve(funcInSandbox.universe.trimSearchResults(nodes));
                } else {
                  resolve(nodes);
                }
              })
              .catch(err=>{
                console.error('Failed searching internal memory (filterNodes)', err);
                resolve({
                  error: true,
                  str: 'Failed searching internal memory (filterNodes)!',
                  err: err.toString()
                });
              })



            })
          },
          trimSearchResults: (nodes, opts)=>{

            function nodeFromNode(node){
              return {
                _id: node._id,
                nodeId: node.nodeId,
                name: node.name,
                type: node.type,
                data: node.data,
                parent: null,
                nodes: [],
                createdAt: node.createdAt,
                modifiedAt: node.modifiedAt,
              };
            }

            function updateParent(tmpNode, node){
              // get all parents, and single level of children 
              if(node.nodeId && !node.parent){
                console.error('Missing Parent for nodeId when updateParent!');
              }
              if(node.parent){
                // console.log('88: Adding parent');
                tmpNode.parent = nodeFromNode(node.parent);
                // // children for parent 
                // for(let childNode of node.parent.nodes){
                //  tmpNode.parent.nodes.push(nodeFromNode(childNode));
                // }
                updateParent(tmpNode.parent, node.parent);
              } else {
                // console.log('88: no parent');
              }
              // return tmpNode; // unnecessary, objected
            }

            function updateChildren(tmpNode, node){
              // get all children (parents are included by default) 
              if(node.nodes && node.nodes.length){
                for(let childNode of node.nodes){
                  let tmpChild = nodeFromNode(childNode);
                  tmpNode.nodes.push(tmpChild);
                  updateChildren(tmpChild, childNode);
                }
              }
              // return tmpNode; // unnecessary, objected
            }

            let returnNodes = [];

            for(let node of nodes){
              let tmpNode = nodeFromNode(node);
              updateParent(tmpNode, node);
              updateChildren(tmpNode, node);
              // siblings 
              if(node.parent && tmpNode.parent){
                for(let childNode of node.parent.nodes){
                  tmpNode.parent.nodes.push(nodeFromNode(childNode));
                }
              }
              returnNodes.push(tmpNode);
            }
            
            return returnNodes;

          },
          searchMemoryMemory: (opts) => {
            return new Promise(async (resolve, reject)=>{
              console.log('Running searchMemoryMemory');
              // resolve('universe result! ' + ob.context.tenant.dbName);
              // console.log('searchMemory1');
              opts = opts || {};
              opts.filter = opts.filter || {};
              opts.filter.sqlFilter = opts.filter.sqlFilter || {};
              opts.filter.dataFilter = opts.filter.dataFilter || {};
              // console.log('FetchNodes:', opts.filter.sqlFilter);

              // Check cache 
              if(opts.cache && (process.env.IGNORE_MEMORY_CACHE || '').toString() !== 'true'){
                if(app.globalCache.SearchFilters[opts.cache]){
                  console.log('Used cache (skipped IPC fetchNodes)');
                  return resolve(app.globalCache.SearchFilters[opts.cache]);
                } else {
                  console.log('Not cached yet:', opts.cache);
                }
              } else {
                console.log('No cache attempted, fetchingNodes');
              }

              console.log('SLOW:', opts.cache ? opts.cache:'NoCache');

              let nodes;
              try{
                nodes = await fetchNodesInMemory(opts.filter);
              }catch(err){
                return resolve({
                  err: 'shit'
                });
              }

              // console.log('NODES FOR fetchNodes:', nodes.length);
              // if(nodes && nodes.length){
              //   console.log('Node:', nodes[0]);
              // }

              // console.log('internal searchMemory result length:', nodes.length);

              // run "filterNode" after all the results are found
              if(typeof(opts.filter.filterNodes) == 'function'){
                try {
                  nodes = opts.filter.filterNodes(nodes); // may be a promise (probably is!) 
                }catch(err){
                  console.error('Failed filterNodes1', err);
                  return;
                }
              }

              Promise.resolve(nodes)
              .then(nodes=>{
                // add result to cache
                if(opts.cache){
                  app.globalCache.SearchFilters[opts.cache] = nodes;
                }

                resolve(nodes);
              })
              .catch(err=>{
                resolve({
                  error: true,
                  str: 'Failed searching internal memory (filterNodes)!',
                  err: err.toString()
                });
              })



            })
          },
          searchMemoryByIds: (opts) => {
            return new Promise(async (resolve, reject)=>{
              console.log('Running searchMemoryByIds');
              // resolve('universe result! ' + ob.context.tenant.dbName);
              // console.log('searchMemory1');
              opts = opts || {};
              opts.filter = opts.filter || {};
              opts.filter._ids = opts.filter._ids || [];
              // console.log('FetchNodes:', opts.filter.sqlFilter);

              // // Check cache 
              // if(opts.cache && (process.env.IGNORE_MEMORY_CACHE || '').toString() !== 'true'){
              //   if(app.globalCache.SearchFilters[opts.cache]){
              //     console.log('Used cache (skipped IPC fetchNodes)');
              //     return resolve(app.globalCache.SearchFilters[opts.cache]);
              //   } else {
              //     console.log('Not cached yet:', opts.cache);
              //   }
              // } else {
              //   console.log('No cache attempted, fetchingNodes');
              // }

              // console.log('SLOW:', opts.cache ? opts.cache:'NoCache');

              let nodes;
              try{
                nodes = await fetchNodesInMemoryByIds(opts.filter._ids);
              }catch(err){
                return resolve({
                  err: 'shit'
                });
              }

              Promise.resolve(nodes)
              .then(nodes=>{
                // add result to cache
                if(opts.cache){
                  app.globalCache.SearchFilters[opts.cache] = nodes;
                }

                resolve(nodes);
              })
              .catch(err=>{
                resolve({
                  error: true,
                  str: 'Failed searching internal memory (filterNodes)!',
                  err: err.toString()
                });
              })



            })
          },

          clearMemory: () => {
            // clear all the memory! (active=false) 

            return new Promise(async (resolve,reject) => {

              await app.graphql.updateAllNodes({},{active:false});

              resolve();

            });

          }

        }
      },ob.context);



      // using VM, NOT !!!!!!! NodeVM from vm2!!! (external modules NOT allowed!) 
      let vm = new VM({
        // console: 'off', //'inherit',
        console: 'inherit', //'inherit',
        sandbox: funcInSandbox, // all the passed-in context variables (node, tenant) 
        nesting: true,
        timeout: ob.timeout || (5 * 1000), //5 * 1000, // default timeout of 5 seconds 
        require: {
          // external: true,
          // [
          //   '@stdlib/stdlib', // stdlib with lots of math functions
          //   'lodash', // some basic useful functions 
          //   'luxon', // datetime with good timezone support built-in 
          //   'bigi', // big integer stuff for bitcoin
          //   'bitcoinjs-lib', // big integer stuff for bitcoin
          // ].concat(ob.requires || []), // also use passed-in libraries!
          // builtin: [],
          // root: "./",
          // mock: {
          //   fs: {
          //     readFileSync() { return 'Nice try!'; }
          //   }
          // }
        }
      });
      

      // process.on('uncaughtException', (err) => {
      //   process.send({
      //     error: true,
      //     err: 'Asynchronous error caught, uncaughtException'
      //   });
      // })

      try {
        let output = vm.run(ob.evalString);
        // process.send('OUTPUT:' + ob.evalString);
        // output could be a promise, so we just wait to resolve it (and resolving a value just returns the value :) )
        Promise.resolve(output)
        .then(data=>{
            // console.log(JSON.stringify(data));
            // process.stdout.write(JSON.stringify(
            //     data
            // ));

            // console.log('DATA3:', data);

            // should be returning a Node!
            resolve(
              data
            ); // sends up from subprocess/child

            // if(output && output.keepVM === true){
            //   // not used, always not kept (was maybe using when ob was nulled for scheduler...)
            // } else {
              output = null;
              setTimeout(()=>{
                console.log('freememory-universe');
                data = null;
                ob = null;

                // free memory here? delete the vm entirely? 
                delete funcInSandbox.universe;
                funcInSandbox = null;
                vm = null;

              },100);
            // }


            // exit();
        })
        .catch(err=>{
          console.error('---Failed in VM1!!!---- internal_server_error. --', err);
          resolve({
            type: 'internal_server_error_public_output:0.0.1:local:3298ry2398h3f',
            data: {
              error: true,
              err: 'Error in returned promise',
              str: err.toString(),
              nodeId: ob.nodeId,
              code: ob.evalString
            }
          });
        })
      }catch(err){
        console.error('---Failed in VM2!!!----', err);
        resolve({
            type: 'internal_server_error_public_output:0.0.1:local:3298ry2398h3f',
            data: {
              error: true,
              err: 'Error in code (without a Promise)',
              str: err.toString(),
              nodeId: ob.nodeId || 'Missing nodeId',
              code: ob.evalString
              // msg: err.message,
              // line: err.lineNumber,
              // stack: err.stack,
              // keys: Object.getOwnPropertyNames(err)
            }
        });
      }



      // // Async
      // // console.log('evalString:', evalString);
      // // evalString = `module.exports = function(who, callback) { callback('hello '+ who); }`;
      // let functionWithCallbackInSandbox = vm.run(ob.evalString);
      // // console.log('{"test":"test2"}');

      // functionWithCallbackInSandbox('world', (output) => {
      //   // console.log(greeting);
      //   // console.log('functionWithCallbackInSandbox! output', output);

      //   console.log('{"test":"test2"}');

      //   Promise.resolve(output)
      //   .then(data=>{
      //       console.log(JSON.stringify(data));
      //       // process.stdout.write(JSON.stringify(
      //       //     data
      //       // ));
      //   });

      // });

      // // const safeEval = require('safe-eval');

      // // console.error('Requires:', requires);

      // var vm = require('vm')
      // let required = {};
      // // for(let r of requires){
      // //     if(Array.isArray(r)){
      // //         // ['utils','../utils']
      // //         required[r[0]] = require(r[1]);
      // //     } else {
      // //         required[r] = require(r);
      // //     }
      // // }

      // function safeEval (code, context, opts) {
      //   var sandbox = {}
      //   var resultKey = 'SAFE_EVAL_' + Math.floor(Math.random() * 1000000)
      //   sandbox[resultKey] = {}
      //   code = resultKey + '=' + code
      //   if (context) {
      //     Object.keys(context).forEach(function (key) {
      //       sandbox[key] = context[key]
      //     })
      //   }
      //   vm.runInNewContext(code, sandbox, opts)
      //   return sandbox[resultKey]
      // }

      // // DO NOT console.log HERE! (it breaks the JSON parsing out the other side) 

      // // include console/logger here too?
      // // - todo
      // ob.context._ = require('lodash');
      // ob.context.lodash = ob.context._;
      // ob.context.console = console;
      // ob.context.log = console.error; // doesnt work to make this available from caller
      // ob.context.__required = required; // available as "required" to code! ...enables EVERYTHING to the process (self-control) 
      // // ob.context.__ThreadedSafeRun = ThreadedSafeRun;

      // // Add two ALWAYS ON actions: (?) 
      // // - read Node 
      // // - write Node (add vs. modify? => modify includes the Previous, and if no Previous, then _id is added. ) 


      // // console.error('Getting output');

      // // may or may not return a promise that we need to keep watching!!!
      // const output = safeEval(ob.evalString, ob.context) // might be "undefined" 
      // Promise.resolve(output)
      // .then(data=>{
      //     process.stdout.write(JSON.stringify(
      //         data
      //     ));
      // });

    // }, {evalString, context, requires, threadEventHandlers, requestId, mainIpcId, nodeId, timeout})
    // .done(async (response)=>{
    //   // throw "FUCK"

    //   if(response.error){
    //     // log error
    //     await app.graphql.newHistory({
    //       type: 'failed_code', // should be a Node type (for easier display)  
    //       logLevel: 'error',
    //       data: {
    //         response: response,
    //         nodeId,
    //         requestId
    //       }
    //     })
    //     resolve(response)

    //   } else {

    //     await app.graphql.newHistory({
    //       type: 'code_ok', // should be a Node type (for easier display)  
    //       logLevel: 'info',
    //       data: {
    //         response: response,
    //         nodeId,
    //         requestId
    //       }
    //     })
    //     resolve(response.data);
    //   }
    //   // resolve(JSON.parse(combinedOutputData));

    //   // console.log('DONEDONEDONE');
    //   // try {
    //   //   resolve(JSON.parse(combinedOutputData));
    //   // }catch(err){
    //   //   console.error('Failed parsing JSON from process:', err);
    //   //   console.error('----DATA1----');
    //   //   console.error(combinedOutputData);
    //   //   console.error('----DATA2----');
    //   // }
    // })
    // .run(data => {
    //   // done(JSON.parse(data))
    //   // console.log('Resolve ThreadedSafeRun', data); //, typeof data, data); 
    //   combinedOutputData += data;
    //   // resolve(JSON.parse(data));
    //   // throw "FUCK2"
    //   // resolve({run:'resolved'});
    // }, errData=>{
    //   console.error('Error data from NodeThread:', errData);
    //   resolve(undefined);
    // })

    // check up
    // - every tick, get pid status/consumption 
    // process.kill(-nodeThread.proc.pid);


  });
}

export default ThreadedSafeRun