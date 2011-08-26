var io = require('socket.io'),
		os = require('os'),
		http = require('http'),
		fs = require("fs"),
		colorize = require('colorize'),
		path = require("path");

function log(msg) {
	console.log(colorize.ansify('#gray[' + msg + ']'));
}

function error(msg) {
	console.log(colorize.ansify('#red[' + msg + ']'));
}

function clientLog(msg) {
	console.log(colorize.ansify('#blue[' + msg + ']'));
}

function clientOutput(msg) {
	process.stdout.write(colorize.ansify('=> #green['));
	console.log(msg);
	process.stdout.write(colorize.ansify(']'));
}

var RemoteExecution = {
	init: function () {
		RemoteExecution.clients = {};
		RemoteExecution.client = undefined;
		RemoteExecution.setupServer();
	},

	printInstructions: function () {
		var url = 'http://' + os.hostname() + ':3400/client.js';
		log('Add this to your HTML and open the webpage <script src="' + url + '"></script>');
	},

	setupServer: function () {
		var httpServer = RemoteExecution.httpServer();

		var server = io.listen(httpServer);
		if (process.env.debug) {
			server = server.set('log level', 3);
		} else {
			server = server.set('log level', 1);
		}

		// Handle WebSocket Requests
		server.of('/remote-js').on("connection", RemoteExecution.clientConnected);

		httpServer.listen(3400);

		RemoteExecution.server = server;
	},

	httpServer: function () {
		return http.createServer(function(req, res){
			if(req.method == "GET"){
				if( req.url.indexOf("favicon") > -1 ){
					res.writeHead(200, {'Content-Type': 'image/x-icon', 'Connection': 'close'});
					res.end("");
				} else if(req.url === "/client.js" || req.url === "/json.js") {
					res.writeHead(200, {'Content-Type': 'application/javascript', 'Connection': 'close'});
					fs.createReadStream( path.normalize(path.join(__dirname, "../client" + req.url)), {
						'flags': 'r',
						'encoding': 'binary',
						'mode': 0666,
						'bufferSize': 4 * 1024
					}).addListener("data", function(chunk){
						res.write(chunk, 'binary');
					}).addListener("end",function() {
						res.end();
					});
				}
			} else {
				res.writeHead(404);
				res.end();
			}
		});
	},

	clientConnected: function (conn){
		log("Connected " + conn.id);
		RemoteExecution.clients[conn.id] = {connection: conn};
		if (RemoteExecution.client === undefined) {
			RemoteExecution.selectClient(conn.id);
		}

		conn.on("message", function (message) {
			RemoteExecution.receiveMessage(conn, message);
		});

		conn.on("disconnect", function () {
			RemoteExecution.clientDisconnected(conn);
		});
	},

	clientDisconnected: function (conn) {
		log("Disconnected " + conn.id);
		delete RemoteExecution.clients[conn.id];
		if (RemoteExecution.client === conn.id) {
			RemoteExecution.client = undefined;
			RemoteExecution.selectClient();
		}
	},

	receiveMessage: function (conn, message) {
		try {
			if (RemoteExecution.messages[message.msg]) {
				RemoteExecution.messages[message.msg](message.data);
			} else {
				log("Unknown message");
				log(client_message);
			}
		} catch (exception) {
			log(exception.stack);
		}
		log('');
	},

	messages: {
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
	},

	selectClient: function (client) {
		for (var conn_id in RemoteExecution.clients) {
			if (client == undefined || (conn_id + '').match("^"+client)) {
				RemoteExecution.client = conn_id;
				log("Selected client " + conn_id);
				return;
			}
		}

		log('No client selected');
	},

	sendCmd: function (cmd) {
		RemoteExecution.send({cmd: 'run', data: cmd});
	},

	requestInfo: function () {
		RemoteExecution.send({cmd: 'requestInfo'});
	},

	send: function (data) {
		if (RemoteExecution.client) {
			var client = RemoteExecution.clients[RemoteExecution.client];
			client.connection.emit("command", data);
		} else {
			error("ERROR: no client connected, type 'help'");
		}
	},
	
	disconnect: function () {
		if (RemoteExecution.client) {
			var client = RemoteExecution.clients[RemoteExecution.client];
			client.connection.close();
		}
	}
};

exports.RemoteExecution = RemoteExecution;
