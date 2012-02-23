var io = require('socket.io'),
  os = require('os'),
  http = require('http'),
  fs = require("fs"),
  colorize = require('colorize'),
  path = require("path");

function log (msg) {
  console.log(colorize.ansify('#gray[' + msg + ']'));
}

function error (msg) {
  console.log(colorize.ansify('#red[' + msg + ']'));
}

function clientLog (msg) {
  console.log(colorize.ansify('#blue[' + msg + ']'));
}

function clientOutput (msg) {
  process.stdout.write(colorize.ansify('=> #green['));
  console.log(msg);
  process.stdout.write(colorize.ansify(']'));
}

var RemoteExecution = function (args) {
  this.args = args;
  this.clients = {};
  this.client = undefined;
  this.setupServer();
};

RemoteExecution.prototype.printInstructions = function () {
  var url = 'http://' + os.hostname() + ':' + this.args.port + '/client.js';
  log('Add this to your HTML and open the webpage <script src="' + url + '"></script>');
};

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
  return http.createServer(function (req, res) {
    if (req.method == "GET") {
      if (req.url.indexOf("favicon") > -1) {
        res.writeHead(200, {'Content-Type': 'image/x-icon', 'Connection': 'close'});
        res.end("");
      } else if (req.url === "/client.js" || req.url === "/json.js") {
        res.writeHead(200, {'Content-Type': 'application/javascript', 'Connection': 'close'});
        fs.createReadStream(path.normalize(path.join(__dirname, "../client" + req.url)), {
          'flags': 'r',
          'encoding': 'binary',
          'mode': 0666,
          'bufferSize': 4 * 1024
        }).addListener("data",
          function (chunk) {
            res.write(chunk, 'binary');
          }).addListener("end", function () {
            res.end();
          });
      }
    } else {
      res.writeHead(404);
      res.end();
    }
  });
};

RemoteExecution.prototype.clientConnected = function (conn) {
  log("Connected " + conn.id);
  this.clients[conn.id] = {connection: conn};
  if (this.client === undefined) {
    this.selectClient(conn.id);
  }

  conn.on("message", this.receiveMessage.bind(this, conn));
  conn.on("disconnect", this.clientDisconnected.bind(this, conn));
};

RemoteExecution.prototype.clientDisconnected = function (conn) {
  log("Disconnected " + conn.id);
  delete this.clients[conn.id];
  if (this.client === conn.id) {
    this.client = undefined;
    this.selectClient();
  }
};

RemoteExecution.prototype.receiveMessage = function (conn, message) {
  try {
    if (this.messages[message.msg]) {
      this.messages[message.msg](message.data);
    } else {
      log("Unknown message");
      log(client_message);
    }
  } catch (exception) {
    log(exception.stack);
  }
  log('');
};

RemoteExecution.prototype.messages = {
  cmdresult: function (data) {
    clientOutput(data);
  },
  exception: function (data) {
    error("Remote Error: " + data.message);
    if (data.sourceURL) error("  " + data.sourceURL + ':' + data.line);
  },
  log: function (msg) {
    clientLog(msg);
  }
};

RemoteExecution.prototype.selectClient = function (client) {
  for (var conn_id in this.clients) {
    if (client == undefined || (conn_id + '').match("^" + client)) {
      this.client = conn_id;
      log("Selected client " + conn_id);
      return;
    }
  }

  log('No client selected');
};

RemoteExecution.prototype.sendCmd = function (cmd) {
  this.send({cmd: 'run', data: cmd});
};

RemoteExecution.prototype.requestInfo = function () {
  this.send({cmd: 'requestInfo'});
};

RemoteExecution.prototype.send = function (data) {
  if (this.client) {
    var client = this.clients[this.client];
    client.connection.emit("command", data);
  } else {
    error("ERROR: no client connected, type 'help'");
  }
};

RemoteExecution.prototype.disconnect = function () {
  if (this.client) {
    this.client = undefined;
    this.selectClient();
  }
};

exports.RemoteExecution = RemoteExecution;
