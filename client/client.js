var RemoteJSDebugger = function () {
	if (RemoteJSDebugger.instance === undefined) {
		RemoteJSDebugger.instance = this;
		if (window.io === undefined) {
			var url = this.serviceUrl() + 'socket.io/socket.io.js';
			this.loadScript(url, this.createInstance);
		} else {
			this.createInstance();
		}
	}
	return RemoteJSDebugger.instance;
};

RemoteJSDebugger.prototype.createInstance = function () {
	var dummy = function() {};

	RemoteJSDebugger.instance.connect();

	// save link on native console
	RemoteJSDebugger.console = window.console || {
		log: dummy, debug: dummy
	};

	var log = function () {
		var args = Array.prototype.slice.call(arguments);
		RemoteJSDebugger.instance.send('log', args);
	};

	window._console = RemoteJSDebugger.console;
	window.console = {
		log: log,
		info: log,
		debug: log,
		error: log
	};

	(function(con) {
		// Console-polyfill. MIT license.
		// https://github.com/paulmillr/console-polyfill
		// Make it safe to do console.log() always.
		'use strict';
		var prop, method;
		var empty = {};
		var properties = 'memory'.split(',');
		var methods = ('assert,clear,count,dir,dirxml,exception,group,' +
			'groupCollapsed,groupEnd,markTimeline,profile,profiles,profileEnd,' +
			'show,table,time,timeEnd,timeline,timelineEnd,timeStamp,trace,warn').split(',');

		while (prop = properties.pop()) con[prop] = con[prop] || empty;

		while (method = methods.pop()) con[method] = con[method] || dummy;

	})(window.console);
};

RemoteJSDebugger.prototype.loadScript = function (src, loadCallback) {
	var script = document.createElement("script");
	script.src = src;
	script.type = "text/javascript";
	if (loadCallback) script.onload = loadCallback;
	document.getElementsByTagName("head")[0].appendChild(script);
};

RemoteJSDebugger.prototype.socketOpen = function () {
	RemoteJSDebugger.console.log('Socket open');
};

RemoteJSDebugger.prototype.socketGetMessage = function (msg) {
	try {
		RemoteJSDebugger.instance.run(msg);
	} catch(exception) {
		RemoteJSDebugger.instance.sendException(exception);
	}
};

RemoteJSDebugger.prototype.run = function (command) {
	RemoteJSDebugger.commands[command.cmd](command.data);
};

RemoteJSDebugger.commands = {
	run: function (cmd) {
		var fn = new Function('return ' + cmd);
		RemoteJSDebugger.instance.sendResult(fn.call(window));
	}
};

RemoteJSDebugger.prototype.socketClose = function () {
	RemoteJSDebugger.console.log('Socket closed');
};

RemoteJSDebugger.prototype.socketSend = function (data) {
	this.socket.send(data);
};

RemoteJSDebugger.prototype.serviceUrl = function () {
  if(window.remoteJsServiceUrl) {
    return window.remoteJsServiceUrl;
  }
	var script, scripts = document.getElementsByTagName('script');
	for (var i in scripts) {
		script = scripts[i].src;
		if (script && script.match('/client.js')) break;
	}
  if(!script) {
    var msg = "Could not find window.remoteJsServiceUrl try setting it explicitly";
    alert(msg);
    throw new Error(msg);
  }
	return script.replace('/client.js', '/');
};

RemoteJSDebugger.prototype.connect = function () {
	if (this.socket === undefined || this.socket.readyState === this.socket.CLOSED) {
		var url = this.serviceUrl() + 'remote-js',
				socket = io.connect(url);

		socket.on('connect',    this.socketOpen);
		socket.on('command',    this.socketGetMessage);
		socket.on('disconnect', this.socketClose);

		this.socket = socket;
	}
};

RemoteJSDebugger.prototype.send = function (msg, object) {
	this.socket.emit('message', {msg: msg, data: object});
};

RemoteJSDebugger.prototype.sendResult = function (result) {
  try {

	  this.send('cmdresult', result);

  } catch(ex) {
    // can't send it the easy way send a simplified version.
    var data = {};
    for(var k in result) {
      if(result[k]) {
        data[k] = result[k].toString();
      } else {
        data[k] = result[k];
      }
    }
    this.send('cmdresult', data);
  }
};

RemoteJSDebugger.prototype.sendException = function (exception) {
	this.send('exception', {
		message: typeof exception === 'string' ? exception : exception.message,
		stack: exception.stack
	});
};

var rjs = new RemoteJSDebugger();
