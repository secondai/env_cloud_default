import { Router } from 'express';

import request from 'request'

import GetStream from 'getstream'

var hashcash = require('hashcash');
const bodyParser = require('body-parser');

const {graphqlExpress, graphiqlExpress} = require('apollo-server-express');

// const schema = app.graphql.schema;

const routes = Router();

const hashcashFixedMiddleware = (req, res, next) => {
	// hashcash middleware has issues with req.url and req.connection.remoteAddress being hardcoded 

  var url = 'http://localhost'; //req.url;
  var address = 'remoteAddress'; //req.connection.remoteAddress;
  var challenge = req.session['x-hashcash'] || hashcash.getChallenge(address, url);
  var solution = req.headers['x-hashcash-solution'];
  function getAddressFrom(challenge) {
    var split = challenge.split(':');
    return split[2]; // ID=2
  }
  if(solution && address.toString() === getAddressFrom(challenge) && hashcash.isSolution(challenge, solution)) {
    next();
  } else {
    res.header('x-hashcash', challenge);
    req.session['x-hashcash'] = challenge;
    res.send('Answer challenge', 400);
  }

}

// routes.get('/', (req, res) => {
//   res.render('index', { title: 'Second' });
// });

routes.get('/hashcash', hashcashFixedMiddleware, (req, res)=>{
	// Passed
	res.send('ok!');
})


routes.get('/test1', (req, res)=>{
	// Testing docker.for.mac.localhost dockerized route 

	try {
	  request.get('http://docker.for.mac.localhost:7008/',(err, httpResponse, body)=>{
	    console.log('Got Request result');
	    res.send({
	    	err, 
	    	errStr: (err || 'noerror').toString(),
	    	httpResponse, 
	    	body
	    });
	  });
	}catch(err){
	  console.error('Failed GET');
	  res.send('Failed');
	}



	// res.send('ok!');
})

// lobotomy (manual Node fetching and modification) 
if(process.env.APP_OPEN_GRAPHQL == 'true'){
	routes.use('/graphql', bodyParser.json(), graphqlExpress(req => {
		// returning options for graphqlExpress from this function
		// - because we need to assign our tenant per-route 

		return {
			schema: app.graphql.schema,
			context: {
			}
		}
	}));

	routes.use('/graphiql', graphiqlExpress({
	  endpointURL: '/graphql',
	}));
}

// OLD, for express-ws (not working) 
// app.ws('/', function(ws, req) {
// 	console.log('incoming websocket start?');
//   ws.on('message', function(msg) {
//     console.log('ws message:', msg);
//   });
//   console.log('socket', 'SETUP1');
// });


// ai endpoint
// - all remaining routes
app.secondAI = require('../ai');
routes.use(bodyParser.json(), async (req, res)=>{
	
	// wait for the result from the AI request 
	// - passing in the "request arrived like X" information that will give us a valid response to return 
	// - response might be a res.send({...everything..}) or simply res.send({resultId:'123'}) w/ a follow-up later 
	let response = await app.secondAI.incomingAIRequest({
		req,
		res,
		cacheTEST:'test1'
	});

	if((process.env.OLD_INCOMING || '').toString() == 'true'){
		res.send(response);
	} else {
		console.log('Expected to have responded inside Second');
	}

});



export default routes;
