var io = require('socket.io'),
  http = require('http'),
  fs = require("fs"),
  util = require("util"),
  events = require("events"),
  path = require("path");

var RemoteExecution = function (args) {
  var self = this;

  this.args = args;
  this.clients = {};
  this.setupServer();
};

util.inherits(RemoteExecution, events.EventEmitter);

RemoteExecution.prototype.setupServer = function () {
  var httpServer = this.httpServer();

  var server = io.listen(httpServer);
  if (this.args.verbose) {
    server = server.set('log level', 3);
  } else {
    server = server.set('log level', 1);
  }

  // Handle WebSocket Requests
  server.of('/remote-js').on("connection", this.clientConnected.bind(this));

  httpServer.listen(this.args.port);

  this.server = server;
};

RemoteExecution.prototype.httpServer = function () {
  var self = this;

  return http.createServer(function (req, res) {
    if (req.method == "GET") {
      if (req.url.indexOf("favicon") > -1) {
        res.writeHead(200, {'Content-Type': 'image/x-icon', 'Connection': 'close'});
        res.end("");
      } else if (req.url === "/client.js" || req.url === "/json.js") {
        res.writeHead(200, {'Content-Type': 'application/javascript', 'Connection': 'close'});
        var filename = path.normalize(path.join(__dirname, "../client" + req.url));
        fs.readFile(filename, function (err, data) {
          if (err) {
            self.emit('error', err);
            return;
          }
          res.end(data);
        });
      }
    } else {
      res.writeHead(404);
      res.end();
    }
  });
};

RemoteExecution.prototype.clientConnected = function (conn) {
  this.clients[conn.id] = {connection: conn};
  conn.on("message", this.receiveMessage.bind(this, conn));
  conn.on("disconnect", this.clientDisconnected.bind(this, conn));
  this.emit('clientConnected', conn);
};

RemoteExecution.prototype.clientDisconnected = function (conn) {
  delete this.clients[conn.id];
  this.emit('clientDisconnected', conn);
};

RemoteExecution.prototype.receiveMessage = function (conn, message) {
  this.emit('message', conn, message);
};

RemoteExecution.prototype.sendCmd = function (clientId, cmd) {
  this.send(clientId, {cmd: 'run', data: cmd});
};

RemoteExecution.prototype.send = function (clientId, data) {
  var client = this.clients[clientId];
  if (client) {
    client.connection.emit("command", data);
  } else {
    throw new Error("Invalid client id " + clientId);
  }
};

exports.RemoteExecution = RemoteExecution;
