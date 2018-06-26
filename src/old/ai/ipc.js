
const uuidv4 = require('uuid/v4');
const ipc = require('node-ipc');

ipc.__customId = 'second-main-' + uuidv4();

ipc.config.id = ipc.__customId;
ipc.config.retry = 1500;
ipc.config.silent = true;
ipc.config.maxConnections = 10000; // doesnt work when set here!
ipc.serve(() => {
  // ...
});
ipc.server.start();

export default ipc;