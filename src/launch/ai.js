

// Load in actions 
import { 
	requestData
} from './actions'

import runSafe from '../utils/run_safe'

import _ from 'lodash'

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


process.env.DEFAULT_LAUNCH_PLATFORM = 'cloud'; // device, browser, etc.

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
      let firstResponse = await this.runRequest({
        type: 'incoming_first:0.1.1:local:78882h37',
        data: externalIdentityNode // arrives as INPUT
      }, true)

      console.log('firstResponse', firstResponse);

    }

    // run "startup" action
    // - initiates server, heartbeat/cron 
    let startupResponse = await this.runRequest({
      type: 'incoming_startup:Qmf3289h9293fhsb',
      data: {} // arrives as INPUT
    }, true)

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

  let nodes,
  	nodeInMemoryIdx,
  	nodeInMemory;

	let sqlFilter,
		dataFilter;

	let useDataFilter,
		useSqlFilter;

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
					returnNodesObj = cJSON.parse(cJSON.stringify(nodes));
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
			let savedNode = await App.graphql.newNode(message.node);

			// Update memory!
			
			// have a "wait until next resolution" before emitting afterUpdate? 
			// - states: update-succeeded, updated-and-changes-available-after-reparse
			
			// TODO: figure out affected and only update as necessary! 
  		App.nodesDb.push(savedNode);

			if(message.skipRebuild){
				// skipping rebuild for now
				// - listen for next change before emitting afterCreate
				App.eventEmitter.once('nodesDb.afterParse',()=>{
	      	App.eventEmitter.emit('node.afterCreate', savedNode);
				});
			} else {
				if(message.skipWaitForResolution){
					App.utils.nodesDbParser()
					.then(()=>{
	      		App.eventEmitter.emit('node.afterCreate', savedNode);
					});
		    } else {
		    	await App.utils.nodesDbParser();
	      	App.eventEmitter.emit('node.afterCreate', savedNode);
		    }
		  }

		  eventEmitter.emit(
		    'response',
		    {
		      // id      : ipc.config.id,
		      id: message.id,
		      data: savedNode
		    }
		  );

  		break;


  	case 'updateNode':

  		// console.log('UpdateNode:', typeof message.node)
  		// console.log('UpdateNode2:', JSON.stringify(message.node, null,2))

  		nodeInMemoryIdx = App.nodesDb.findIndex(n=>{ // App.nodesDbParsedIds[message.node._id];
  			return n._id == message.node._id;
  		});

  		if(nodeInMemoryIdx === -1){
  			console.error('Node to update NOT in memory!', message.node._id);
  			return false;
  		}

  		// message.data = "filter"
			let updatedNode;
  		if(message.node.active === false){
  			console.log('RemoveNode');
  			updatedNode = await App.graphql.removeNode(message.node);
  			App.nodesDb.splice(nodeInMemoryIdx,1);
  		} else {
  			console.log('UpdateNode');
  			updatedNode = await App.graphql.updateNode(message.node);
  			App.nodesDb.splice(nodeInMemoryIdx, 1, updatedNode);

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
					App.utils.nodesDbParser()
					.then(()=>{
	      		App.eventEmitter.emit('node.afterUpdate', updatedNode);
		      	try {
		      		JSON.stringify(updatedNode);
		      	}catch(err){
		      		console.error(err);
		      	}
					});
		    } else {
		    	await App.utils.nodesDbParser();
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
		      data: updatedNode
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
			let removedNode = await App.graphql.removeNode(message.node);
			App.nodesDb.splice(nodeInMemoryIdx,1);

			// Update memory!
			if(message.skipRebuild){
				// skipping rebuild for now
				// - listen for next change before emitting afterCreate
				App.eventEmitter.once('nodesDb.afterParse',()=>{
	      	App.eventEmitter.emit('node.afterUpdate', message.node);
				});
			} else {
				if(message.skipWaitForResolution){
					App.utils.nodesDbParser()
					.then(()=>{
	      		App.eventEmitter.emit('node.afterUpdate', message.node);
					});
		    } else {
		    	await App.utils.nodesDbParser();
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
				App.utils.nodesDbParser();
			} else {
				await App.utils.nodesDbParser();
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
	  			console.log('clientId:', requestsCache[message.requestId].wsClientId);
					
					responseFunc(message.data);

  			} else {
  				// normal webosockets 
	  			console.log('Responding via websocket instead of httpResponse (came in as websocket request)');
	  			console.log('clientId:', requestsCache[message.requestId].wsClientId);
	  			console.log('wsRequestId:', requestsCache[message.requestId].keyvalue.wsRequestId,);

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







