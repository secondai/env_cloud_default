import { spawn } from 'child_process';

// const stdlib = require('@stdlib/stdlib');

const {VM} = require('vm2');

class NodeThread {  
  constructor(fn, ob) {
    this.nodePath = process.argv[0];
    this.origFn = fn.toString();
    this.timeout = ob.timeout;
    this.function = `(${fn.toString()}).bind(this)(JSON.parse(${JSON.stringify(JSON.stringify(ob || {}))}));`;
  }

  run(data, err) {
    this.proc = spawn(process.argv[0], ['-e', this.function], {stdio: [null, null, null, 'ipc']}); // , {env:{}}
    this.proc.stdout.setEncoding('utf8');
    // this.proc.stdout.on('data', data || (() => { }));
    // this.proc.stdout.on('data', (() => { }));

    // // guess I need to keep stderr out...want to get logging working somehow! 
    // // - or is this what is tripping the actual return right now?? the exit() is throwing!?
    // this.proc.stderr.setEncoding('utf8');
    // this.proc.stderr.on('data', this.done || (() => { }));
    this.proc.on('message', response=>{
      (this.done || (() => { }))(response); // pass of to function
      this.done = undefined; // kill done (so timeout doesnt call it)
    });

    // this.proc.on('close', this.done || (() => { }));
    // this.proc.on('disconnect', this.done || (() => { }));
    // this.proc.on('error', this.done || (() => { }));
    // this.proc.on('exit', this.done || (() => { }));

    // // why does the process not just stop automatically!?!?!?
    // // - really frustrating that none of the "close" events seems to function when using a Promise in the output :( 
    // // - using this shitty timeout in the meantime, not tenable 
    setTimeout(()=>{
      if(this.done){
        // this.proc.kill();
        this.done({
          error: true,
          err: 'TIMEOUT1'
        });
      }
      this.done = undefined;
      // console.error("Had to Kill process, never stopped");//, this.origFn);
      // this.proc.kill();
    }, this.timeout || 15 * 1000); // this TIMEOUT is for the GLOBAL! 

    return this;
  }

  done(func) {
    this.done = func;
    return this;
  }
}



const ThreadedSafeRun = (evalString, context = {}, requires = [], threadEventHandlers, requestId, mainIpcId, nodeId, timeout) => {
  return new Promise((resolve, reject)=>{

    // console.log('starting ThreadedSafeRun (cannot console.log inside there/here (when run in a sandbox!)!)');

    let combinedOutputData = '';
    let nodeThread = new NodeThread((ob) => {

      // console.log('{"test":"test"}');

      let ThreadedSafeRun;
      try {
        require("babel-register");
        ThreadedSafeRun = require('./src/utils/threaded_safe_run').default;
      }catch(err){
        return console.log(`"Error:${err.toString()}"`);
      }
      // return;

      const events = require('events');
      let eventEmitter = new events.EventEmitter();

      // let runSafe = require('./src/utils/run_safe');

      const { VM } = require('vm2');

      const request = require('request-promise-native');

      // add loadSchema() function for handling requests for schemas 
      // - also "validate schema" using type and data 

      const uuidv4 = require('uuid/v4');
      const ipc = require('node-ipc');
      let ipcId = 'second-worker-' + uuidv4();
      ipc.config.id = ipcId;
      ipc.config.retry = 1500;
      // ipc.config.sync= true; // do NOT have sync on! otherwise everything queues up, which sucks! 
      // ipc.config.maxConnections = 1; // doesnt work when set here!
      ipc.config.logger = ()=>{}

      ipc.connectTo(ob.mainIpcId, () => { // ipc.config.socketRoot + ipc.config.appspace + ipcId
        ipc.of[ob.mainIpcId].on(
            'response',
            function(data){
              // ipc.log('got a message from world : ', data);
              // console.log('"REPONSE FROM WORLD"');
              eventEmitter.emit('response',data);
            }
        );
      })

      const fetchNodes = (filterOpts) => {

        return new Promise(async (resolve, reject) => {
          // resolve('REULT FROM fetchNodes!');
          // // emit "fetch" command to main brain 
          //  - no callback, so listen in a different way 
          // - everything in universe should be done through ipc??
          // ipc.connectTo('second-main', () => {
            let nextIpcId = uuidv4()
            // ipc.of['second-main'].on('connect', () => {

              eventEmitter.on('response', r=>{
                if(r.id != nextIpcId){
                  // skipping if not this event emitted for
                  return;
                }

                // resolve('RESULT FROM fetchNodes, after ipc command and response2!');
                resolve(r.data);

              })

              ipc.of[ob.mainIpcId].emit('command', {
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
        ipc.of[ob.mainIpcId].emit('command', commandOpts);

      }

      const lodash = require('lodash');
      
      let funcInSandbox = Object.assign({
        universe: {
          lodash,
          required, // "requires" libs
          rsa: require('node-rsa'),
          webrequest: request, // use similar to request-promise: https://www.npmjs.com/package/request-promise
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

            });

          },

          runNodeCodeInVM: (opts) => {
            return new Promise(async (resolve, reject)=>{

              // Runs in ThreadedVM 
              // - putting this here means it PROBABLY won't have all the context we'd hope for

              // should validate code/schema too? 

              let code = opts.codeNode.data.code;

              let datetime = (new Date());

              setupIpcWatcher({
                command: 'ThreadedSafeRun',
                code: code,
                SELF: opts.codeNode,
                INPUT: opts.dataNode,
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
                  str: 'Failed searching remote memory (filterNodes)!',
                  err: err.toString()
                });
              })

            })
          }
        }
      },ob.context);



      // using VM, NOT !!!!!!! NodeVM from vm2!!! (external modules NOT allowed!) 
      const vm = new VM({
        console: 'off', //'inherit',
        sandbox: funcInSandbox, // all the passed-in context variables (node, tenant) 
        nesting: true,
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
      

      process.on('uncaughtException', (err) => {
        process.send({
          error: true,
          err: 'Asynchronous error caught, uncaughtException'
        });
      })

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
            process.send({
              error: false,
              data
            }); // sends up from subprocess/child
            // exit();
        })
        .catch(err=>{
          process.send({
            error: true,
            err: 'Error in returned promise',
            str: err.toString(),
            nodeId: ob.nodeId,
            code: ob.evalString
          });
        })
      }catch(err){
        process.send({
          error: true,
          err: 'Error in code (without a Promise)',
          str: err.toString(),
          nodeId: ob.nodeId || 'Missing nodeId',
          code: ob.evalString
          // msg: err.message,
          // line: err.lineNumber,
          // stack: err.stack,
          // keys: Object.getOwnPropertyNames(err)
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

    }, {evalString, context, requires, threadEventHandlers, requestId, mainIpcId, nodeId, timeout})
    .done(async (response)=>{
      // throw "FUCK"

      if(response.error){
        // log error
        await app.graphql.newHistory({
          type: 'failed_code', // should be a Node type (for easier display)  
          logLevel: 'error',
          data: {
            response: response,
            nodeId,
            requestId
          }
        })
        resolve(response)

      } else {

        await app.graphql.newHistory({
          type: 'code_ok', // should be a Node type (for easier display)  
          logLevel: 'info',
          data: {
            response: response,
            nodeId,
            requestId
          }
        })
        resolve(response.data);
      }
      // resolve(JSON.parse(combinedOutputData));

      // console.log('DONEDONEDONE');
      // try {
      //   resolve(JSON.parse(combinedOutputData));
      // }catch(err){
      //   console.error('Failed parsing JSON from process:', err);
      //   console.error('----DATA1----');
      //   console.error(combinedOutputData);
      //   console.error('----DATA2----');
      // }
    })
    .run(data => {
      // done(JSON.parse(data))
      // console.log('Resolve ThreadedSafeRun', data); //, typeof data, data); 
      combinedOutputData += data;
      // resolve(JSON.parse(data));
      // throw "FUCK2"
      // resolve({run:'resolved'});
    }, errData=>{
      console.error('Error data from NodeThread:', errData);
      resolve(undefined);
    })

    // check up
    // - every tick, get pid status/consumption 
    // process.kill(-nodeThread.proc.pid);


  });
}

export default ThreadedSafeRun