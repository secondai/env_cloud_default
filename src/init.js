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


// Websockets 
const wss = new SocketServer({ server });

app.wsClients = {};
wss.on('connection', (ws) => {
  console.log('Websocket Client connected');

  // TODO: auth on connection? 

  // Manage clients
  let clientId = uuidv4();
  app.wsClients[clientId] = { ws };

  ws.on('open', async () => {

  	console.log('ws.on open');
  	
  	// not waiting for a response
		await app.secondAI.incomingAIRequestWebsocket({
			type: 'open',
			msg: null,
			clientId
		});

  });

  ws.on('message', async (data) => {

  	console.log('ws.on message');

  	// SHOULD wait for a response (handle request-response protocol) 
		let response = await app.secondAI.incomingAIRequestWebsocket({
			type: 'message',
			msg: data,
			clientId
		});

  });

  ws.on('close', async () => {
		
  	// delete app.wsClients[clientId];
  	console.log('ws.on close');

		await app.secondAI.incomingAIRequestWebsocket({
			type: 'close',
			msg: null,
			clientId
		});

  });
  
});




// setInterval(() => {
//   wss.clients.forEach((client) => {
//     client.send(new Date().toTimeString());
//   });
// }, 1000);


