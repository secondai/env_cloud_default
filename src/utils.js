
import _ from 'lodash'

let lodash = _;
require("underscore-query")(lodash);


let utils = {};

utils.parentChainMatch = function(nodeId, parentChain, match){

	parentChain = parentChain || App.nodesDbParsedIds;

	// parentChain is the db of nodes
	let tmpNode = parentChain[nodeId];
	if(!tmpNode){
		// console.error('Missing node 983274');
		return null;
	}
	if(!match){
		// looking for root
		if(!tmpNode.nodeId){
			// is root
			return tmpNode;
		}
	} else {
		// check for match
		if(lodash.query([tmpNode], match).length){
			// matched 
			return tmpNode;
		}
	}
	if(!tmpNode.nodeId){
		// no more to check, return null
		return null;
	}
	return utils.parentChainMatch(parentChain, tmpNode.nodeId, match);
	
}

utils.nodesToTree = function(nodes, opts){
	// takes a list of all nodes
	// - returns a circular tree (each node in array has all parents/children available by reference) 

	let nodesById = {};
	let childrenForNodeId = {};

	for(let node of nodes){
		nodesById[node._id] = node;
		childrenForNodeId[node._id] = [];
	}

	for(let node of nodes){
		if(node.nodeId && childrenForNodeId.hasOwnProperty(node.nodeId)){
			childrenForNodeId[node.nodeId].push(node);
		}
		node.parent = node.nodeId ? nodesById[node.nodeId] : null;
		node.nodes = childrenForNodeId[node._id] || [];
	}

	return nodes;
}

utils.updateNode = async function(newNode, oldNode){

	// for inline updates 
	// - prevent having to re-run nodesDbParser every time! 

	// TODO: handle bulk updates nicely? 

	// Find changes between old and new node relationships 
	// - nodeId matters most! 
	let nodeInMemory = App.nodesDbParsedIds[newNode._id];

	// Handle relationship changes 
	// - nodeId changed 
	if(newNode.nodeId != oldNode.nodeId){
		console.log('Updated node relationship changed');
		// remove from children for previous 
		let oldChildIdx = App.childrenForNodeId[oldNode.nodeId].findIndex(n=>{
			return n._id == oldNode._id
		});
		if(oldChildIdx === -1){
			console.error('invalid oldChildIdx');
			return;
		}
		App.childrenForNodeId[oldNode.nodeId].splice(oldChildIdx, 1);

		nodeInMemory.nodeId = newNode.nodeId;

		// has a new parent? 
		if(newNode.nodeId){
			console.log('new parent for updated relationship');
			App.childrenForNodeId.push(nodeInMemory);
		}

		// update _root for each child of modified (and their children) 
		nodeInMemory.parent = newNode.nodeId ? App.nodesDbParsedIds[newNode.nodeId] : null;
		nodeInMemory._root = utils.parentChainMatch(nodeInMemory._id); // finds root
	}

	// Update nodeById's data, type, name, etc. 
	// - everything BUT relationships 
	// - updates by reference!
	nodeInMemory.name = newNode.name;
	nodeInMemory.type = newNode.type;
	nodeInMemory.data = newNode.data;
	nodeInMemory.updatedAt = newNode.updatedAt;
	nodeInMemory.createdAt = newNode.createdAt;

	// TODO: 
	// - emit event up/down chain "parent-was-modified" / "child-was-modified" / "child-3-levels-down-was-modified" (?) 

	return newNode;

}

utils.nodesDbParser = function(opts){
	// rebuids App.nodesDbParsed and App.nodesDbParsedIds
	// - NOT required to be run after updates (use utils.updateNode for inline updates) 
	return new Promise(async (resolve)=>{

		// Comes in as a list of nodes 
		// - parse 
		// - freeze 
		// - set global values 

		// comes in as Object.freeze'd (no need to copy/clone) (faster to deepClone?) 
		let nodes = JSON.parse(JSON.stringify(App.nodesDb));

		// same as utils.nodesToTree 
		// ------
		let nodesById = {};
		let childrenForNodeId = {};

		function findRoot(nodeId){
			let tmpNode = nodesById[nodeId];
			if(!tmpNode){
				// console.error('Missing node 983274');
				return null;
			}
			if(!tmpNode.nodeId){
				// is root
				return tmpNode;
			}
			return findRoot(tmpNode.nodeId);
		}

		for(let node of nodes){
			nodesById[node._id] = node;
			childrenForNodeId[node._id] = [];
		}

		for(let node of nodes){
			if(node.nodeId){
				childrenForNodeId[node.nodeId].push(node);
			}
			node.parent = node.nodeId ? nodesById[node.nodeId] : null;
			node.nodes = childrenForNodeId[node._id];
			node._root = findRoot(node._id);
		}
		// ------

		// Setting default values 
	  App.nodesDbParsed = nodes; //cJSON.parse(cJSON.stringify(nodes));
	  App.nodesDbParsedIds = nodesById; //cJSON.parse(cJSON.stringify(nodesById));
	  App.childrenForNodeId = childrenForNodeId;

	  // // Test parse result 
	  // let tmpCodeNodes = lodash.query(App.nodesDbParsed, {_id:'5ae65f24bacc8e0021e8db38'});
	  // // console.log('tmpCodeNodes', );
	  // console.log('tmpCodeNodes:', tmpCodeNodes.length, ((tmpCodeNodes[0].nodeId && !tmpCodeNodes[0].parent) ? 'Missing PARENT!!':''), tmpCodeNodes[0].nodeId);


	  // App.deepFreeze(App.nodesDbParsed);
	  // App.deepFreeze(App.nodesDbParsedIds);
	  // App.nodesDbParsed.forEach(node=>{
	  // 	Object.freeze(node);
	  // })
	  // Object.freeze(App.nodesDbParsed);
	  // Object.freeze(App.nodesDbParsedIds);

	  // console.info('event_emit: nodeDb.afterParse');
	  App.eventEmitter.emit('nodesDb.afterParse', Date.now());

	  resolve(App.nodesDbParsed);

	})
}


export default utils;
