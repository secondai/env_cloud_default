

// Load in actions 
import { 
	requestData
} from './actions'

import runSafe from '../utils/run_safe'
import buildCode from '../utils/build_code'

import request from 'request-promise-native'


import ipc from './ipc'

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


const BASIC_NODES = {
	default: require('./basics/default.json'),
	teacher: require('./basics/teacher.json'),
}

const {
  performance
} = require('perf_hooks');



var npm = require('npm-programmatic');
// var npm = require('npm');
let installedPackages = {};
// let npmReadyResolve;
// const waitNpmReady = new Promise((resolve)=>{
// 	npmReadyResolve = resolve;
// });
// npm.load(function(err) {
// 	console.log('npm loaded');
// 	npmReadyResolve();
//   // handle errors
//   if(err){
//     // what possible errors?? 
//     console.error('npm load error:', err);
//   }

//   npm.on('log', function(message) {
//     // log installation progress
//     console.log('[[NPM Install Log]]', message);
//   });
// });

// AI handles an input 
// - input includes authentication 
// - could be a JWT, or some other kind of asset 
// - function: handle_initiate_request: converts incoming request to AuthInputUser (input is the request, and all the Subjects with a Datasource PointerType) 

// "You said something, so the AI is going to handle the response and have an Output in some fashion" 
// - may also trigger lots of side effects, but there should always be a response (or at least one is requested and expected!) 

// the incoming request is for your AI to DO something (fetch data, take an action, etc.) and RETURN something. 
// - do ACTION with INPUT (query of code for fetching, or subject/pointers?) and return OUTPUT (subjects and pointers, following a schema). 
// - fetch each piece of DATA (subject/pointers) matching parameters/code. your AI determines what the data looks like when I access it 
//   - accessing is the same as 
//   - could also have a "this is the data you want to take?" vs "this is how you want to query the data and transform it" 
//   - effectively they want to run a Test against the data, and return data that passes the test 


// AI gets a REQUEST from an APP that has a JWT saying "I am X user"
// REQUEST is to gather data from X,Y datasources (using Z query (same query for all datasources??) )
// - "I want you to gather this information from these datasources" 
// - Action: query_datasources_v1:schemaLocation:txIdForSchema, ActionSchema got from 3rd party, for validating input format (i.e query+datasourceIds)
//   - function: allow_incoming_request_action (action can be allowed/denied based on the AuthInputUser, Action, and ActionData [schema defined on blockchain]) -> returns Boolean on allowed or not
// - authorized User: Subject/Pointer combo

// after fetching data, make sure the fetched data passes the Tests we defined for what we WANTED (the friend's AI could have returned some shitty data, which we dont want to just pass-thru) 

// action: query these datasources and return the data for this query 
// - an action this AI can do is "query_datasources" 

// can run a "validate" function for each piece of data that shows problems with data (2 of some PointerType when only 1 is allowed)

let requestsCache = {};

const uuidv4 = require('uuid/v4');
const events = require('events');
let eventEmitter = new events.EventEmitter();
app.eventEmitter = eventEmitter;

// Keep nodes in memory for easy access!
// - rebuilds on changes, etc. 
app.nodesDb = [];
// app.nodesDbCopy = [];
app.nodesDbParsed = []; // gets frozen!
app.nodesDbParsedIds = {}; // _ids ref to app.nodesDbParsed object

// for creating a group of VMs that are processing things in parallel 
// - the group name is passed in, as well as the amount to allow at a time 
var queue = require('queue')
let parallelVMs = {};

const mainIpcId = ipc.__customId; // this is a uuid set in ./ipc.js 

// Handle ipc server incoming commands
// ipc.server.on('command',async (message, socket) => {
eventEmitter.on('command',async (message, socket) => {
  // console.log(message);

  // message include the data and the tenant! 

  // message = JSON.parse(message); 

  // console.log('IPC Command:', message.command);

  // await app.graphql.newHistory({
  // 	type: 'incoming_ipc_command:' + message.command, // should be a Node type (for easier display)  
  // 	logLevel: 'info',
  // 	data: {
  // 		message: message
  // 	}
  // })

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
			// let nodes = await app.graphql.fetchNodes(message.filter);



   //  	let timeStart1 = (new Date());

			// let nodesDb = JSON.parse(JSON.stringify(app.nodesDb));

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

			// // console.log('DB Nodes. Total:', app.nodesDb.length, 'Possible:', nodesDb.length); //, nodes.length);

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

			// console.log('DB Nodes. Total:', app.nodesDb.length, 'Possible:', nodesDb.length, 'Time:', (timeEnd1.getTime() - timeStart1.getTime())/1000, (timeStart2.getTime() - timeStart1.getTime())/1000); //, nodes.length);

			dataFilter = message.filter.dataFilter; // priority, easier/flexible 
			sqlFilter = message.filter.sqlFilter;

			// using either underscore-query or lodash.filter (sqlFilter) 
			if(!lodash.isEmpty(dataFilter)){
				useDataFilter = true;
			} else if(!lodash.isEmpty(sqlFilter)){
				useSqlFilter = true;
			}

			if(useDataFilter){
				nodes = lodash.query(app.nodesDbParsed, dataFilter);
			} else if(useSqlFilter){
				nodes = lodash.filter(app.nodesDbParsed, sqlFilter);

				// // _id only
				// if(sqlFilter._id){
				// 	console.log('sqlFilter._id:', sqlFilter._id, nodes.length, ((nodes[0].nodeId && !nodes[0].parent) ? 'Missing PARENT!!':''), nodes[0].nodeId);
				// }

			} else {
				// all nodes
				nodes = app.nodesDbParsed;
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
					// returnNodesObj = nodes;
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

			let nodesDb2 = JSON.parse(JSON.stringify(app.nodesDbParsed));
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

			console.log('fetchNodesInMemory: DB Nodes. Total:', app.nodesDb.length, 'ParsedTotal:', app.nodesDbParsed.length, 'Possible:', nodesDb2.length, 'Time:',  (timeStart4.getTime() - timeStart3.getTime())/1000, (timeEnd2.getTime() - timeStart4.getTime())/1000, (timeEnd2.getTime() - timeStart3.getTime())/1000); //, nodes.length);


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
    		let foundNodeById = app.nodesDbParsedIds[_id];
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
			// let savedHistory = await app.graphql.newHistory({
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
			let node = await app.graphql.findNode(message.filter);


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
			let savedNode = await app.graphql.newNode(message.node);

			// Update memory!
			
			// have a "wait until next resolution" before emitting afterUpdate? 
			// - states: update-succeeded, updated-and-changes-available-after-reparse
			
			// TODO: figure out affected and only update as necessary! 
  		app.nodesDb.push(savedNode);

			if(message.skipRebuild){
				// skipping rebuild for now
				// - listen for next change before emitting afterCreate
				app.eventEmitter.once('nodesDb.afterParse',()=>{
	      	app.eventEmitter.emit('node.afterCreate', savedNode);
				});
			} else {
				if(message.skipWaitForResolution){
					app.nodesDbParser()
					.then(()=>{
	      		app.eventEmitter.emit('node.afterCreate', savedNode);
					});
		    } else {
		    	await app.nodesDbParser();
	      	app.eventEmitter.emit('node.afterCreate', savedNode);
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

  		nodeInMemoryIdx = app.nodesDb.findIndex(n=>{ // app.nodesDbParsedIds[message.node._id];
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
  			updatedNode = await app.graphql.removeNode(message.node);
  			app.nodesDb.splice(nodeInMemoryIdx,1);
  		} else {
  			console.log('UpdateNode');
  			updatedNode = await app.graphql.updateNode(message.node);
  			app.nodesDb.splice(nodeInMemoryIdx, 1, updatedNode);

  		}

			// Update memory!

			// have a "wait until next resolution" before emitting afterUpdate? 
			// - states: update-succeeded, updated-and-changes-available-after-reparse
			
			// TODO: figure out affected and only update as necessary! 


			if(message.skipRebuild){
				// skipping rebuild for now
				// - listen for next change before emitting afterCreate
				app.eventEmitter.once('nodesDb.afterParse',()=>{
	      	app.eventEmitter.emit('node.afterUpdate', updatedNode);
				});
			} else {
				if(message.skipWaitForResolution){
					app.nodesDbParser()
					.then(()=>{
	      		app.eventEmitter.emit('node.afterUpdate', updatedNode);
		      	try {
		      		JSON.stringify(updatedNode);
		      	}catch(err){
		      		console.error(err);
		      	}
					});
		    } else {
		    	await app.nodesDbParser();
	      	app.eventEmitter.emit('node.afterUpdate', updatedNode);
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

  		nodeInMemoryIdx = app.nodesDb.findIndex(n=>{ // app.nodesDbParsedIds[message.node._id];
  			return n._id == message.node._id;
  		});

  		if(nodeInMemoryIdx === -1){
  			console.error('Node to remove NOT in memory!', message.node._id);
  		}

  		// console.log('UpdateNode:', typeof message.node)
  		// console.log('UpdateNode2:', JSON.stringify(message.node, null,2))
  		console.log('RemoveNode');

  		// message.data = "filter"
			let removedNode = await app.graphql.removeNode(message.node);
			app.nodesDb.splice(nodeInMemoryIdx,1);

			// Update memory!
			if(message.skipRebuild){
				// skipping rebuild for now
				// - listen for next change before emitting afterCreate
				app.eventEmitter.once('nodesDb.afterParse',()=>{
	      	app.eventEmitter.emit('node.afterUpdate', message.node);
				});
			} else {
				if(message.skipWaitForResolution){
					app.nodesDbParser()
					.then(()=>{
	      		app.eventEmitter.emit('node.afterUpdate', message.node);
					});
		    } else {
		    	await app.nodesDbParser();
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
				app.nodesDbParser();
			} else {
				await app.nodesDbParser();
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

	  			let thisWs = app.wsClients[ requestsCache[message.requestId].wsClientId ].ws;
					
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


    // let ExternalIdentityNode = JSON.stringify(JSON.stringify({
    //   type: 'external_identity:0.0.1:local:8982f982j92',
    //   data: {
    //     publicKey: 'test1'
    //   },
    //   nodes: [{
    //     type: 'external_identity_connect_method:0.0.1:local:382989239hsdfmn',
    //     data: {
    //       method: 'http',
    //       connection: 'test1'
    //     }
    //   }]
    // }));

    // // add to ipfs (todo) 
    // let ipfsHash = 'test2';

    // let request = require('request');

    // let ipfsReqData = JSON.parse('{"operationName":null,"variables":{"hash":"'+ipfsHash+'","text":'+ExternalIdentityNode+'},"query":"mutation ($hash: String    $text: String) {  ipfsFileCreate(record: {hash: $hash   text: $text}) {    recordId    __typename  }}"}');

    // let ipfsResult = await request.post({
    //   method: 'post',
    //   url: process.env.LANGUAGE_SERVER, //'http://docker.for.mac.localhost:7011/graphql',
    //   body: ipfsReqData,
    //   json: true
    // })


  	console.log('Second Now Ready (loaded, nothing AT ALL run yet tho (learnBasics might run))');
  	secondReadyResolve(); //

    app.nodesDbParser = function(){
    	return new Promise(async (resolve)=>{

				// comes in as Object.freeze'd (no need to copy/clone) (faster to deepClone?) 
				let nodes = JSON.parse(JSON.stringify(app.nodesDb));

				let nodesById = {};
				let childrenForNodeId = {};

				for(let node of nodes){
					nodesById[node._id] = node;
					childrenForNodeId[node._id] = [];
				}

				for(let node of nodes){
					if(node.nodeId){
						// is a child
						// if(!childrenForNodeId[node.nodeId]){
						// 	childrenForNodeId[node.nodeId] = [];
						// }
						childrenForNodeId[node.nodeId].push(node);
					}
					// // make sure children reference array exists 
					// if(!childrenForNodeId[node._id]){
					// 	childrenForNodeId[node._id] = [];
					// }
					node.parent = node.nodeId ? nodesById[node.nodeId] : null;
					node.nodes = childrenForNodeId[node._id];
					// Object.freeze(node.data);
					// app.deepFreeze(node.data);
				}

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

				// // console.log('DB Nodes. Total:', app.nodesDb.length, 'Possible:', nodesDb.length); //, nodes.length);
				// let nodesById = {};

			 //  const fetchNodesQuick = (filterObj, depth, addToIdList) => {
			 //    // also fetches all child nodes, for 10 levels deep
			 //    return new Promise(async (resolve,reject)=>{
			 //      depth = depth || 1;
			 //      depth++;
			 //      if(depth > 6){
			 //        // too deep! (or pointing in a loop!?) 
			 //        return resolve([]);
			 //      }

			 //      // necessary to parse/stringify instead of using circular json? 
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

			 //        if(addToIdList){
			 //        	nodesById[node._id] = node;
			 //        }

			 //      }

			 //      // console.log('After nodes');
			 //      resolve(nodes);

			 //    });
			 //  }

			 //  let nodes = await fetchNodesQuick({}, 1, true);

			  app.nodesDbParsed = cJSON.parse(cJSON.stringify(nodes));
			  app.nodesDbParsedIds = cJSON.parse(cJSON.stringify(nodesById));

			  // // Test parse result 
			  // let tmpCodeNodes = lodash.query(app.nodesDbParsed, {_id:'5ae65f24bacc8e0021e8db38'});
			  // // console.log('tmpCodeNodes', );
			  // console.log('tmpCodeNodes:', tmpCodeNodes.length, ((tmpCodeNodes[0].nodeId && !tmpCodeNodes[0].parent) ? 'Missing PARENT!!':''), tmpCodeNodes[0].nodeId);

			  // CANNOT FREZE: https://github.com/patriksimek/vm2/issues/136
			  // app.deepFreeze(app.nodesDbParsed);
			  // app.deepFreeze(app.nodesDbParsedIds);
			  // app.nodesDbParsed.forEach(node=>{
			  // 	Object.freeze(node);
			  // })
			  // Object.freeze(app.nodesDbParsedIds);

			  // console.info('event_emit: nodeDb.afterParse');
			  app.eventEmitter.emit('nodesDb.afterParse', Date.now());

			  resolve(app.nodesDbParsed);

    	})
    }

    // app.nodesDbParser = function(){
    // 	return new Promise(async (resolve)=>{

				// // comes in as Object.freeze'd (no need to copy/clone) (faster to deepClone?) 
				// let nodesDb = JSON.parse(JSON.stringify(app.nodesDb));

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

				// // console.log('DB Nodes. Total:', app.nodesDb.length, 'Possible:', nodesDb.length); //, nodes.length);
				// let nodesById = {};

			 //  const fetchNodesQuick = (filterObj, depth, addToIdList) => {
			 //    // also fetches all child nodes, for 10 levels deep
			 //    return new Promise(async (resolve,reject)=>{
			 //      depth = depth || 1;
			 //      depth++;
			 //      if(depth > 6){
			 //        // too deep! (or pointing in a loop!?) 
			 //        return resolve([]);
			 //      }

			 //      // necessary to parse/stringify instead of using circular json? 
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

			 //        if(addToIdList){
			 //        	nodesById[node._id] = node;
			 //        }

			 //      }

			 //      // console.log('After nodes');
			 //      resolve(nodes);

			 //    });
			 //  }

			 //  let nodes = await fetchNodesQuick({}, 1, true);

			 //  app.nodesDbParsed = nodes;
			 //  app.nodesDbParsedIds = nodesById;

			 //  app.deepFreeze(app.nodesDbParsed);
			 //  app.deepFreeze(app.nodesDbParsedIds);

			 //  console.info('event_emit: nodeDb.afterParse');
			 //  app.eventEmitter.emit('nodesDb.afterParse', Date.now());

			 //  resolve(nodes);

    // 	})
    // }

    // fetch and run code, pass in 
    let nodesInMemory = await app.graphql.fetchNodesSimple();

		app.nodesDb = nodesInMemory;
		// app.nodesDbCopy = JSON.parse(JSON.stringify(nodesInMemory));
    console.log('NodesDb populated!', app.nodesDb.length);
		// app.deepFreeze(app.nodesDbCopy); // prevent changes by freezing object
		await app.nodesDbParser();
		console.log('app.nodesDbParsed updated', app.nodesDbParsed.length);

    // // 
    // let nodesFalse = await app.graphql.fetchNodesSimple({active: false});
    // console.log('NodesDb populated2!', nodesFalse.length);


    console.log('Nodes:', nodesInMemory.length);
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
						let savedChildNode = await app.graphql.newNode(newChildNode);

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
      for(let node of zipResult.nodes){ //; //BASIC_NODES[process.env.STARTUP_BASE]){
      	totalNodes++;
      	let savedNode = await app.graphql.newNode(node);
        await saveChildNodes(savedNode._id, node.nodes);
      }

			// Update memory!
	    app.nodesDb = await app.graphql.fetchNodesSimple();
			// app.nodesDbCopy = JSON.parse(JSON.stringify(app.nodesDb));
			// app.deepFreeze(app.nodesDbCopy); // prevent changes by freezing object
			await app.nodesDbParser();

      console.log('Inserted Nodes! Total:', totalNodes); //, ' Root:', BASIC_NODES[process.env.STARTUP_BASE].length);

			// Now trigger "first" action 

      // Get ExternalIdentity Node for first request (MUST exist?) 
      // - storing internally, then removing and re-adding in the "learn" step 
    	let externalIdentityNodes = await app.graphql.fetchNodes({
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
    // - initiates heartbeat/cron 
    let startupResponse = await this.runRequest({
      type: 'incoming_startup:Qmf3289h9293fhsb',
      data: {} // arrives as INPUT
    }, true)


    // start running heartbeat 
    // - is started inside "incoming_first" node (even though it is long-running, I think we'll allow it?) 


	}
	runRequest(InputNode, skipWrappingInputNode, reqObj, resObj, wsClientId, socketioResponseFunc){

    // wait for memory to be ready!
    return new Promise((resolve, reject)=>{

    	// console.log('Waiting for secondReady for runRequest');

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
        console.log('Running web request (expecting express_obj, websocket_obj):', InputNode.type); //, this.state.nodesDb);

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
	      app.globalCache = app.globalCache || {};
	      app.globalCache.SearchFilters = app.globalCache.SearchFilters || {};

	      app.memoryCache = cacheManager.caching({
	      	store: 'memory',
	      	max: 100,
	      	ttl: 10 // seconds
	      });


	      if(app.globalCache.SearchFilters[ 'incoming_from_universe:CodeNode' ] && (process.env.IGNORE_MEMORY_CACHE || '').toString() != 'true'){
	      	console.log('Using cached incoming_from_universe');
	        nodeId = app.globalCache.SearchFilters[ 'incoming_from_universe:nodeId' ];
	      	CodeNode = app.globalCache.SearchFilters[ 'incoming_from_universe:CodeNode' ];
	      } else {


	        if(1==1){
	        	// NEW way (in specified app_base)

		        nodes = await app.graphql.fetchNodes({
		          type: ((process.env.OLD_INCOMING || '').toString() == 'true') ? 'incoming_from_universe:0.0.1:local:298fj293':'incoming_from_uni:Qmsldfj2f'
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
		        	// let node2 = JSON.parse(JSON.stringify(node));
		        	// delete node2.data;
		        	// node2.nodes = (node2.nodes || []).map(n=>{
		        	// 	delete n.data;
		        	// 	return n;
		        	// });
		        	// console.log('NODE2:', node2.parent ? node2.parent.type:null); //, JSON.stringify(node2,null,2));
		        	try {
			        	let parent = node.parent;
			        	if(parent.type.split(':')[0] != 'platform_nodes' || parent.data.platform != 'cloud'){
			        		return false;
			        	}
			        	let appbaseParent = parent.parent;
			        	if(appbaseParent.type.split(':')[0] == 'app_base' && 
			        		appbaseParent.data.appId == (process.env.DEFAULT_LAUNCH_APPID || 'cloud_appstore') &&
			        		appbaseParent.data.release == 'production'
			        		){
			        		// console.log('Found app_base for incoming_from_universe');
			        		return true;
			        	}
			        }catch(err){}
		        	return false;
		        });
		        

		      } else {
		      	// OLD (root-level 

		        nodes = await app.graphql.fetchNodes({
		        	nodeId: null,
		          type: 'incoming_from_universe:0.0.1:local:298fj293'
		        });

		        // console.log('NODES:', nodes);
		        if(!nodes || !nodes.length){
		          console.error('Missing incoming_from_universe:0.0.1:local:298fj293 Node');
		          return;
		        }

		        foundIncomingNode = nodes[0];
		      }

	        if(!foundIncomingNode){
	        	console.error('Missing foundIncomingNode');
	        	return false;
	        }

	        nodeId = foundIncomingNode._id;
	        CodeNode = _.find(foundIncomingNode.nodes,{type: 'code:0.0.1:local:32498h32f2'});

	        // Get parent/nodes chain of CodeNode (for app_base) 
	        // - requires rebuild
	        let tmpCodeNodeWithParents = await app.graphql.fetchNodes({
	          _id: CodeNode._id
	        });
	        CodeNode = tmpCodeNodeWithParents[0];

	        if(!CodeNode){
	          console.error('Missing code:0.0.1:local:32498h32f2 in app a22a4864-773d-4b0b-bf69-0b2c0bc7f3e0 to handle incoming_web_request');
	          return;
	        }

	        // cache default CodeNode 
	        app.globalCache.SearchFilters[ 'incoming_from_universe:nodeId' ] = nodeId;
	        app.globalCache.SearchFilters[ 'incoming_from_universe:CodeNode' ] = CodeNode;

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

        // console.log('UniverseInputNode',UniverseInputNode);
        // console.log('CodeNode',CodeNode);

        // try {
        // 	console.log('-1');
        // 	console.log(CodeNode.parent.type.split(':')[0]);
        // 	console.log(CodeNode.parent.parent.type.split(':')[0]);
        // 	console.log(CodeNode.parent.parent.parent.type.split(':')[0]);
        // 	console.log(CodeNode.parent.parent.parent.parent.type.split(':')[0]);
        // 	console.log(CodeNode.parent.parent.parent.parent.parent.type.split(':')[0]);
        // 	console.log('-2');
        // }catch(err){

        // }


	      // Set context
	      let safeContext = {
	        // subject: tmpSubject,
	        // pointer,
	        SELF: CodeNode, 
	        INPUT: UniverseInputNode, // this is NOT validated at this step, cuz we are just passing in a Node (type, data) that I can decide how to handle. Ideally the passed-in schema types includes:  (inputData, outputFormat/info)
	        // user: context.user, // user._id (this should be the datasource, or auth, or something else??) (might have Auth provided over the top, or assumed?)
	      }
	      let threadEventHandlers = {};
	      // console.log('RunSafe1');

	      // this should be updateable through ipc from the ai! 
	      let requires = [
	      	// 'vm2',
	      	// '@stdlib/stdlib',
	      	'lodash'
	      ];

	      // console.log('BODY', JSON.stringify(req.body,null,2));

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
		      	mainIpcId, // from top of file
		      	nodeId, 
		      	timeout: 20 * 1000 
		     	})
		    }catch(err){
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


        // // run in vm
        // let responseNode;
        // // try {
        // //   responseNode = await runSafe(CodeNode, UniverseInputNode);
        // // }catch(err){
        // //   console.error('In VM error:', err);
        // //   responseNode = {
        // //     type: 'err_in_vm:3',
        // //     data: {
        // //       err: err || {},
        // //       error: err
        // //     }
        // //   }
        // // }

        // console.log('ResponseNode:', responseNode);

        // resolve(responseNode);

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

		// console.log('RESPONSE (from hardcoded):', response);




		// // expecting output to be a node 
		// switch(response.type){
		// 	case 'second_response:Qmsdfklj23f89j':
		// 		break;

		// 	case 'redirect_response:Qms899832f':
		// 		break;

		// 	case 'render_response:Qms899832f':
		// 		break;

		// }
		// try {
		// }catch(err){

		// }

		// return resolve({
		// 	secondResponse: {
		// 		type: 'output_generic:0.0.1:local:239f2382fj2983f',
		// 		data: response
		// 	}
		// });



		// let nodes = await app.graphql.fetchNodes({
		// 	nodeId: null,
		// 	// type: 'incoming_from_universe:0.0.1:local:298fj293',
		// 	type: 'incoming_web_request:0.0.1:local:29832398h4723'
		// 	// type: 'incoming:0.0.1:local:329fjs98dhf23ff3'
		// });

		// console.log('Nodes for incoming_from_universe:', nodes.length); 

		// // Pass in "how to break out of your environment" and "how to validate things" as possible actions? 
		// // - "how to validate" should be consistent? 
		// // - somehow have "global" functions that can be called from any other code function? 
		// //   - these exist in the runSafe code (ThreadedRunSafe)....but also should be called via ipc (above) or some other consistent (and repeatble) packaging mechanism? 

		// // this should be a code block? 
		// // - the schema should define the other types?? 
		// // - or have it immediately look for the Code Block associated with an incoming request? 


		// // We are expecting/requiring that the node with type: incoming_web_request... will have a consistent format for the data 
		// // - validate it 


		// // todo: run jsSchema validation 
		// // - pass in type/id and retrieve from Languages Table (bitcoin) 

		// // Schema = schema({
		// // 	dataSchema: ...,
		// // 	inputSchema: ..., // props
		// //   outputSchema: ...,
		// //   '*':null
		// // })

		// let safedData = null;

		// if(nodes.length == 1){

		// 	// load some info from the schema before requesting data? 
		// 	// - load the "code" from the ChildNode
		// 	// could also define by a further pointer?? 
		// 	let codeNode = _.find(nodes[0].nodes,{type:'code:0.0.1:local:32498h32f2'});
		// 	let nodeId = nodes[0]._id;

		// 	// runCode(code, req.body); // "body" should be a `{type: "xyz", data: {..}}` format (a Node) 



  //     // Set context
  //     let safeContext = {
  //       // subject: tmpSubject,
  //       // pointer,
  //       SELF: codeNode, 
  //       INPUT: req.body, // this is NOT validated at this step, cuz we are just passing in a Node (type, data) that I can decide how to handle. Ideally the passed-in schema types includes:  (inputData, outputFormat/info)
  //       // user: context.user, // user._id (this should be the datasource, or auth, or something else??) (might have Auth provided over the top, or assumed?)
  //     }
  //     let threadEventHandlers = {};
  //     // console.log('RunSafe1');

  //     // this should be updateable through ipc from the ai! 
  //     let requires = [
  //     	// 'vm2',
  //     	// '@stdlib/stdlib',
  //     	'lodash'
  //     ];

  //     // console.log('BODY', JSON.stringify(req.body,null,2));

  //     // this is NOT limited 
  //     // - let the brain handle responses! 
  //     // - potentially the brain could install software that watches this and prevents more attacks, but doesn't need to be built-in 

  //     console.log('thisRequestId1:', thisRequestId);
  //     safedData = await runSafe({ 
  //     	code: codeNode.data.code, 
  //     	safeContext, 
  //     	requires, 
  //     	threadEventHandlers, 
  //     	requestId: thisRequestId, 
  //     	mainIpcId, // from top of file
  //     	nodeId, 
  //     	timeout: 20 * 1000 
  //    	})
  //     // we can expect safedData to match the outputSchema schema from incoming_web_request...
  //     // - the idea is that it can NEVER respond outside the outputSchema, otherwise what is sent back is ignored! 
  //     //   - could always send data to the incoming request caller a different way, but the response must be the requested format! 

		// } else {
		// 	console.error('Had multiple nodes, or none!');
		// }


		// // Find Code -> Run Code with Parameters and access to XYZ functions (environment functions) 
		// // - when running, code handles verification of schema (it knows what type it is?) 
		// // - could also be done automatically when calling? ...AI handles it? No real "rules" just "best practices" so your AI responds smartly

		// // ALWAYS outputs a Node! 
		// // - error, etc. 
		// resolve({
		// 	secondResponse: {
		// 		type: 'output_generic:0.0.1:local:239f2382fj2983f',
		// 		data: safedData
		// 	}
		// });






				// await requestData({
				// 	AuthUser, // single subject/pointer (could be null!) 
				// 	ActionSchema,
				// 	ActionData, // includes query with code, likely multiple datasources! (mine, remote/friends) 
				// 	ResponseSchema, // dont really need to include? 
				// 	ResponseHandler // for returning the response (handled on this page) 
				// });


		// All of the code below should be in-data (as part of a Code Block that is called from above, with correct input schema) 


		// depending on the type of request (websocket, http, for data, an action, etc.) either return immediately or do something else
		// - caller gets to define how they want to be told! 

		// do NOT async yet! 
		// - don't let the caller off the hook (they haven't told us how they want to receive a response, and we haven't decided if that is OK yet) 

		// get the AuthUser for the request 
		// - input can be a JWT from an App, nobody (if not auth'd yet, handle login!), or other AI/friend/company datasource
		// - input should also have AuthSchema that defines what type of request it is! 
		// - function: fetch_authuser_for_request
		// - returns a single Subject/Pointers (if multiple match, then Error!) 

		// validate the ActionSchema (which is simply passed as a String) 
		// - aka "do I know how to handle this Action, given X data?" 
		//   - lookup ActionSchema from internal data (look for an active Subject with PointerType of correct schema, 1st matching result) 

		// Decide if AuthUser is allowed to run this ActionSchema 
		// - function: authuser_allowed_to_run_action 
		// - inputs: AuthUser, ActionSchema, 

		// Decide how to return the result (wait for output before res.send, send incrementally via websocket after sending resultID via res.send(), call different endpoint, notify other AI, etc.) 
		// - most common: wait_for_output (coming from an HTTP request) 
		// - may also depend on ActionSchema 
		// - user supplied a ResponseSchema/OutputSchema  (Could be "store the output in the AI cache" or "output the result to an ML algorith!)
		// - function: resolve_how_to_return_input 
		// - inputs: AuthUser, ActionSchema SubjectPointers, ResponseSchema Subject/Pointers, Possible Options available to the AI?, (ability to query for more subjects/pointers and evaluate them?) 
		// - returns: what to do (return immediately using a resultID for websockets, say the OutputSchema isn't supported, etc. )  

		// Run GasCost check 
		// - see what the user is offering for Gas, what we are allowing, etc. 
		// - function: check_gas_cost 
		// - input: AuthUser, GasOffered (verified?), ActionSchema, ActionData 
		// - output: allowed to continue, or more needed? Uses a valid OutputSchema that *should* include a way to negotiate GasCost? 

		// may be returning a response now 
		// - sets up a data channel to return the response? 


		// Run the ACTION, with the input! 
		// - or if the action doesn't exist, die? 
		// - action is supposed to be a "local" application, with additional `yarn add` packages, etc. 
		// - input is according to the ActionSchema (so we know exactly what data to expect!) 

		// Should all actions be installed as separate apps? 
		// - seems to make sense to keep it as distributed as possible
		// - maybe all actions except `query_datasources` ? 
		//   - what if somebody doesn't want to be able to do any querying, yet still wants to have a place on the network?? 

		// switch(action){

		// 	// query local datasources (local and remote), includes how to handle "delayed" results 
		// 	// - datasource has info for "where is this datasource, how do I connect/send to it, and how do I auth with it) 
		// 	// - this is used in a 1-2-step by an App for querying for "all friends" (it gets all Datasources first, then says "query these datasources") 
		// 	case 'query_datasources_v1:local:2947329754334': // I better do something fun with this fucking ID, everyone will get to see it 
		// 		// standard way of querying datasources that an AI has access to 
		// 		// - both local, and remote! (mine, and friends) 
		// 		// - eventually this should handle caching also 
		// 		await requestData({
		// 			AuthUser, // single subject/pointer (could be null!) 
		// 			ActionSchema,
		// 			ActionData, // includes query with code, likely multiple datasources! (mine, remote/friends) 
		// 			ResponseSchema, // dont really need to include? 
		// 			ResponseHandler // for returning the response (handled on this page) 
		// 		});
		// 		break;

		// 	case 'send_request_to_datasource:local:23f9hjs89fh9s8df':
		// 		// make a request to a local datasource 
		// 		break;

		// 	case 'convert_text_to_command:local:39jsjf9f032jds':
		// 		// text was submitted, convert it to a "likely command" 
		// 		// - 
		// 		break;

		// 	case 'install_capability:local:8329fj2389jsf23':
		// 		// install an application using `yarn add` ! 
		// 		// - this is how additional capabilities can be added to an AI :) 
		// 		// - because we're running inside a Docker container, installing new things is a'ok! (it only affects my instance!) 
		// 		break;

		// 	case 'add_timing_event:local:sdkfj829j9j8392jf3':
		// 		// trigger something to happen at a later date 
		// 		// - should be checking the "what to run later" against a schema (must be one of the other ) 
		// 		break;


		// 	// enable other actions through apps? 
		// 	// - would require additional `yard add` stuff? How to do that without corrupting other installations? 
		// 	// - entire reason for running in a Docket container! 
		// 	case '...':
		// 		break;

		// 	default:

		// }

		// Now that I have a result/output: check the previous OutputSchema result to see what I should do with the output data 
		// - could be pushing onto a websocket queue, or just returning the data, or sending it somewhere else (?) 

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
				clientId, // for sending responses via app.wsClients[clientId].socket.send(...) 
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
				clientId // for sending responses via app.wsClients[clientId].ws.send(...) 
			}
		}, false, null, null, clientId);

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







