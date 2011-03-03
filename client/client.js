var RemoteJSDebugger = function () {
	if (RemoteJSDebugger.instance === undefined) {
		this.connect();
		RemoteJSDebugger.console = window.console || {log: function () {}};
		window.console = {
			log: function (data) {
				RemoteJSDebugger.instance.send({
					msg: 'log',
					data: data
				});
			}
		};
		RemoteJSDebugger.instance = this;
	}
	if (window.JSON === undefined) {
		var script = document.createElement("script");
		script.src = "/json.js";
		script.type = "text/javascript";
		document.getElementsByTagName("head")[0].appendChild(script);
	}
	return RemoteJSDebugger.instance;
};

RemoteJSDebugger.prototype.socketOpen = function () {
	RemoteJSDebugger.console.log('Socket open');
};

RemoteJSDebugger.prototype.socketGetMessage = function (msg) {
	RemoteJSDebugger.console.log(msg);
	
	try {
		RemoteJSDebugger.instance.run(JSON.parse(msg.data));
	} catch(exception) {
		RemoteJSDebugger.instance.sendException(exception);
	}
};

RemoteJSDebugger.prototype.run = function (command) {
	RemoteJSDebugger.commands[command.cmd](command.data);
};

RemoteJSDebugger.commands = {
	run: function (cmd) {
		RemoteJSDebugger.instance.sendResult(eval(cmd));
	}
};

RemoteJSDebugger.prototype.socketClose = function () {
	RemoteJSDebugger.console.log('Socket closed');
};

RemoteJSDebugger.prototype.socketSend = function (data) {
	this.socket.send(data);
};

RemoteJSDebugger.prototype.connect = function () {
	if (this.socket === undefined || this.socket.readyState === this.socket.CLOSED) {
		var socket = new WebSocket("ws://localhost:3400/");  

		socket.onopen    = this.socketOpen;
		socket.onmessage = this.socketGetMessage;
		socket.onclose   = this.socketClose;

		this.socket = socket;
	}
};

RemoteJSDebugger.prototype.send = function (object) {
	this.socketSend(JSON.stringify(object));
};

RemoteJSDebugger.prototype.sendResult = function (result) {
	this.send({msg: 'cmdresult', data: result});
};

RemoteJSDebugger.prototype.sendException = function (exception) {
	this.send({msg: 'exception', data: exception});
};

var rjs = new RemoteJSDebugger();
