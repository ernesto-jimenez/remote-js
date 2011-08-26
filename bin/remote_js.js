#!/usr/bin/env node
;(function () { // wrapper in case we're in module_context mode
var RemoteExecution = require('../server/remote_execution.js').RemoteExecution,
		Shell = require('../server/shell.js').Shell;

RemoteExecution.init();
RemoteExecution.printInstructions();

Shell.init(RemoteExecution.sendCmd,{
	ls: {
		desc: 'list connected clients',
		fn: function () {
			var conn_id;
			for (conn_id in RemoteExecution.clients) {
				if (conn_id === RemoteExecution.client) {
					console.log("  * " + conn_id);
				} else {
					console.log("    " + conn_id);
				}
			}
			if (conn_id) {
				console.log("Select your client with the select command");
			} else {
				console.log("No clients connected");
				RemoteExecution.printInstructions();
			}
		}
	},
	select: {
		desc: 'select a connected client',
		fn: function (client) {
			RemoteExecution.selectClient(client[0]);
		}
	},
	selected: {
		desc: 'shows selected client',
		fn: function () {
			if (RemoteExecution.client === undefined) {
				console.log("No client selected");
			} else {
				console.log("Selected client: " + RemoteExecution.client);
			}
		}
	},
	disconnect: {
		desc: 'disconnect current client',
		fn: function () {
			RemoteExecution.disconnect();
		}
	}
});
})();
