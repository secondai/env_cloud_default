// if(process.env.NEW_RELIC_LICENSE_KEY){
//   require('newrelic');
// }

// Initiates global models, caches, etc. 
// Start Second

console.log('ENV:', process.env);

let App = {};
global.App = App;
App.globalCache = {};
App.sharedServices = {};

// graphql (mongodb) 
App.graphql = require('./graphql').default;
App.sharedServices.graphql = App.graphql;

// redis 
App.redis = require("redis");

if(process.env.REDIS_URL){
  App.redisClient = App.redis.createClient(process.env.REDIS_URL);
} else {
  App.redisClient = App.redis.createClient(6379, process.env.REDIS_HOST || 'redis');
}
App.redisClient.on("error", function (err) {
    console.error("Redis Error " + err);
});

App.sharedServices.redis = App.redis;
App.sharedServices.redisClient = App.redisClient;

// utils
App.utils = require('./utils');

// Second (autostart) 
App.secondAI = require('./ai');
