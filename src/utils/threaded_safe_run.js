import { spawn } from 'child_process';

import bigi from 'bigi'
import bitcoin from 'bitcoinjs-lib'

// const stdlib = require('@stdlib/stdlib');

const {VM} = require('vm2');

const ThreadedSafeRun = (evalString, context = {}, requires = [], threadEventHandlers, requestId, mainIpcId, nodeId, timeout) => {
  return new Promise((resolve, reject)=>{

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

      const request = require('request-promise-native');

      const stringSimilarity = require('string-similarity');

      // add loadSchema() function for handling requests for schemas 
      // - also "validate schema" using type and data 

      const crypto = require('crypto');
      var CryptoJS = require("crypto-js");

      const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '2k3jfh2jkh32cn983ucr892nuv982v93'; // Must be 256 bytes (32 characters)
      const IV_LENGTH = 16; // For AES, this is always 16

       

      const uuidv4 = require('uuid/v4');
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

        return new Promise(async (resolve, reject) => {
          // resolve('REULT FROM fetchNodes!');
          // // emit "fetch" command to main brain 
          //  - no callback, so listen in a different way 
          // - everything in universe should be done through ipc??
          // ipc.connectTo('second-main', () => {
            let nextIpcId = uuidv4()
            // ipc.of['second-main'].on('connect', () => {


              let fetchnodesStart = (new Date()).getTime();

              eventEmitter.on('response', r=>{
                if(r.id != nextIpcId){
                  // skipping if not this event emitted for
                  return;
                }

                let fetchnodesEnd = (new Date()).getTime();
                let fetchnodesTime = (fetchnodesEnd - fetchnodesStart);
                console.log('fetchnodesTime:', fetchnodesTime);


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

        eventEmitter.on('response', r=>{
          // return resolve('FUCK5');
          if(r.id != nextIpcId){
            // skipping if not this event emitted for
            return;
          }
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

      const getPrivateIdentity = () => {
        return new Promise(async (resolve, reject)=>{

          let nodes;
          try{
            nodes = await fetchNodes({
              nodeId: null,
              type: 'identity_private:0.0.1:local:3298f2j398233'
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
      
      app.globalCache = app.globalCache || {};

      let funcInSandbox = Object.assign({
        universe: {
          env: process.env, // just allow all environment variables to be accessed 
          console,
          lodash,
          required, // "requires" libs
          jsSchema,
          rsa,
          bitcoin,
          bigi,
          uuidv4,
          stringSimilarity,
          aws: app.aws,
          globalCache: app.globalCache,
          webrequest: request, // use similar to request-promise: https://www.npmjs.com/package/request-promise

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

          getIdentityForAddress: (address)=>{
            return new Promise(async (resolve, reject)=>{
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
          createAddressForIdentity: (words, publicKey, connection)=>{
            return new Promise(async (resolve, reject)=>{
              // fetches 1st bitcoin transaction for wallet address 
              // - uses decoded first transaction as an IPFS link 
              // - link: https://github.com/ipfs/js-ipfs/tree/master/examples/ipfs-101
              // - ipfs pinning service: https://www.eternum.io (with an API) 

              // currently just using "language" server! (not on bitcoin/ipfs while testing) 

              // notice, using docker.for.mac.localhost !!! (temporary)

              console.log('createAddressForIdentity');

              // Create IPFS values (ExternalIdentityNode as JSON) 
              // - external_identity:0.0.1:local:8982f982j92 
              //   - publicKey
              // - external_identity_connect_method:0.0.1:local:382989239hsdfmn
              //   - method: 'http'
              //   - connection: http://*.second.com/ai 
              let ExternalIdentityNode = JSON.stringify(JSON.stringify({
                type: 'external_identity:0.0.1:local:8982f982j92',
                data: {
                  publicKey
                },
                nodes: [{
                  type: 'external_identity_connect_method:0.0.1:local:382989239hsdfmn',
                  data: {
                    method: 'http',
                    connection
                  }
                }]
              }));

              console.log({
                words, 
                publicKey, 
                connection,
                ExternalIdentityNode
              });

              // add to ipfs (todo) 
              let ipfsHash = uuidv4();

              let ipfsReqData = JSON.parse('{"operationName":null,"variables":{"hash":"'+ipfsHash+'","text":'+ExternalIdentityNode+'},"query":"mutation ($hash: String    $text: String) {  ipfsFileCreate(record: {hash: $hash   text: $text}) {    recordId    __typename  }}"}');

              console.log('ipfsReqData:',ipfsReqData);

              let ipfsResult = await request.post({
                method: 'post',
                url: process.env.LANGUAGE_SERVER, //'http://docker.for.mac.localhost:7011/graphql',
                body: ipfsReqData,
                json: true
              })

              console.log('ipfs text:', ipfsResult.data.ipfsFileCreate.recordId);

              if(!ipfsResult.data.ipfsFileCreate.recordId){
                console.error('Failed ipfs');
                return reject();
              }

              // resolve({
              //   CREATED: true,
              //   ipfsResult
              // })

              // // Add IPFS hash to Bitcoin ledger (must be first transaction, otherwise should fail!) 

              // add to ipfs (todo)

              // transform to "string[space]string[space]string[space]" format 
              words = lodash.compact(words.split(' ')).join(' ').split('"').join('').split("'").join('');
              // transform to wallet address 
              var hash = bitcoin.crypto.sha256(words)
              console.log('hash:', hash);
              var d = bigi.fromBuffer(hash)
              console.log('d:', d);
              var keyPair = new bitcoin.ECPair(d)
              var address = keyPair.getAddress()
              console.log('Remote Second Wallet Address', address);

              let transactionsVal = JSON.stringify([{
                txId: uuidv4(),
                text: ipfsHash
              }]);

              let walletReqData = JSON.parse('{"operationName":null,"variables":{"address":"'+address+'","transactions":'+transactionsVal+'},"query":"mutation ($address: String    $transactions: [WalletsWalletsTransactionsInput]) {  walletCreate(record: {address: $address   transactions: $transactions}) {    recordId    __typename  }}"}');

              let walletResult = await request.post({
                method: 'post',
                url: process.env.LANGUAGE_SERVER, 
                body: walletReqData,
                json: true
              })

              console.log('wallet create result:', walletResult);

              try {

                if(!walletResult.data.walletCreate.recordId){
                  console.error('Failed ipfs');
                  return reject();
                }

                return resolve({
                  type: 'boolean:..',
                  data: true
                }); 
              }catch(err){
                // might have already created wallet entry, error, but continue for now...
                console.error('WALLET DUPLICATE!!!!');
                return resolve({
                  type: 'boolean:..',
                  data: true
                });
              }

              // let walletReqData = JSON.parse('{"operationName":null,"variables":{"address":"'+address+'"},"query":"query ($address: String) {  walletOne(filter: {address: $address}) {    _id    address    transactions { txId   text }    createdAt    updatedAt    __typename  }}"}');

              // let walletResult = await request.post({
              //   method: 'post',
              //   url: process.env.LANGUAGE_SERVER, 
              //   body: walletReqData,
              //   json: true
              // })

              // // Now get ipfs info 
              // // - todo, using language server still
              // let hash = walletResult.data.walletOne.transactions[0].text; // first result in transaction list 





              // // Now get ipfs info 
              // // - todo, using language server still
              // console.log('ipfs text:', ipfsResult.data.ipfsFileOne.text, typeof ipfsResult.data.ipfsFileOne.text);
              // // window.xx = ipfsResult.data.ipfsFileOne.text;

              // let node;
              // if(lodash.isString(ipfsResult.data.ipfsFileOne.text)){
              //   node = JSON.parse(ipfsResult.data.ipfsFileOne.text);
              // } else {
              //   node = ipfsResult.data.ipfsFileOne.text;
              // }

              // resolve(node);


            })
          },


          TalkToSecond: ({ExternalIdentityNode, InputNode}) => {
            return new Promise(async (resolve, reject) => {

              // make a request (assuming http for now) to an external Second 
              // - could also be local/on-page? 

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

              // Returns the Node for the capability specified
              let capabilityNodes = await funcInSandbox.universe.searchMemory({
                filter: {
                  sqlFilter: {
                    type: "capability:0.0.1:local:187h78h23",
                    nodeId: null, // top-level/root,
                    data: {
                      key: nameSemver // todo: semver with version!
                    }
                  },
                  // filterNodes: tmpNodes=>{
                  //   return new Promise((resolve, reject)=>{
                  //     // tmpNodes = tmpNodes.filter(tmpNode=>{
                  //     //   return tmpNode.data.method == 'read';
                  //     // })
                  //     resolve(tmpNodes);
                  //   });
                  // },
                }
              });
              // capabilityNodes = universe.lodash.sortBy(capabilityNodes,capNode=>{
              //   let orderNode = universe.lodash.find(capNode.nodes, {type: 'order_level:0.0.1:local:382hf273'});
              //   return orderNode ? orderNode.data.level:0;
              // });

              if(!capabilityNodes || !capabilityNodes.length){
                console.error('Unable to find capability!', nameSemver);

                let allNodes = await funcInSandbox.universe.searchMemory({});
                console.error('here',nameSemver, allNodes);
                debugger;

                return reject();
              }

              if(capabilityNodes.length > 1){
                console.error('TOO MANY capability nodes!');
                return reject();
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

          newNode: (node) => {
            return new Promise(async (resolve, reject)=>{

              // Runs in ThreadedVM 
              // - putting this here means it PROBABLY won't have all the context we'd hope for

              // should validate code/schema too? 

              setupIpcWatcher({
                  command: 'newNode', // whole thing for now
                  node
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
          
          updateNode: (node) => {
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
                  node
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

              try {

                let code = opts.codeNode.data.code;


                let datetime = (new Date());

                setupIpcWatcher({
                  command: 'ThreadedSafeRun',
                  code: code,
                  SELF: opts.codeNode,
                  INPUT: opts.dataNode || opts.inputNode,
                  requestId: ob.requestId, // from ob.context!!
                  mainIpcId: ob.mainIpcId,
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
              // resolve('universe result! ' + ob.context.tenant.dbName);
              opts = opts || {};
              opts.filter = opts.filter || {};
              opts.filter.sqlFilter = opts.filter.sqlFilter || {};

              let nodes;
              try{
                nodes = await fetchNodes(opts.filter.sqlFilter);
              }catch(err){
                return resolve({
                  err: 'shit'
                });
              }

              // console.log('NODES FOR fetchNodes:', nodes.length);
              // if(nodes && nodes.length){
              //   console.log('Node:', nodes[0]);
              // }

              // run "filterNode" after all the results are found
              if(typeof(opts.filter.filterNodes) == 'function'){
                nodes = opts.filter.filterNodes(nodes); // may be a promise (probably is!) 
              }

              Promise.resolve(nodes)
              .then(nodes=>{
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
      const vm = new VM({
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

            output = null;
            setTimeout(()=>{
              data = null;
              ob = null;
            },100);

            // exit();
        })
        .catch(err=>{
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
        console.error('---Failed in VM2!!!----');
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