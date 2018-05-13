// if(process.env.NEW_RELIC_LICENSE_KEY){
//   require('newrelic');
// }

import 'newrelic';

import app from './app';

import url from 'url'
import { createServer } from 'http';
import { subscriptionManager } from './subscriptions';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import bodyParser from 'body-parser';
import { execute, subscribe } from 'graphql';
// import schema from './schema';

const WS_GQL_PATH = '/subscriptions';

const server = createServer(app);

// handle websocket upgrades for subscriptions
// - need to upgrade based on subdomain (use correct tenant graphql schema)
server.on('upgrade', (request, socket, head) => {
	let parsed = url.parse(request.headers.origin);
	let subdomain = parsed.host.split('.')[0];
	app.tenantForSubdomain(subdomain)
	.then(app.graphql.getTenantSchema)
	.then(({schema})=>{

		const wsServer = SubscriptionServer.create(
		  {
		    execute,
		    subscribe,
		    schema: schema, // exists?
		  },
		  {
		    noServer: true
		  }
		);

		wsServer.wsServer.handleUpgrade(request, socket, head, (ws) => {
			console.log('emit connection!');
      wsServer.wsServer.emit('connection', ws);
    });

	})
	.catch(err=>{
		console.log('Invalid subdomain for socket, destroying', err);
		socket.destroy();
	})


  // const pathname = url.parse(request.url).pathname;

  // if (pathname === '/graphql/test1') {
  //   wsServer1.wsServer.handleUpgrade(request, socket, head, (ws) => {
  //     wsServer1.wsServer.emit('connection', ws);
  //   });
  // } else if (pathname === '/graphql/test2') {
  //   wsServer2.wsServer.handleUpgrade(request, socket, head, (ws) => {
  //     wsServer2.wsServer.emit('connection', ws);
  //   });
  // } else {
    // socket.destroy();
  // }

});


let { PORT = 8080 } = process.env;

PORT = app.argv.PORT || PORT;

server.listen(PORT, () => {
  console.info(`Second AI Server is now running on http://localhost:${PORT}`); // eslint-disable-line no-console
  // console.info(
  //   `Second AI Server over web socket with subscriptions is now running on ws://localhost:${PORT}${WS_GQL_PATH}`
  // ); // eslint-disable-line no-console
});