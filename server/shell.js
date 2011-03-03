var Shell = {
	// Command-line tools commands
	defaultCommands: {
		exit: {
			desc: 'exit tool',
			fn: function () {
				Shell.exit();
			}
		},
		help: {
			desc: 'you are looking at it :)',
			fn: function() {
				Shell.printHelp();
			}
		},
		'?': {
			fn: function() {
				Shell.printHelp();
			}
		}
	},
	runCommand: undefined,
	// Command history
	history: [],
	historyIndex: -1,
	historySize: 0,
	// Command buffer
	cmd: "",
	// Write in stdout
	write: function (data) {
		process.stdout.write(data);
	},
	// Run command
	process: function () {
		var data = Shell.cmd.toString();
		data = data.replace(/[\r\n]{1,2}$/, '');
		
		Shell.write(data + "\n");
		
		var cmdOpts = data.split(' '), cmd = cmdOpts.shift();
		
		if (Shell.commands[cmd] !== undefined) {
			Shell.commands[cmd].fn(cmdOpts);
			console.log('');
		} else {
			try {
				Shell.runCommand(data);
			} catch (ex) {
				console.log(ex.stack);
			}
		}
		
		Shell.history.push(data);
		Shell.historySize++;
		Shell.historyIndex = Shell.historySize;
		Shell.cmd = "";
	},
	// Close tool
	exit: function() {
		Shell.write("Bye\n");
		process.exit(0);
	},
	// Read user input
	read: function(chunk) {
		Shell.write(chunk);
		Shell.cmd += chunk;
	},
	// Clear line
	clearLine: function () {
		var i, total = Shell.cmd.length;
		var clear = {back: "", space: ""};
		for(i = total; i > 0; i--) {
			clear.back += "\b";
			clear.space += " ";
		}
		
		Shell.write(clear.back + clear.space + clear.back);
	},
	// Clear command
	clear: function() {
		Shell.clearLine();
		Shell.cmd = "";
	},
	// User backspace
	backspace: function () {
		if (Shell.cmd.length) {
			Shell.cmd = Shell.cmd.substr(0,Shell.cmd.length - 2);
			Shell.write("\b \b");
		}
	},
	// History up
	historyUp: function () {
		if (Shell.historyIndex > 0) {
			Shell.historyIndex--;
			Shell.clear();
			Shell.cmd = Shell.history[Shell.historyIndex];
			Shell.write(Shell.cmd);
		}
	},
	// History down
	historyDown: function () {
		if (Shell.historyIndex < Shell.historySize) {
			Shell.historyIndex++;
			Shell.clear();
			Shell.cmd = Shell.history[Shell.historyIndex] || "";
			Shell.write(Shell.cmd);
		}
	},
	setCommands: function(commands) {
		Shell.commands = commands;
		for (var cmd in Shell.defaultCommands) {
			Shell.commands[cmd] = Shell.defaultCommands[cmd];
		}
	},
	printHelp: function () {
		Shell.write("This is the list of reserved commands:\n");
		for (var cmd in Shell.commands) {
			var description = Shell.commands[cmd].desc;
			if (description) {
				Shell.write("  " + cmd + ": " + description + "\n");
			}
		}
		Shell.write("Any other input is executed in the remote client\n");
	},
	init: function (command, commands) {
		var stdin = process.openStdin();
		
		Shell.runCommand = command;
		Shell.setCommands(commands || {});
		
		require('tty').setRawMode(true); 
		stdin.resume();
		stdin.setEncoding('utf8');

		stdin.on('keypress', function (chunk, key) {
			if (chunk) Shell.read(chunk);
			if (key) {
				if (key.ctrl && key.name === 'c') Shell.clear();
				else if (key.name === 'up') Shell.historyUp();
				else if (key.name === 'down') Shell.historyDown();
				else if (key.name === 'enter') Shell.process();
				else if (key.name === 'backspace') Shell.backspace();
			}
		});
		
		stdin.on('end', function () {
			Shell.exti();
		});

		Shell.write("Type \"help\" to get help on the tool commants\n");
	}
};

exports.Shell = Shell;