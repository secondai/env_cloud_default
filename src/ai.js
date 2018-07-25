
import { spawn } from 'child_process';

import bigi from 'bigi'
import bitcoin from 'bitcoinjs-lib'


import request from 'request-promise-native'


// const stdlib = require('@stdlib/stdlib');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

const {VM} = require('vm2');

import _ from 'lodash'

import path from 'path'

// import {PluginManager} from "live-plugin-manager";
// const pluginManager = new PluginManager();
// async function runPlugins() {
//   await pluginManager.install("moment");

//   const moment = pluginManager.require("moment");
//   console.log(moment().format());

//   await pluginManager.uninstall("moment");
// }
// runPlugins();

var cacheManager = require('cache-manager');

const parseGitHubUrl = require('parse-github-url');
const JSZip = require('jszip');
// const JSZipUtils = require('jszip-utils');
let lodash = _;
require("underscore-query")(lodash);

let cJSON = require('circular-json');

let ZipNodes = []; // will be populated to match BASIC_NODES.xyz


const {
  performance
} = require('perf_hooks');

var npm = require('npm-programmatic');
let installedPackages = {};

let requestsCache = {};

const uuidv4 = require('uuid/v4');
const events = require('events');
let eventEmitter = new events.EventEmitter();
App.eventEmitter = eventEmitter;

// Keep nodes in memory for easy access!
// - rebuilds on changes, etc. 
App.nodesDb = [];
App.nodesDbParsed = []; // gets frozen!
App.nodesDbParsedIds = {}; // _ids ref to App.nodesDbParsed object

// for creating a group of VMs that are processing things in parallel 
// - the group name is passed in, as well as the amount to allow at a time 
var queue = require('queue')
let parallelVMs = {};

// Create Second 
// - handle inputs 

let secondReadyResolve;
const secondReady = new Promise(resolve=>{
  secondReadyResolve = resolve;
  // resolve(); // todo: build if not ready! 
});

class Second {
	constructor(){

		console.log('Second constructor!');

		this.startup = this.startup.bind(this);
		this.runRequest = this.runRequest.bind(this);

		this.startup();

	}
	async startup(){

		// Get existing Nodes in memory 
		// - create a new memory if none exists! 
		console.log('Second startup!');

  	secondReadyResolve(); //


    // fetch and run code, pass in 
    let nodesInMemory = await App.graphql.fetchNodesSimple();

		App.nodesDb = nodesInMemory;
    console.log('NodesDb populated!', App.nodesDb.length);
		await App.utils.nodesDbParser();
		// console.log('App.nodesDbParsed updated', App.nodesDbParsed.length);
    // console.log('Nodes:', nodesInMemory.length);
    let totalNodes = 0;
    if(!nodesInMemory.length && nodesInMemory.length === 0){
    	console.log('Missing Nodes in Memory!! Loading default nodes:'); //, BASIC_NODES[process.env.STARTUP_BASE].length);

    	// todo: should have a trigger for loading a new memory, maybe dont do it automatically? 

    	if(!process.env.BASICS_ZIP_URL){
    		console.error('Missing BASICS_ZIP_URL environment variable');
    		return false;
    	}

    	if(process.env.DISABLE_FULL_LEARN == 'true'){
	    	console.error('--Disabled BASICS_ZIP_URL--');
	    	return false;
	    }


    	// Loading default nodes!
      const saveChildNodes = (nodeId, childNodes) => {
        return new Promise(async (resolve, reject)=>{
          
          for(let tmpNode of childNodes){
            let newChildNode = {
            	name: tmpNode.name,
              nodeId,
              type: tmpNode.type,
              data: tmpNode.data,
            }
            totalNodes++;
						let savedChildNode = await App.graphql.newNode(newChildNode);

            if(tmpNode.nodes && tmpNode.nodes.length){

              await saveChildNodes(savedChildNode._id, tmpNode.nodes);

            }
          }
          resolve();
        });
      }

      // use nodes from zip 
      let zipResult;
      try {
      	zipResult = await loadRemoteZip(process.env.BASICS_ZIP_URL);
      }catch(err){
      	console.error('Failed loadRemoteZip startup', err);
      	return false;
      }
      for(let node of zipResult.nodes){ 
      	totalNodes++;
      	let savedNode = await App.graphql.newNode(node);
        await saveChildNodes(savedNode._id, node.nodes);
      }

			// Update memory!
	    App.nodesDb = await App.graphql.fetchNodesSimple();
			await App.utils.nodesDbParser();

      console.log('Inserted Nodes! Total:', totalNodes); //, ' Root:', BASIC_NODES[process.env.STARTUP_BASE].length);

			// Now trigger "first" action 

      // Get ExternalIdentity Node for first request (MUST exist?) 
      // - storing internally, then removing and re-adding in the "learn" step 
    	let externalIdentityNodes = await App.graphql.fetchNodes({
    		type: 'external_identity:0.0.1:local:8982f982j92'
    	});

    	let externalIdentityNode = externalIdentityNodes.length ? externalIdentityNodes[0]:null;

      if(!externalIdentityNode){
        console.error('Missing ExternalIdentity on startup (this is ok in the cloud)');
        // return false;
      }

      // run "first" action
      // - only ever run once 
      let firstResponse = await this.runRequest({
        type: 'incoming_first:0.1.1:local:78882h37',
        data: externalIdentityNode // arrives as INPUT
      }, true)

      console.log('firstResponse', firstResponse);

    }

    // run "startup" action
    // - initiates server, heartbeat/cron 
    let startupResponse = await this.runRequest({
      type: 'incoming_startup_everything:Qmf3289h9293fhsb',
      data: {} // arrives as INPUT
    }, true)

    console.log('StartupResponse:', startupResponse);

	}

	runRequest(InputNode, skipWrappingInputNode, reqObj, resObj, wsClientId, socketioResponseFunc){

		// Run an "external" request (from outside the universe, goes to "incoming_from_uni" for the default App) 
    return new Promise((resolve, reject)=>{

			let thisRequestId = uuidv4();
			requestsCache[thisRequestId] = {
				keyvalue: {},
				stack: [],
				res: resObj,
				req: reqObj,
				wsClientId,
				socketioResponseFunc
			};

			// clear request cache after 30 seconds 
			// - should just do on completion? 
			setTimeout(()=>{
				console.log('freememory-requestscache');
				delete requestsCache[thisRequestId];
			}, 30 * 1000);

      secondReady.then(async ()=>{
        console.log('Running incoming request (expecting express_obj, websocket_obj):', InputNode.type); //, this.state.nodesDb);

        // fetch and run code, pass in 
        // - using a specific "app_base" that is at the root 
        //   - defined by appId: "a22a4864-773d-4b0b-bf69-0b2c0bc7f3e0" 
        // - platform_nodes.data.platform = 'cloud' 

        let nodes,
        	nodeId,
        	UniverseInputNode,
        	CodeNode,
        	foundIncomingNode;


        // cache starting point 
	      App.globalCache = App.globalCache || {};
	      App.globalCache.SearchFilters = App.globalCache.SearchFilters || {};

	      App.memoryCache = cacheManager.caching({
	      	store: 'memory',
	      	max: 100,
	      	ttl: 10 // seconds
	      });


	      if(App.globalCache.SearchFilters[ 'incoming_from_universe:CodeNode' ] && (process.env.IGNORE_MEMORY_CACHE || '').toString() != 'true'){
	      	console.log('Using cached incoming_from_universe');
	        nodeId = App.globalCache.SearchFilters[ 'incoming_from_universe:nodeId' ];
	      	CodeNode = App.globalCache.SearchFilters[ 'incoming_from_universe:CodeNode' ];
	      } else {

	        nodes = await App.graphql.fetchNodes({
	          // type: ((process.env.OLD_INCOMING || '').toString() == 'true') ? 'incoming_from_universe:0.0.1:local:298fj293':'incoming_from_uni:Qmsldfj2f'
	          type: 'incoming_from_uni:Qmsldfj2f',
	          // type: 'incoming_from_uni:Qmsldfj2f'
	        });

	        // console.log('NODES:', nodes);
	        if(!nodes || !nodes.length){
	          // console.error('Missing incoming_from_universe:0.0.1:local:298fj293 Node');
	          console.error('Missing incoming_from_uni:Qmsldfj2f');
	          return;
	        }

	        // find correct node for appId
	        // console.log('NODES matching incoming_from_universe:', nodes.length);
	        foundIncomingNode = nodes.find(node=>{
	        	try {
		        	let parent = node.parent;
		        	if(parent.type.split(':')[0] == 'platform_nodes' && parent.data.platform == process.env.DEFAULT_LAUNCH_PLATFORM){
		        		
			        	let appbaseParent = parent.parent;
			        	if(appbaseParent.type.split(':')[0] == 'app_base' && 
			        		appbaseParent.data.appId == (process.env.DEFAULT_LAUNCH_APPID || 'cloud_appstore') &&
			        		appbaseParent.data.release == 'production'
			        		){
			        		// console.log('Found app_base for incoming_from_universe');
			        		return true;
			        	}
			        }
		        }catch(err){}
	        	return false;
	        });
	        


	        if(!foundIncomingNode){
	        	console.error('Missing foundIncomingNode (DEFAULT_LAUNCH_PLATFORM and DEFAULT_LAUNCH_APPID must exist)');
	        	return false;
	        }

	        nodeId = foundIncomingNode._id;
	        CodeNode = _.find(foundIncomingNode.nodes,{type: 'code:0.0.1:local:32498h32f2'});

	        // Get parent/nodes chain of CodeNode (for app_base) 
	        // - requires rebuild
	        let tmpCodeNodeWithParents = await App.graphql.fetchNodes({
	          _id: CodeNode._id
	        });
	        CodeNode = tmpCodeNodeWithParents[0];

	        if(!CodeNode){
	          console.error('Missing code:0.0.1:local:32498h32f2 in app a22a4864-773d-4b0b-bf69-0b2c0bc7f3e0 to handle incoming_web_request');
	          return;
	        }

	        // cache default CodeNode 
	        App.globalCache.SearchFilters[ 'incoming_from_universe:nodeId' ] = nodeId;
	        App.globalCache.SearchFilters[ 'incoming_from_universe:CodeNode' ] = CodeNode;

	      }

        // console.log('Got CodeNode', CodeNode._id); //, CodeNode.data.key);

        UniverseInputNode = {};

        if(skipWrappingInputNode){
          UniverseInputNode = InputNode;
        } else {
          UniverseInputNode = {
            type: 'incoming_web_request:0.0.1:local:29832398h4723',
            data: InputNode // type:express_obj
          }
        }

	      // Set context
	      let safeContext = {
	        SELF: CodeNode, 
	        INPUT: UniverseInputNode, // this is NOT validated at this step, cuz we are just passing in a Node (type, data) that I can decide how to handle. Ideally the passed-in schema types includes:  (inputData, outputFormat/info)
	      }
	      let threadEventHandlers = {};

	      // tempary test of requires 
	      let requires = [
	      	// 'vm2',
	      	// '@stdlib/stdlib',
	      	'lodash'
	      ];

	      // this is NOT limited 
	      // - let the brain handle responses! 
	      // - potentially the brain could install software that watches this and prevents more attacks, but doesn't need to be built-in 
	      let safedData;
	      // console.log('thisRequestId1:', thisRequestId);
	      try {
		      safedData = await runSafe({ 
		      	code: CodeNode.data.code, 
		      	safeContext, 
		      	requires, 
		      	threadEventHandlers, 
		      	requestId: thisRequestId, 
		      	mainIpcId: null, // from top of file
		      	nodeId, 
		      	timeout: 20 * 1000 
		     	})
		    }catch(err){
		    	console.error('Failed safedData for external request:', err);
		    	safedData = {
		    		type: 'err:2390',
		    		data: {
		    			msg: 'Failed safedData',
		    			err,
		    			errStr: (err && err.toString) ? err.toString():err // might be undefined!
		    		}
		    	}
		    }

		    return resolve(safedData);

      })

    });

	}
}

let MySecond = new Second();

let __parsedFiles = {};
function jsonParse(key, contents){
  if(__parsedFiles[key]){
    return __parsedFiles[key]
  }

  __parsedFiles[key] = JSON.parse(contents);
  return __parsedFiles[key];

}

const loadRemoteZip = (url) => {

  // Loads nodes from github 

  return new Promise((resolve,reject)=>{



	  console.log('startupZipUrl1:', url);

	  // converts startup git url into username/password 
	  // - eventually allow links to be pasted, parse accordingly 

	  // parse github links and re-organize to fit .zip model 

	  let gh = parseGitHubUrl(url);
	  if(gh.owner && 
	    gh.name && 
	    gh.repo && 
	    gh.branch){
	    url = `https://github.com/${gh.repo}/archive/${gh.branch}.zip`;
	  }

	  console.log('URL:', url);

	  request({
	    url,
	    encoding: null
	  })
	  // .then(response=>{
	  //   // return response.arrayBuffer();
	  //   console.log('Got .zip response', response.length);
	  //   return response;
	  // })
	  .then(JSZip.loadAsync)
	  .then(async (zip)=>{
	    console.log('loaded zip data!'); //, zip);

	    // ZIP is valid! 
	    let files = zip.files;

	    function readFilePath(p){
	      return new Promise(async (resolve,reject)=>{
	        console.log('path:', p);
	        let r = await files[p].async('text')
	        resolve(r);
	      });
	    }

	    // load all the files 
	    let allFiles = {};
	    for(let filepath of Object.keys(files)){
	      let file = files[filepath];
	      if(file.dir){

	      } else {
	        // console.log('filepath:', filepath);
	        let contents = await readFilePath(filepath);
	        // console.log('contents:', contents);
	        let normalizedPath = filepath.split('/').splice(1).join('/');
	        allFiles[normalizedPath] = contents;
	      }
	    }

	    // console.log('allFiles from Zip:', allFiles);
	    
	    // function addChildren(id){
	    //   return new Promise(async (resolve,reject)=>{

	    //     let nodes = [];

	    //     for(let filepath of Object.keys(allFiles)){
	    //       let contents = allFiles[filepath];
	    //       if(filepath.indexOf('nodes/') !== 0){
	    //         // console.log('NOT NODE:', filepath);
	    //         continue;
	    //       }

	    //       let parsed = jsonParse(filepath, contents);
	    //       if(parsed.nodeId == id){
	    //         // console.log('Matches ID:', parsed.nodeId, id);
	    //         let children = await addChildren(parsed._id);
	    //         parsed.nodes = children;
	    //         nodes.push(parsed);
	    //       } else {
	    //         // console.log('No Kids:', id, parsed.nodeId);
	    //       }

	    //     }

	    //     resolve(nodes);

	    //   });
	    // }

      function addChildren(path){
        return new Promise(async (resolve,reject)=>{
        
          let nodes = [];
          try {
              
            for(let filepath of Object.keys(allFiles)){
              let contents = allFiles[filepath];
              if(filepath.indexOf(path) !== 0){
                // console.log('NOT NODE:', filepath);
                continue;
              }
              let pathDepth = path.split('/').length;
              let filepathDepth = filepath.split('/').length;
              if(pathDepth == filepathDepth){
                // xyz.json at correct depth
                
                let parsed = jsonParse(filepath, contents);
                // if(parsed.nodeId == id){
                  // console.log('Matches ID:', parsed.nodeId, id);
                  let children = await addChildren(filepath.slice(0, filepath.length - 5) + '/'); // remove '.json'
                  parsed.nodes = children;
                  nodes.push(parsed);
                // } else {
                //   // console.log('No Kids:', id, parsed.nodeId);
                // }
              }


            }
          }catch(err){
            console.error(err);
          }

          resolve(nodes);
          
        });
      }

	    // re-organize child nodes 
	    ZipNodes = await addChildren('nodes/'); // start at root, adds children recursively 

	    let secondJson = JSON.parse(allFiles['second.json']);
	    // let basicKey = secondJson.name; 

	    console.log('Resolved all!', ZipNodes.length);
	    resolve({
	    	nodes: ZipNodes,
	    	config: secondJson
	    });

		});

	});

}


const incomingAIRequest = ({ req, res }) => {

	return new Promise(async (resolve, reject)=>{

		// Immediately pass off "incomingAIRequest" to a function 
		// - essentially, "find the Subject w/ PointerType incomingAIRequest and pass in the data, running in_sandbox" 
		// - only have two functions available by default: in_sandbox (respects whatever rules you have), out_sandbox (makes a command line request, uses a common schema) 
		//   - are they just available "Actions" ?? 

		// use a consistent mechanism (that lives as an Action) for running "additional Actions" 
		// - Actions can be called from any function (right?) 
		//   - the routing can handle 


		// Start the AI 
		// - incoming Request is added as new data? 
		// - the new data is acted on? 

		// Passing in the action+data to the AI? 
		// - the environment parses the action+data, and passes that in accordingly? 
		// - or just passing in a blob of data, and allowing the AI to processes that?? (that would be a specific schema I suppose?) 

		// Find first Node with type: "incoming_web_request:0.0.1:local:29832398h4723" (different from a websocket request!) 
		// - the data contains code. Create a VM for the code in that data, pass in the req.body information according to the Schema! 
		//   - the req.body is expected to be in the correct format for hanlding a web request! 

		// var blockexplorer = require('blockchain.info/blockexplorer').usingNetwork(5)

		// create "request object" 
		// - keeping a cache of "things in this request" (such as auth, etc.) 
		// // - session, etc? 
		// let thisRequestId = uuidv4();
		// requestsCache[thisRequestId] = {
		// 	keyvalue: {},
		// 	stack: []
		// };

		// req.body SHOULD be a node! 
		// - todo: should validate schema 
		let response;
		if((process.env.OLD_INCOMING || '').toString() == 'true'){
			console.log('OLD_INCOMING, req.body');
			response = await MySecond.runRequest(req.body, false, req, res);

			return resolve({
				secondResponse: {
					type: 'output_generic:0.0.1:local:239f2382fj2983f',
					data: response
				}
			});

		} else {
			// console.log('NEW_INCOMING');
			response = await MySecond.runRequest({
				type: 'express_obj:Qmdsfkljsl',
				data: {
					req // convert using circular-json when stringifying 
				}
			}, false, req, res);
		}


		if(!response){
			console.error('Invalid response, null!');
			return false;
		}

	});

}


const incomingAIRequestSocketIO = ({ type, data, clientId, responseFunc }) => {

	return new Promise(async (resolve, reject)=>{

		console.log('Running incomingAIRequestSocketIO');

		await MySecond.runRequest({
			type: 'socketio_obj:Qmdsfkljsl29',
			data: {
				type, // connection, message, close  // TODO? request (response is handled by the requesting function) 
				data, // the data for the message (null for connection, close) 
				clientId, // for sending responses via App.wsClients[clientId].socket.send(...) 
			}
		}, false, null, null, clientId, responseFunc);

	});

}

const incomingAIRequestWebsocket = ({ type, msg, clientId }) => {

	return new Promise(async (resolve, reject)=>{

		console.log('Running incomingAIRequestWebsocket (OLDOLDOLD)');

		return false;

		await MySecond.runRequest({
			type: 'websocket_obj:Qmdsfkljsl29',
			data: {
				type, // connection, message, close  // TODO? request (response is handled by the requesting function) 
				msg, // the data for the message (null for connection, close) 
				clientId // for sending responses via App.wsClients[clientId].ws.send(...) 
			}
		}, false, null, null, clientId);

	});

}



// Events (usually from inside a codeNode) 
eventEmitter.on('command',async (message, socket) => {

	let savedNode,
		savedNodeCopy;

  let nodes,
  	nodeInMemoryIdx,
  	nodeInMemory;

	let sqlFilter,
		dataFilter,
		rootNodeFilter,
		searchPath;

	let useDataFilter,
		useSqlFilter;



	async function removeNodeAndChildren(nodeId){

		let nodeInMemory = App.nodesDbParsedIds[nodeId];

		if(!nodeInMemory){
			console.error('Missing node in memory when ai.js/removeNodeAndChildren (not utils.removeNode yet)');
			return false;
		}

		for(let node of nodeInMemory.nodes){
			await removeNodeAndChildren(node._id);
		}

		let nodeIdx = App.nodesDb.findIndex(n=>{
			return n._id == nodeId
		});

		let updatedNode = await App.graphql.removeNode({_id: nodeId});
		let savedNodeCopy = JSON.parse(JSON.stringify(updatedNode));
		App.nodesDb.splice(nodeIdx,1);
		console.log('Removing from app.utils.removeNode');
		await App.utils.removeNode(nodeId);

		return savedNodeCopy;

	}

  switch(message.command){
  	
  	case 'fetchNodes':

  		// message.data = "filter"
			// let nodes = await App.graphql.fetchNodes(message.filter);



   //  	let timeStart1 = (new Date());

			// let nodesDb = JSON.parse(JSON.stringify(App.nodesDb));

			// // get rid of nodes that have a broken parent 
			// // - TODO: more efficient somewhere else 
			// nodesDb = nodesDb.filter(node=>{
			// 	// check the parents to see if they are active
			// 	function checkParent(n){

			// 		if(n.nodeId){
			// 			let parent = _.find(nodesDb,{_id: n.nodeId});
			// 			if(parent && parent.active){
			// 				return checkParent(parent);
			// 			}
			// 			return false;
			// 		}
			// 		return true;

			// 	}
			// 	return checkParent(node);
			// });

			// // console.log('DB Nodes. Total:', App.nodesDb.length, 'Possible:', nodesDb.length); //, nodes.length);

			// let timeStart2 = (new Date());

		 //  const fetchNodesQuick = (filterObj, depth) => {
		 //    // also fetches all child nodes, for 10 levels deep
		 //    return new Promise(async (resolve,reject)=>{
		 //      depth = depth || 1;
		 //      depth++;
		 //      if(depth > 6){
		 //        // too deep! (or pointing in a loop!) 
		 //        return resolve([]);
		 //      }

		 //      let nodes = JSON.parse(JSON.stringify(lodash.filter(nodesDb, filterObj))); // mimics simply object requests 

		 //      // console.log('Found nodes!');

		 //      for(let node of nodes){

		 //      	function getParentChain(nodeId){
		 //      		let parent = lodash.find(nodesDb, {_id: nodeId});
		 //      		if(parent.nodeId){
		 //      			parent.parent = getParentChain(parent.nodeId);
		 //      		}
		 //      		return parent;
		 //      	}

		 //        // get parent(s)
		 //        if(node.nodeId){
		 //          // find parent 
		 //          // let parent = await fetchNodesQuick({_id: node.nodeId}, 4);
		 //          // if(parent && parent.length){
		 //          //   node.parent = parent[0];
		 //          // }
		 //          node.parent = getParentChain(node.nodeId); //lodash.find(nodesDb, {_id: node.nodeId});

		 //        }

		 //        // get children 
		 //        node.nodes = await fetchNodesQuick({nodeId: node._id}, depth);

		 //      }

		 //      // console.log('After nodes');

		 //      resolve(nodes);

		 //    });
		 //  }

		 //  let nodes = await fetchNodesQuick(message.filter, 1);

			// // console.log('Fetched Nodes Quick2', nodes.length); //, message.filter); //, nodes.length);

   //  	let timeEnd1 = (new Date());
		 //  // console.log('FetchNodes Time1:', (timeEnd1.getTime() - timeStart1.getTime())/1000, (timeStart2.getTime() - timeStart1.getTime())/1000); 

			// console.log('DB Nodes. Total:', App.nodesDb.length, 'Possible:', nodesDb.length, 'Time:', (timeEnd1.getTime() - timeStart1.getTime())/1000, (timeStart2.getTime() - timeStart1.getTime())/1000); //, nodes.length);

			dataFilter = message.filter.dataFilter; // priority, easier/flexible 
			sqlFilter = message.filter.sqlFilter;
			rootNodeFilter = message.filter.rootNodeFilter;

			// TODO (not sure if searchPath is necessary, or if nrequire ("node require") is more apt to returning single nodes where I know what I'm looking for (local react elements, etc) 
			// - it gets away from the "everthing is easily replaceable" mindset when not array and type based (names are a pseudo-type) 
			// - trying to avoid naming things, cuz that is one of the hard problems to solve 
			searchPath = message.filter.searchPath; 

			// using either underscore-query or lodash.filter (sqlFilter) 
			if(!lodash.isEmpty(dataFilter)){
				useDataFilter = true;
			} else if(!lodash.isEmpty(sqlFilter)){
				useSqlFilter = true;
			}

			if(useDataFilter){
				nodes = lodash.query(App.nodesDbParsed, dataFilter);
			} else if(useSqlFilter){
				nodes = lodash.filter(App.nodesDbParsed, sqlFilter);

				// // _id only
				// if(sqlFilter._id){
				// 	console.log('sqlFilter._id:', sqlFilter._id, nodes.length, ((nodes[0].nodeId && !nodes[0].parent) ? 'Missing PARENT!!':''), nodes[0].nodeId);
				// }

			} else {
				// all nodes
				nodes = App.nodesDbParsed;
			}

			// root node filter (if used)
			if(rootNodeFilter){
				// filter from root node outwards
				// - TODO: memoize/cache (probably lots of overlap) 
				// - node._root holds info for root node (might be self-referential!) 
				nodes = lodash.query(nodes, {_root: rootNodeFilter});
			}

			if(searchPath){
				// TODO: handle absolute and relative paths? 
				// - for "relative" expect the "relative to" location 
				//   - probably included from within a script? 
				console.error('searchPath not used yet!');
			}

			// v3ish
			// "fill out" by including parents/children for each possible result 
			// - limits possible returned result to parent's children, all children of node 

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
					// 	tmpNode.parent.nodes.push(nodeFromNode(childNode));
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

			// v3 or v4 
			let returnNodes = [];
			let returnNodesObj;
			switch(message.filter.responseType){

				case 'json':
					// v3
					// console.log('--Start Return--');
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
					returnNodesObj = JSON.parse(JSON.stringify(returnNodes));
					break;

				case 'cjson':
				default:
					// v4 (circular json) 
					// - return everything vs. specify a path to retrieve info for 
					// returnNodesObj = cJSON.parse(cJSON.stringify(nodes));
					returnNodesObj = nodes;
					break;

			}

		  eventEmitter.emit(
		    'response',
		    {
		      // id      : ipc.config.id,
		      id: message.id,
		      data: returnNodesObj //JSON.parse(JSON.stringify(nodes))
		    }
		  );

		  // null out nodes?
		  // nodes = null;
		  // nodesDb = null;

  		break;
  	

  	case 'fetchNodesInMemory':

  		// expecting a simple match as input 
  		// - no children, parents (but does return those?) 

  		console.log('fetchNodesInMemory');

    	let timeStart3 = (new Date());

			let nodesDb2 = JSON.parse(JSON.stringify(App.nodesDbParsed));
    	let timeStart4 = (new Date());
		  let nodes2; // = lodash.filter(nodesDb2, message.filter);
			
			dataFilter = message.filter.dataFilter; // priority, easier/flexible 
			sqlFilter = message.filter.sqlFilter;

			// using either underscore-query or lodash.filter (sqlFilter) 
			if(!lodash.isEmpty(dataFilter)){
				useDataFilter = true;
			} else if(!lodash.isEmpty(sqlFilter)){
				useSqlFilter = true;
			}

			if(useDataFilter){
				nodes2 = lodash.query(nodesDb2, dataFilter);
			} else if(useSqlFilter){
				nodes2 = lodash.filter(nodesDb2, sqlFilter);
			} else {
				// all nodes
				nodes2 = nodesDb2;
			}

			// console.log('Fetched Nodes Quick2', nodes.length); //, message.filter); //, nodes.length);

    	let timeEnd2 = (new Date());
		  // console.log('FetchNodes Time1:', (timeEnd1.getTime() - timeStart1.getTime())/1000, (timeStart2.getTime() - timeStart1.getTime())/1000); 

			console.log('fetchNodesInMemory: DB Nodes. Total:', App.nodesDb.length, 'ParsedTotal:', App.nodesDbParsed.length, 'Possible:', nodesDb2.length, 'Time:',  (timeStart4.getTime() - timeStart3.getTime())/1000, (timeEnd2.getTime() - timeStart4.getTime())/1000, (timeEnd2.getTime() - timeStart3.getTime())/1000); //, nodes.length);


		  eventEmitter.emit(
		    'response',
		    {
		      // id      : ipc.config.id,
		      id: message.id,
		      data: nodes2 //JSON.parse(JSON.stringify(nodes))
		    }
		  );

		  nodesDb2 = null;

  		break;
  	

  	case 'fetchNodesInMemoryByIds':

  		// expecting only an _id as input 

  		console.log('fetchNodesInMemoryByIds:', message._ids);
  		let nodes3 = [];

  		(message._ids || []).forEach(_id=>{
    		let foundNodeById = App.nodesDbParsedIds[_id];
    		if(foundNodeById){
    			nodes3.push(JSON.parse(JSON.stringify(foundNodeById)));
    		}
  		})

		  eventEmitter.emit(
		    'response',
		    {
		      // id      : ipc.config.id,
		      id: message.id,
		      data: nodes3 //JSON.parse(JSON.stringify(nodes))
		    }
		  );

		  nodes3 = null;

  		break;

  	
  	case 'historyLog':

			// skipping history for now
		  eventEmitter.emit(
		    'response',
		    {
		      // id      : ipc.config.id,
		      id: message.id,
		      data: {}
		    }
		  );

  	// 	// message.data = "filter"
			// let savedHistory = await App.graphql.newHistory({
			// 	type: message.type,
			// 	logLevel: message.logLevel,
			// 	data: message.data,
			// });

		 //  eventEmitter.emit(
		 //    'response',
		 //    {
		 //      // id      : ipc.config.id,
		 //      id: message.id,
		 //      data: savedHistory
		 //    }
		 //  );

  		break;


  	case 'findNode':

  		// message.data = "filter"
			let node = await App.graphql.findNode(message.filter);


		  eventEmitter.emit(
		    'response',
		    {
		      // id      : ipc.config.id,
		      id: message.id,
		      data: node
		    }
		  );

  		break;


  	case 'newNode':

  		// message.data = "filter"
  		message.node.name = message.node.hasOwnProperty('name') ? message.node.name : uuidv4();
			savedNode = await App.graphql.newNode(message.node);

			// Update memory!
			
			// have a "wait until next resolution" before emitting afterUpdate? 
			// - states: update-succeeded, updated-and-changes-available-after-reparse
			savedNodeCopy = JSON.parse(JSON.stringify(savedNode));
			
			// TODO: figure out affected and only update as necessary! 

  		
			try {
				await App.utils.insertNode(savedNode);
			}catch(err){
				// failed updating
			  eventEmitter.emit(
			    'response',
			    {
			      // id      : ipc.config.id,
			      id: message.id,
			      data: false
			    }
			  );
				return false;
			}

  		App.nodesDb.push(savedNodeCopy);

			if(message.skipRebuild){
				// skipping rebuild for now
				// - listen for next change before emitting afterCreate
				App.eventEmitter.once('nodesDb.afterParse',()=>{
	      	App.eventEmitter.emit('node.afterCreate', savedNode);
				});
			} else {
				if(message.skipWaitForResolution){
					// App.utils.nodesDbParser()
					// .then(()=>{
	      		App.eventEmitter.emit('node.afterCreate', savedNode);
					// });
		    } else {
		    	// await App.utils.nodesDbParser();
	      	App.eventEmitter.emit('node.afterCreate', savedNode);
		    }
		  }

		  eventEmitter.emit(
		    'response',
		    {
		      // id      : ipc.config.id,
		      id: message.id,
		      data: savedNodeCopy
		    }
		  );

  		break;


  	case 'updateNode':

  		// console.log('UpdateNode:', typeof message.node)
  		// console.log('UpdateNode2:', JSON.stringify(message.node, null,2))

  		nodeInMemory = App.nodesDbParsedIds[message.node._id];

  		// if(!nodeInMemory){
  		// 	console.error('Missing nodeInMemory for updateNode!', message.node._id);
  		// 	return false;
  		// }

  		// nodeInMemoryIdx = App.nodesDb.findIndex(n=>{ // App.nodesDbParsedIds[message.node._id];
  		// 	return n._id == message.node._id;
  		// });

  		// if(nodeInMemoryIdx === -1){
  		// 	console.error('Node to update NOT in memory!', message.node._id);
  		// 	return false;
  		// }

  		// message.data = "filter"
			let updatedNode = {};
  		if(message.node.active === false){
  			// remove node 
  			// - also removes all children 
  			//   - recursively 
  			console.log('RemoveNode (from updateNode)');
  			try {
					savedNodeCopy = await removeNodeAndChildren(message.node._id);
				}catch(err){
					console.error('RemoveNode error:', err);
				  eventEmitter.emit(
				    'response',
				    {
				      // id      : ipc.config.id,
				      id: message.id,
				      data: false
				    }
				  );
  				return false;
				}

  		} else {
  			console.log('UpdateNode');
  			try {
  				updatedNode = await App.graphql.updateNode(message.node); // returns full node! 
  			}catch(err){
  				// failed updating
				  eventEmitter.emit(
				    'response',
				    {
				      // id      : ipc.config.id,
				      id: message.id,
				      data: false
				    }
				  );
  				return false;
  			}
  			savedNodeCopy = JSON.parse(JSON.stringify(updatedNode));
  			// App.nodesDb.splice(nodeInMemoryIdx, 1, savedNodeCopy);
  			await App.utils.updateNode(updatedNode, nodeInMemory);
  		}

			// Update memory!

			// have a "wait until next resolution" before emitting afterUpdate? 
			// - states: update-succeeded, updated-and-changes-available-after-reparse
			
			// TODO: figure out affected and only update as necessary! 


			if(message.skipRebuild){
				// skipping rebuild for now
				// - listen for next change before emitting afterCreate
				App.eventEmitter.once('nodesDb.afterParse',()=>{
	      	App.eventEmitter.emit('node.afterUpdate', updatedNode);
				});
			} else {
				if(message.skipWaitForResolution){
					// App.utils.nodesDbParser()
					// .then(()=>{
	      		App.eventEmitter.emit('node.afterUpdate', updatedNode);
		      	try {
		      		JSON.stringify(updatedNode);
		      	}catch(err){
		      		console.error(err);
		      	}
					// });
		    } else {
		    	// await App.utils.nodesDbParser();
	      	App.eventEmitter.emit('node.afterUpdate', updatedNode);
	      	try {
	      		JSON.stringify(updatedNode);
	      	}catch(err){
	      		console.error(err);
	      	}
		    }
		  }



		  eventEmitter.emit(
		    'response',
		    {
		      // id      : ipc.config.id,
		      id: message.id,
		      data: savedNodeCopy
		    }
		  );

  		break;


  	case 'removeNode':

  		nodeInMemoryIdx = App.nodesDb.findIndex(n=>{ // App.nodesDbParsedIds[message.node._id];
  			return n._id == message.node._id;
  		});

  		if(nodeInMemoryIdx === -1){
  			console.error('Node to remove NOT in memory!', message.node._id);
  		}

  		// console.log('UpdateNode:', typeof message.node)
  		// console.log('UpdateNode2:', JSON.stringify(message.node, null,2))
  		console.log('RemoveNode');

  		// message.data = "filter"
			// let removedNode = await App.graphql.removeNode(message.node);
			// App.nodesDb.splice(nodeInMemoryIdx,1);
			// await App.utils.removeNode(message.node._id);

			let removedNode = removeNodeAndChildren(message.node._id);

			// Update memory!
			if(message.skipRebuild){
				// skipping rebuild for now
				// - listen for next change before emitting afterCreate
				App.eventEmitter.once('nodesDb.afterParse',()=>{
	      	App.eventEmitter.emit('node.afterUpdate', message.node);
				});
			} else {
				if(message.skipWaitForResolution){
					// App.utils.nodesDbParser()
					// .then(()=>{
	      		App.eventEmitter.emit('node.afterUpdate', message.node);
					// });
		    } else {
		    	// await App.utils.nodesDbParser();
		    }
		  }

		  eventEmitter.emit(
		    'response',
		    {
		      // id      : ipc.config.id,
		      id: message.id,
		      data: removedNode // boolean?
		    }
		  );

  		break;


  	case 'rebuildMemory':

			if(message.skipWaitForResolution){
				// App.utils.nodesDbParser();
			} else {
				// await App.utils.nodesDbParser();
			}

		  eventEmitter.emit(
		    'response',
		    {
		      // id      : ipc.config.id,
		      id: message.id,
		      data: true // boolean?
		    }
		  );

  		break;


  	case 'ThreadedSafeRun':

  		message.workGroup = message.workGroup || uuidv4();
  		message.workers = message.workers || 100;

  		let code = message.code;
  		let nodeId = message.nodeId;
  		let timeout = message.timeout;
  		let safeContext = {
  			SELF: message.SELF, // code node
  			INPUT: message.INPUT
  		}
  		let requires = ['lodash'];
  		let threadEventHandlers = {};
  		let requestId = message.requestId;
  		let mainIpcId = message.mainIpcId;

  		let thisCQ = parallelVMs[message.workGroup];
  		if(!thisCQ){

	  		thisCQ = queue({
	  			concurrency: message.workers, 
	  			autostart: true
	  		});

				// get notified when jobs complete
				thisCQ.on('success', (result, job) => {
				  // nothing to do, handled in-job 
				  // console.log('Job done');
				})
				thisCQ.on('end', (err) => {
				  // all jobs finished 
				  delete parallelVMs[message.workGroup];
				  // console.log('---All jobs finished---!');
				})

				parallelVMs[message.workGroup] = thisCQ;

  		}

  		thisCQ.push(()=>{
  			// { socket, message, code, safeContext, requires, threadEventHandlers, requestId, nodeId, timeout}

		    return new Promise(async (resolve, reject)=>{

		    	// let { socket, message, code, safeContext, requires, threadEventHandlers, requestId, nodeId, timeout} = task;

		    	// let startDate = (new Date());
		    	// console.log('TaskNodeId:', typeof message.workers, message.workers, nodeId, startDate.getSeconds()+'.'+startDate.getMilliseconds());
					let safedData;
		      try {
		      	let timeStart = (new Date());
		        safedData = await runSafe({ code, safeContext, requires, threadEventHandlers, requestId, mainIpcId, nodeId, timeout})
		      	let timeEnd = (new Date());
		        // console.log('runSafe time:', timeEnd.getTime() - timeStart.getTime()); //, 'group:'+message.workGroup, 'id:'+message.SELF._id, timeStart.getSeconds() + '.' + timeStart.getMilliseconds(), timeEnd.getSeconds() + '.' + timeEnd.getMilliseconds()); // message.datetime
		      }catch(err){
		      	console.error('Failed safedData from sandbox1');
		      	eventEmitter.emit(
					    'response',
					    {
					      // id      : ipc.config.id,
					      id: message.id,
					      data: 'Failed safedData'
					    }
					  );
					  // console.log('FINISH IPC1');
					  return resolve(); // allow workers to continue
		      }

				  eventEmitter.emit(
				    'response',
				    {
				      // id      : ipc.config.id,
				      id: message.id,
				      data: safedData
				    }
				  );
					// console.log('FINISH IPC2');
				  return resolve(); // allow workers to continue

		    })
  		});

  		// console.log('Add to cq');
  		// thisCQ.drained(()=>{
  		// 	// delete parallelVMs[message.workGroup]; // kill concurrency queue! 
  		// })

  		break;

  	case 'getRequestCache':
  		// process should have the requestId in it?
  		// - or somehow it could look up the chain if necessary? 
  		// - or each process coulc kinda self-identify that it was creaing a new process, and then this could crawl that chain? 


		  eventEmitter.emit(
		    'response',
		    {
		      // id      : ipc.config.id,
		      id: message.id,
		      data: requestsCache[message.requestId]
		    }
		  );

  		break;

  	case 'setRequestCacheKeyValue':
  		// process should have the requestId in it?
  		// - or somehow it could look up the chain if necessary? 
  		// - or each process coulc kinda self-identify that it was creaing a new process, and then this could crawl that chain? 

  		var cache = requestsCache[message.requestId];
  		cache.keyvalue[message.key] = message.value;

		  eventEmitter.emit(
		    'response',
		    {
		      // id      : ipc.config.id,
		      id: message.id,
		      data: cache
		    }
		  );

  		break;

  	case 'pushToRequestCacheStack':
  		// process should have the requestId in it?
  		// - or somehow it could look up the chain if necessary? 
  		// - or each process coulc kinda self-identify that it was creaing a new process, and then this could crawl that chain? 

  		var cache = requestsCache[message.requestId];
  		cache.stack.push(message.value);

		  eventEmitter.emit(
		    'response',
		    {
		      // id      : ipc.config.id,
		      id: message.id,
		      data: cache
		    }
		  );

  		break;


  	case 'httpResponse':
  		// process should have the requestId in it?
  		// - or somehow it could look up the chain if necessary? 
  		// - or each process coulc kinda self-identify that it was creaing a new process, and then this could crawl that chain? 

  		// message: {
  		// 	action: 'send', // redirect
  		// 	data: '', // string? 
  		// }

  		// // data = arguments
  		// let msgArgs = lodash.isArray(message.data) ? message.data : [message.data];

  		// // emit response according to input 
  		// switch(message.action){
  		// 	case 'send':
  		// 		requestsCache[message.requestId].res[message.action](msgArgs[0]);
  		// 		break;

  		// 	case 'set':
  		// 		requestsCache[message.requestId].res[message.action](msgArgs[0], msgArgs[1]);
  		// 		break;

  		// 	default:
  		// 		console.error('Invalid httpResponse values');
  		// 		break;
  		// }

  		let returnData = true;

  		// Handle websocket response
  		// - Cloud -> RPi (this) -> Cloud
  		if(message.action == 'send' && requestsCache[message.requestId].wsClientId){
  			// response via websocket
  			// socketio, or websocket? 
	  		let responseFunc = requestsCache[message.requestId].socketioResponseFunc;
  			if(responseFunc){
  				// socketio request/response 

	        console.log('Responding via socketio instead of httpResponse (came in as socketio request)');
	  			console.log('clientId:', requestsCache[message.requestId].wsClientId, responseFunc ? 'responseFunc exists':'responseFunc MISSING');
					
					responseFunc(message.data);

  			} else {
  				// normal webosockets 
	  			console.log('Responding via websocket instead of httpResponse (came in as websocket request)');
	  			console.log('clientId:', requestsCache[message.requestId].wsClientId);
	  			console.log('wsRequestId:', requestsCache[message.requestId].keyvalue.wsRequestId);

	  			let thisWs = App.wsClients[ requestsCache[message.requestId].wsClientId ].ws;
					
					thisWs.send(JSON.stringify({
						requestId: requestsCache[message.requestId].keyvalue.wsRequestId,
						type: 'response',
						data: message.data
					}));
				}

  		} else {
	  		if(message.action == 'res'){
	  			returnData = requestsCache[message.requestId].res;
	  		} else {
	  			requestsCache[message.requestId].res[message.action](message.data);
	  		}
	  	}

		  eventEmitter.emit(
		    'response',
		    {
		      // id      : ipc.config.id,
		      id: message.id,
		      data: returnData // TODO: success/fail
		    }
		  );

  		break;


  	case 'httpSession':
  		// process should have the requestId in it?
  		// - or somehow it could look up the chain if necessary? 
  		// - or each process coulc kinda self-identify that it was creaing a new process, and then this could crawl that chain? 

  		// message: {
  		// 	action: 'send', // redirect
  		// 	data: '', // string? 
  		// }

  		let session = requestsCache[message.requestId].req.session;
  		// emit response according to input 
  		switch(message.action){
  			case 'get':
  				break;
  			case 'set':
  				// key, value
  				try {
	  				// console.log('Setting session values:', message.data.key, message.data.value);
	  				requestsCache[message.requestId].req.session[message.data.key] = message.data.value;
	  			}catch(err){
	  				console.error('httpSession error:', err);
	  			}
	  			console.log('new value for httpSession.',message.data.key,'=',requestsCache[message.requestId].req.session[message.data.key]);
  				break;
  			default:
  				console.error('Invalid httpSession action');
  				break;
  		}

		  eventEmitter.emit(
		    'response',
		    {
		      // id      : ipc.config.id,
		      id: message.id,
		      data: session
		    }
		  );

  		break;


  	case 'npminstall':
  		// install npm module (if not already installed?) 

  		// waitNpmReady.then(()=>{

  			console.log('waitNpmReady was resolved, executing npmPackage install');

	  		let npmPackage = message.package;

	  		console.log('package to install:', npmPackage);

	  		if(installedPackages[npmPackage]){
	  			// previously installed!

				  eventEmitter.emit(
				    'response',
				    {
				      // id      : ipc.config.id,
				      id: message.id,
				      data: {
				      	err: false,
				      	data: true
				      }
				    }
				  );

					return;
	  		}
	  		installedPackages[npmPackage] = true;

	  		console.log('not installed, installing');

			  try {
			  	npm.install([npmPackage], {
			  		output: true
			  	})
			    .then(function(){
			      console.log("SUCCESS installing package");
					  eventEmitter.emit(
					    'response',
					    {
					      // id      : ipc.config.id,
					      id: message.id,
					      data: {
					      	err: null, 
					      	data: true
					      }
					    }
					  );
			    })
			    .catch(function(err){
			       console.log("Unable to install package", err);

					  eventEmitter.emit(
					    'response',
					    {
					      // id      : ipc.config.id,
					      id: message.id,
					      data: {
					      	err: true, 
					      	data: false
					      }
					    }
					  );

			    });

				  // npm.commands.install([npmPackage], function(err, data) {
				  //   if(err){
				  //   	console.error('Failed npm install command:', err);
				  //   }

				  //   console.log('Installed package.',data);

				  // });
				}catch(err){
					console.error('failed installing package2:', err);
				}

			// });


  		break;


  	case 'getIpfsHashForString':

  		// console.log('ipc getIpfsHashForString');
  		// let vals = await ipfs.files.add(new Buffer(message.dataString,'utf8'));
  		console.log('message.dataString', typeof message.dataString, message.dataString);

      // console.log('Adding node to chain');
      let ipfsHashResponse = await request({
        // url: 'http://lang.second.ngrok.io/ipfs/gethash',
        url: 'https://api.getasecond.com/ipfs/gethash',
        method: 'POST',
        body: {
        	string: message.dataString
        },
        json: true
      });

      console.log('ipfsHashResponse:', ipfsHashResponse);

      // return false;

  		let hash = ipfsHashResponse;

			// skipping history for now
		  eventEmitter.emit(
		    'response',
		    {
		      // id      : ipc.config.id,
		      id: message.id,
		      data: {
		      	hash
		      }
		    }
		  );

  		break;

  	default:
  		break;
  }


})



const runSafe = ({code, safeContext, requires, threadEventHandlers, requestId, mainIpcId, nodeId, timeout}) => {
  return new Promise(async (resolve, reject)=>{

    // threadEventHandlers make it easy to handle onGasExceeded, etc.
    // - handles every tick? 
    // - MUST return a single value 

    safeContext = safeContext || {};
    // safeContext._ = lodash;
    safeContext.console = console;

    try {
      // console.log('Run ThreadedSafeRun', code);
      let safeResult = await ThreadedSafeRun(code, safeContext, requires, threadEventHandlers, requestId, mainIpcId, nodeId, timeout);
      // console.log('Resolved ThreadedSafeRun', safeResult);
      resolve(safeResult);
    }catch(err){
      // err may be the result of the threadEventHandlers throwing (onGasExceeded, onTimeToFetchExceeded, onStorageSpaceExceeded)! 
      // - could have killed the fetch
      // Failed parsing the user-provided "reduce" function! 
      console.error('Failed parsing user-provided reduce function3!', err);
      console.error(code);
      resolve(undefined);
    }

  });

}


const ThreadedSafeRun = (evalString, context = {}, requires = [], threadEventHandlers, requestId, mainIpcId, nodeId, timeout) => {
  return new Promise(async (resolve, reject)=>{

    // console.log('starting ThreadedSafeRun (cannot console.log inside there/here (when run in a sandbox!)!)');
    let ob = {evalString, context, requires, threadEventHandlers, requestId, mainIpcId, nodeId, timeout}; 

    let combinedOutputData = '';
    let eventEmitter = App.eventEmitter;

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

    App.socketioServers = App.socketioServers || {};

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

      // OLD
      // - publishing to NodeChain (not used) 

      let {
        node,
        chain // identity for chain, to lookup where to publish to 
      } = opts;

      let nodeInputStr = JSON.stringify(node);

      let ipfsHashData = await getIpfsHashForString(nodeInputStr);
      let ipfsHash = ipfsHashData.hash;

      return {
        type: 'ipfshash:0.0.1:local:3029fj',
        data: {
          hash: ipfsHash
        }
      };

    }
    


    App.globalCache = App.globalCache || {};
    App.globalCache.SearchFilters = App.globalCache.SearchFilters || {};


    // Get codenode and parents/children  
    // - from nodeId passed in
    // - cache, until code changes are made 
    //   - or simply cache for a limited time period? (testing: 2 minutes) 

    let codeNode;

    if(App.globalCache.SearchFilters['exact_codeNode:'+nodeId]){
      console.log('Using cached codeNode for vm');
      codeNode = App.globalCache.SearchFilters['exact_codeNode:'+nodeId];
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
      // App.globalCache.SearchFilters['exact_codeNode:'+nodeId] = codeNode;
      // setTimeout(()=>{
      //   console.log('de-caching internal codeNode');
      //   App.globalCache.SearchFilters['exact_codeNode:'+nodeId] = null;
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
        __dirname: __dirname,
        staticFilePath: path.resolve(process.env.STATIC_FILE_PATH || __dirname + '/staticfiles'), // where static files will be stored
        runRequest: App.secondAI.MySecond.runRequest,
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
        // shim'd "dynamic require" from universe, so that we can rename/alias packages that are dynamically installed
        // - only works with github urls (need a solution for easily forking, renaming in package.json)
        drequire: (pkgName, semVerComparison, installationPackageUrl)=>{
               // // TODO:
               // // for the pkgName, see if we have a semver match using semVerComparison, and return the best match (sort, findLastValid)
               // // - if no match, then install using installationPackageUrl
 
               // // expecting installationPackageUrl's package.json's name to be pkgName+pkgVersion
               // // - if it isn't, faillure
 
               // // expecting/mandating that the package match the version, and the name matches?
               // let mypkg = universe.drequire('package-name',{
               //      version: '0.1.3',
               //      onMissing: 'github.com/nicholasareed/url.git#branchname'
               // })
               // if(!mypkg){
 
               // }
 
				},
				drequireInstall: ()=>{
				     // installs an npm package,
				     // - caches, validates
				     // - used as a temporary measure for dynamic packages
				},
        jsSchema,
        rsa,
        bitcoin,
        bigi,
        uuidv4,
        cJSON,
        JSZip,
        stringSimilarity,
        RouteParser,
        aws: App.aws,
        setTimeout,
        setInterval,
        clearTimeout,
        clearInterval,
        eventEmitter,
        globalCache: App.globalCache,

        sharedServices: App.sharedServices, // express server, socketio client/server, IPFS, 

        // // client
        // // - attaching to remote server 
        // socketioClient, 
        // socketioServers: App.socketioServers, // where I'm the client, connected to a remote socketio server 

        // // websocket server 
        // // - clients attached to server (IoT devices) 
        // socketIOServer: App.socketIOServer,
        // wsClients: App.wsClients, 
        // socketioClients: App.socketioClients,

        google,
        webrequest: request, // use similar to request-promise: https://www.npmjs.com/package/request-promise

        sleep: (ms)=>{
          return new Promise((resolve,reject)=>{
            setTimeout(resolve,ms)
          })
        },
        checkPackage: (pkgName)=>{
          App.globalCache.packages = App.globalCache.packages || {};
          return App.globalCache.packages[pkgName] || {};
        },
        installPackage: (pkgName)=>{
          // manages package installation 
          // - simultaneous, etc. 
          return new Promise(async (resolve,reject)=>{
            // create global package tracker
            console.log('installPackage1');
            App.globalCache.packages = App.globalCache.packages || {};
            if(!App.globalCache.packages[pkgName]){
              let onInstallResolve;
              let onInstall = new Promise((resolve2)=>{
                onInstallResolve = resolve2;
              });
              let onRemoveResolve;
              let onRemove = new Promise((resolve2)=>{
                onRemoveResolve = resolve2;
              });
              App.globalCache.packages[pkgName] = {
                installing: false,
                removing: false,
                installed: false,
                errorInstalling: null,
                onInstallResolve,
                onInstall,
                onRemoveResolve,
                onRemove
              }
            }
            let pkg = App.globalCache.packages[pkgName];
            console.log('pkg:', pkg);
            if(pkg.installing){
              console.log('waiting for install, in progress');
              return pkg.onInstall.then(resolve);
            }
            if(pkg.removing){
              console.log('waiting for removal, in progreess, then re-install');
              await pkg.onRemove;
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
              if(pkg.onInstallResolve){
              	pkg.onInstallResolve(true);
              }
              pkg.installed = true;
              pkg.installing = false;
              
            });
            
            pkg.onInstall.then(resolve);
            
          });

        },
        removePackage: (pkgName)=>{
          // manages package installation 
          // - simultaneous, etc. 
          return new Promise(async (resolve,reject)=>{
            // create global package tracker
            console.log('removePackage1');
            App.globalCache.packages = App.globalCache.packages || {};
            if(!App.globalCache.packages[pkgName]){
              let onInstallResolve;
              let onInstall = new Promise((resolve2)=>{
                onInstallResolve = resolve2;
              });
              let onRemoveResolve;
              let onRemove = new Promise((resolve2)=>{
                onRemoveResolve = resolve2;
              });
              App.globalCache.packages[pkgName] = {
                installing: false,
                removing: false,
                installed: false,
                errorInstalling: null,
                onInstallResolve,
                onInstall,
                onRemoveResolve,
                onRemove
              }
            }
            let pkg = App.globalCache.packages[pkgName];
            console.log('pkg:', pkg);
            if(pkg.installing){
              console.log('waiting for install, in progress, before uninstalling');
              await pkg.onInstall;
            }
            if(pkg.removing){
              console.log('waiting for remove, in progress');
              return pkg.onRemove.then(resolve);
            }
            // try and remove
            // - doesnt matter if installed or not
            
            // install
            pkg.removing = true; // easier than "anything else 
            const { exec } = require('child_process');
            exec('npm remove ' + pkgName, (err, stdout, stderr) => {
              if (err) {
                console.error(`exec error removing package!: ${err}`);
                pkg.removing = false;
                pkg.errorInstalling = false; // allow re-install
                return;
              }
              console.log(`Exec Result: ${stdout}`);
              
              // resolve all waiting scripts (including in this block) 
              if(pkg.onRemoveResolve){
              	pkg.onRemoveResolve(true);
              }
              pkg.installed = false;
              pkg.removing = false;
              pkg.errorInstalling = false; // allow re-install
              
            });
            
            pkg.onRemove.then(resolve);
            
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
            let tmpnode1 = lodash.find(App.nodesDbParsed,{_id: node1._id});
            try {
              parentNodes1 = getParentNodes2(tmpnode1);
            }catch(err2){
              console.error(err2);
            }
          }
          try {
            parentNodes2 = getParentNodes2(node2);
          }catch(err){
            let tmpnode2 = lodash.find(App.nodesDbParsed,{_id: node2._id});
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

        // WebTorrent: App.WebTorrentClient,
        // IPFS: {
        //   ipfs: App.ipfs,
        //   onReady: App.ipfsReady,
        //   isReady: ()=>{
        //     if(App.ipfsIsReady){
        //       return true;    
        //     } else {
        //       return false;
        //     }
        //   },

        //   pin: (buffersToPin)=>{

        //     return new Promise(async (resolve, reject)=>{

        //       // pin multiple!
        //       let returnSingle = false;
        //       if(!lodash.isArray(buffersToPin)){
        //         returnSingle = true;
        //         buffersToPin = [buffersToPin];
        //       }

        //       let hashResult;
        //       try {
        //         hashResult = await App.ipfs.files.add(buffersToPin);
        //         console.log('hashResult:', hashResult);
        //         let ipfsHashes = hashResult.map(result=>result.hash);
        //         console.log('IPFS hashes to pin:', ipfsHashes);
        //         for(let ipfsHash of ipfsHashes){
        //           if(!ipfsHash){
        //             console.error('Skipping invalid hash, empty from results', );
        //             continue;
        //           }
        //           await App.ipfs.pin.add(ipfsHash);
        //         }
        //         if(returnSingle){
        //           resolve({
        //             type: 'ipfs_hash:..',
        //             data: {
        //               hash: ipfsHashes[0]
        //             }
        //           });
        //         } else {
        //           resolve({
        //             type: 'ipfs_hashes:..',
        //             data: {
        //               hashes: ipfsHashes
        //             }
        //           });
        //         }
        //       }catch(err){
        //         console.error('IPFS pin failure:', err);
        //         resolve({
        //           type: 'ipfs_error_pinning:..',
        //           data: {
        //             error: true,
        //             hashResult,
        //             err
        //           }
        //         });
        //       }

        //     });


        //   }
        // },

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

        	// OLD, NOT USING

          // to an External second
          return new Promise(async (resolve, reject)=>{
            // opts = {
            //   clientId,
            //   RequestNode
            // }

            let clientId = opts.clientId;

            // exists?
            if(!App.sharedServices.wsClients[clientId]){
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
            let ws = App.sharedServices.wsClients[clientId].ws;

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
                  connection, //: 'https://infinite-brook-40362.herokuApp.com/ai'
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
            	SELF: codeNode, // derived from this universe instance
              filter: {
              	sameAppPlatform: true,
                dataFilter: {
                  type: {
                  	$like: 'capability:'
                  },
                  'data.key' : nameSemver
                },
                // filterNodes: tmpNodes=>{
                //   return new Promise((resolve, reject)=>{
                //     // tmpNodes = tmpNodes.filter(tmpNode=>{
                //     //   return tmpNode.data.method == 'read';
                //     // })

                //     // try {
                //     //   console.log('platformClosest._id', platformClosest._id);
                //     // }catch(err){
                //     //   console.error('NO PLATFORMClOSEST');
                //     // }
                //     tmpNodes = lodash.filter(tmpNodes, tmpNode=>{

                //       if(funcInSandbox.universe.isParentOf(platformClosest._id, tmpNode)){
                //         // console.log('FOUND IT UNDER SAME APP!!!!!', tmpNode._id);
                //         // console.log('FOUND PARENT1!');
                //         return true;
                //       }
                //       return false;
                //     })
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

              // let allNodes = await funcInSandbox.universe.searchMemory({});
              console.error('Failed capabilityNode',nameSemver); //, allNodes);
              // debugger;

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

                console.error('DEPRECATED! should not be using externalRequest, should use TalkToSecond capability');

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

        requestResponse: (action, data) => {
        	return funcInSandbox.universe.httpResponse(action, data);
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

        runNodeCodeInVMInMemory: (opts) => {
          return new Promise(async (resolve, reject)=>{

            // same as runNodeCodeInVM, except NO JSON.stringify 
            // - skips the whole ThreadedSafeRun request, just makes it directly (runSafe is called) 

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

              var code = opts.codeNode.data.code;

              var datetime = (new Date());

				  		var safeContext = {
				  			SELF: opts.codeNode, // code node
				  			INPUT: opts.dataNode || opts.inputNode, 
				  		}
				  		var requires = ['lodash'];
				  		var threadEventHandlers = {};
				  		var mainIpcId = ob.mainIpcId;
				  		var nodeId = ob.nodeId;
				  		var timeout = null; //60 * 1000;

							var safedData;
				      try {
				        safedData = await runSafe({ code, safeContext, requires, threadEventHandlers, requestId, mainIpcId, nodeId, timeout})
				      }catch(err){
				      	console.error('Failed runNodeCodeInVMInMemory', err);
							  return reject(); // allow workers to continue
				      }

              // setupIpcWatcher({
              //   command: 'ThreadedSafeRun',
              //   code: code,
              //   SELF: opts.codeNode,
              //   INPUT: opts.dataNode || opts.inputNode,
              //   requestId: ob ? ob.requestId : uuidv4(), // from ob.context!!
              //   mainIpcId: ob ? ob.mainIpcId : uuidv4(),
              //   nodeId: opts.codeNode._id,
              //   timeout: opts.timeout,
              //   workGroup: opts.workGroup,
              //   workers: opts.workers,
              //   datetime: datetime.getSeconds() + '.' + datetime.getMilliseconds()
              // }, (r)=>{
              //   resolve(r.data);
              // })
              console.log('Returning safedData from runNodeCodeInVMInMemory');

              return resolve(safedData);

            } catch(err){
              console.error('Failed runNodeCodeInVMInMemory', err, Object.keys(opts.codeNode));
            }


          });

        },
        searchMemory: (opts) => {
          return new Promise(async (resolve, reject)=>{
            App.sm123 = App.sm123 || 1;
            let sm123 = App.sm123 + 0;
            App.sm123++;

            // console.log('Running searchMemory', sm123);

	          function getParentNodes(node){
	            let nodes = [node];
	            if(node.nodeId && !node.parent){
	              // console.error('parent chain broken in sameAppPlatform', node.type, node._id);
	              throw 'parent chain broken in sameAppPlatform'
	            }
	            if(node.parent){
	              nodes = nodes.concat(getParentNodes(node.parent));
	            }
	            return nodes;
	          }

	          // if parent chain doesnt exist (or is broken) then just rebuild on-the-fly? 
	          // - using reference version of nodesDb (w/ parents, children) 
	         
            // resolve('universe result! ' + ob.context.tenant.dbName);
            // console.log('searchMemory1');
            opts = opts || {};
            opts.lean = opts.lean ? true:false;
            opts.filter = opts.filter || {};
            opts.filter.sqlFilter = opts.filter.sqlFilter || {};
            opts.filter.dataFilter = opts.filter.dataFilter || {}; // underscore-query
            opts.filter.sameAppPlatform = opts.filter.sameAppPlatform ? true:false;
            // console.log('FetchNodes:', opts.filter.sqlFilter);
            // opts.filter.rootNodeFilter = opts.filter.rootNodeFilter; // underscore-query

            // if sameAppPlatform==true, then find and require for _root 
            // - $and for existing query, unless already isObject and has $and
            if(opts.filter.sameAppPlatform){
            	// build additional query for sameAppPlatform
            	// - expecting opts.SELF code of search origin 
            	try {

			          let parentNodes = getParentNodes(App.nodesDbParsedIds[opts.SELF._id]);

			          // see if first match of each is correct (aka "outwards" (not from root, but from nodes)) 
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

	            	let sapQuery = {
	            		$or: [{
		            		'_root.type': {
		            			$like: 'app_base'
		            		},
		            	},{
		            		'_root.type': {
		            			$like: 'app_parts'
		            		},
		            	}],
	            		'_root.data.appId': appBaseClosest.data.appId,
	            		'_root.nodes': {
	            			$elemMatch: {
	            				type: {
	            					$like: 'platform_nodes'
	            				},
	            				'data.platform': platformClosest.data.platform
	            			}
	            		}
	            	}

	            	// console.log('sapQuery:', sapQuery);


	            	if(lodash.isArray(opts.filter.dataFilter)){
	            		// array is treated as "or"?
	            		console.error('Unexpected opts.filter.dataFilter is array');
	            	} else if(lodash.isObject(opts.filter.dataFilter)){
	            		if(opts.filter.dataFilter['$and']){
	            			// push to existing
	            			opts.filter.dataFilter['$and'].push(sapQuery);
	            		} else {
	            			// no existing "$and", add it 
	            			opts.filter.dataFilter = {
	            				$and: [opts.filter.dataFilter,sapQuery]
	            			}
	            		}
	            	} else {
	            		console.error('unexpected dataFilter when sameAppPlatform');
	            	}
	            }catch(err){
	            	console.error('sameAppPlatform Failed:', err);
	            }
            }

            // console.log('dataFilter:', JSON.stringify(opts.filter.dataFilter,null,2));

            // Check cache 
            if(opts.cache && (process.env.IGNORE_MEMORY_CACHE || '').toString() !== 'true'){
              if(App.globalCache.SearchFilters[opts.cache]){
                // console.log('Used cache (skipped IPC fetchNodes)');
                return resolve(App.globalCache.SearchFilters[opts.cache]);
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
                if(nodes.length == App.nodesDbParsed.length){
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
                // App.globalCache.SearchFilters[opts.cache] = nodes; // UNCOMMENT TO ENABLE SEARCH CACHE (expensive/intensive?) 
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
              if(App.globalCache.SearchFilters[opts.cache]){
                console.log('Used cache (skipped IPC fetchNodes)');
                return resolve(App.globalCache.SearchFilters[opts.cache]);
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
                App.globalCache.SearchFilters[opts.cache] = nodes;
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
            //   if(App.globalCache.SearchFilters[opts.cache]){
            //     console.log('Used cache (skipped IPC fetchNodes)');
            //     return resolve(App.globalCache.SearchFilters[opts.cache]);
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
                App.globalCache.SearchFilters[opts.cache] = nodes;
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

            await App.graphql.updateAllNodes({},{active:false});

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

    let output;
    try {
      output = vm.run(ob.evalString);
      // process.send('OUTPUT:' + ob.evalString);
      // output could be a promise, so we just wait to resolve it (and resolving a value just returns the value :) )
      Promise.resolve(output)
      .then(async (data)=>{
          // console.log(JSON.stringify(data));
          // process.stdout.write(JSON.stringify(
          //     data
          // ));

          // console.log('DATA3:', data);

          // should be returning a Node!
          resolve(
            data
          ); // sends up from subprocess/child

          // prevent wipe for awhile 
          await Promise.resolve(funcInSandbox.universe.wipeFunc)

          // if(output && output.keepVM === true){
          //   // not used, always not kept (was maybe using when ob was nulled for scheduler...)
          // } else {
            output = null;
            setTimeout(()=>{
              // console.log('freememory-universe');
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
        console.error('---Failed in VM1!!!---- internal_server_error. --', ob.nodeId, err, err.toString ? err.toString():null, output);
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
      console.error('---Failed in VM2!!!----', ob.nodeId, err, err.toString ? err.toString():null);
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

  });
}


// Your AI is going to look for the data in its memory, but if you delete it, then it wont be able to find it. Just like removing a part of your brain, you cant just wish it back in place! 
// - "surgery" is performed by bypassing your AIs controls on data and directly editing the database 

export default incomingAIRequest;
export {
	incomingAIRequest,
	incomingAIRequestWebsocket,
	incomingAIRequestSocketIO,
	MySecond
}



// Proof-of-X network is storing: 
// - txId: js-schema for something (PointerType, ActionInput) 







