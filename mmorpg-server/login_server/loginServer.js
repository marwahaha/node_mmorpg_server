net = require('net');
var cfg = require('./config');
var Client = require('./client');
var clients = [];

var server = net.createServer(function (socket) {

  socket.setTimeout(cfg.timeout);
  var client = new Client(socket);
  clients.push(client);

  socket.on('data', client.onMessage.bind(client));

  socket.on('error', client.onError.bind(client));

  socket.on('timeout', client.onTimeout.bind(client));

  socket.on('end', client.onEnd.bind(client));

  socket.on('close', function () {
    client.dispose();
    clients.splice(clients.indexOf(client), 1);
  });

});

server.maxConnections = cfg.maxClients;

server.listen({
  host: cfg.host,
  port: cfg.port,
  exclusive: true
});

log = function(mess) {
  console.log(mess);
};

log("Login server is running on port " + cfg.port + ", max connections: " + cfg.maxClients);