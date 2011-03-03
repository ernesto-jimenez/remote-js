var ws = require('../vendor/node-websocket-server/lib/ws/server.js'),
		os = require('os'),
		http = require('http'),
		fs = require("fs"),
		path = require("path");

function log(msg) {
	console.log('\033[37m' + msg + '\033[39m');
}

function error(msg) {
	console.log('\033[31m' + msg + '\033[39m');
}

function clientLog(msg) {
	console.log('\033[35m' + msg + '\033[39m');
}

function clientOutput(msg) {
	process.stdout.write('\033[32m');
	console.log(msg);
	process.stdout.write('\033[39m');
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

		var server = ws.createServer({debug: false, server: httpServer});
		RemoteExecution.server = server;

		// Handle WebSocket Requests
		server.on("connection", RemoteExecution.clientConnected);

		server.listen(3400);
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

		conn.addListener("message", function (message) {
			RemoteExecution.receiveMessage(conn, message);
		});

		conn.addListener("close", function () {
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
			var client_message = JSON.parse(message);
			if (RemoteExecution.messages[client_message.msg]) {
				RemoteExecution.messages[client_message.msg](client_message.data);
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
			client.connection.send(JSON.stringify(data));
		} else {
			log("ERROR: no client connected");
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
