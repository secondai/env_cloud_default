// if(process.env.NEW_RELIC_LICENSE_KEY){
//   require('newrelic');
// }

import 'newrelic';

import app from './app';

import url from 'url'
import { createServer } from 'http';
// import { subscriptionManager } from './subscriptions';
// import { SubscriptionServer } from 'subscriptions-transport-ws';
// import bodyParser from 'body-parser';
// import { execute, subscribe } from 'graphql';
// import schema from './schema';

const SocketServer = require('ws').Server;

// const WS_GQL_PATH = '/subscriptions';

const uuidv4 = require('uuid/v4');

const server = createServer(app);

var io = require('socket.io')(server);

// // handle websocket upgrades for subscriptions
// // - need to upgrade based on subdomain (use correct tenant graphql schema)
// server.on('upgrade', (request, socket, head) => {
// 	let parsed = url.parse(request.headers.origin);
// 	let subdomain = parsed.host.split('.')[0];
// 	app.tenantForSubdomain(subdomain)
// 	.then(app.graphql.getTenantSchema)
// 	.then(({schema})=>{

// 		const wsServer = SubscriptionServer.create(
// 		  {
// 		    execute,
// 		    subscribe,
// 		    schema: schema, // exists?
// 		  },
// 		  {
// 		    noServer: true
// 		  }
// 		);

// 		wsServer.wsServer.handleUpgrade(request, socket, head, (ws) => {
// 			console.log('emit connection!');
//       wsServer.wsServer.emit('connection', ws);
//     });

// 	})
// 	.catch(err=>{
// 		console.log('Invalid subdomain for socket, destroying', err);
// 		socket.destroy();
// 	})


//   // const pathname = url.parse(request.url).pathname;

//   // if (pathname === '/graphql/test1') {
//   //   wsServer1.wsServer.handleUpgrade(request, socket, head, (ws) => {
//   //     wsServer1.wsServer.emit('connection', ws);
//   //   });
//   // } else if (pathname === '/graphql/test2') {
//   //   wsServer2.wsServer.handleUpgrade(request, socket, head, (ws) => {
//   //     wsServer2.wsServer.emit('connection', ws);
//   //   });
//   // } else {
//     // socket.destroy();
//   // }

// });


let { PORT = 8080 } = process.env;

PORT = app.argv.PORT || PORT;

server.listen(PORT, () => {
  console.info(`Second AI Server is now running on http://localhost:${PORT}`); // eslint-disable-line no-console
  // console.info(
  //   `Second AI Server over web socket with subscriptions is now running on ws://localhost:${PORT}${WS_GQL_PATH}`
  // ); // eslint-disable-line no-console
});


// Websockets (socketio) 
app.wsClients = {};
app.socketioClients = {};
app.socketIOServer = io;
io.on('connection', function (socket) {
	console.log('Websocket connection');

  // Manage clients
  let clientId = uuidv4();
  app.socketioClients[clientId] = { socket };

  // notify on new connection...necessary?
  // - should not "await" here, never resolves? 
	// app.secondAI.incomingAIRequestSocketIO({
	// 	type: 'connection',
	// 	data: null,
	// 	clientId
	// });

  // socket.emit('news', { hello: 'world' });
  socket.on('request', function (RequestNode, responseFunc) {
  	// let requestId = uuidv4();
   //  console.log('RequestNode:', RequestNode);

		responseFunc = responseFunc || function(data){
			console.log('Response (NOT sent back to requesting client, no responseFunc provided:', data);
		}

		app.secondAI.incomingAIRequestSocketIO({
			type: 'request',
			data: RequestNode,
			clientId,
			responseFunc
		});

  });

  socket.on('message', function (RequestNode, responseFunc) {
  	console.log('Got MESSAGE via socketio, expecting "request" key');
  	if(responseFunc){
  		responseFunc('Invalid key "message" should be "request"');
  	} else {
  		console.log('callback/response function not provided with request')
  	}
  });

  socket.on('close', ()=>{
  	console.log('Socketio CLOSED');
  })

});



// const wss = new SocketServer({ server });
// app.wsClients = {};
// wss.on('connection', async (ws) => {
//   console.log('Websocket Client connected');

//   // TODO: auth on connection? 

//   // Manage clients
//   let clientId = uuidv4();
//   app.wsClients[clientId] = { ws };

//   // notify on new connection...necessary?
//   // - should not "await" here, never resolves? 
// 	app.secondAI.incomingAIRequestWebsocket({
// 		type: 'connection',
// 		msg: null,
// 		clientId
// 	});

//   ws.on('message', async (msg) => {

//   	console.log('ws.on message');

//   	// SHOULD wait for a response (handle request-response protocol) 
//   	// - uses existing "universe.httpResponse?" 
// 		let response = await app.secondAI.incomingAIRequestWebsocket({
// 			type: 'message',
// 			msg,
// 			clientId
// 		});

//   	// if(typeof msg != 'object'){
//   	// 	console.error('Did NOT receive an object for websocket request!', typeof msg);
//   	// 	console.log(msg);
//   	// 	return;
//   	// }

//   	// // MUST be either a request/response type 
//   	// switch(msg.type){
//   	// 	case 'request':

// 		 //  	// SHOULD wait for a response (handle request-response protocol) 
// 		 //  	// - uses existing "universe.httpResponse?" 
// 			// 	let response = await app.secondAI.incomingAIRequestWebsocket({
// 			// 		type: 'message',
// 			// 		msg,
// 			// 		clientId
// 			// 	});

// 			// 	// Send response! 
// 			// 	ws.send({
// 			// 		requestId: msg.requestId,
// 			// 		type: 'response',
// 			// 		data: response
// 			// 	});

//   	// 		break;

//   	// 	case 'response':
//   	// 		// TODO: check for something waiting, else error? 
//   	// 		console.log('Accepting response to my request (from RPI)');
//    //      eventEmitter.emit(`ws-response-${msg.requestId}`, msg.data);
//   	// 		break;

//   	// 	default:
//   	// 		break;
//   	// }


//   });

//   ws.on('close', async () => {
		
//   	// delete app.wsClients[clientId];
//   	console.log('ws.on close');

// 		await app.secondAI.incomingAIRequestWebsocket({
// 			type: 'close',
// 			msg: null,
// 			clientId
// 		});

//   });

// });



