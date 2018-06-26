
let utils = {};

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

utils.nodesDbParser = function(opts){
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
		}
		// ------

		// Setting default values 
	  App.nodesDbParsed = nodes; //cJSON.parse(cJSON.stringify(nodes));
	  App.nodesDbParsedIds = nodesById; //cJSON.parse(cJSON.stringify(nodesById));

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
