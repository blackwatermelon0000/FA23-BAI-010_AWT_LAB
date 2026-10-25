const { EventEmitter } = require('events');

// In-process event bus. Services publish domain events here so they do not
// need to know about Socket.IO; the socket layer subscribes and broadcasts.
module.exports = new EventEmitter();
