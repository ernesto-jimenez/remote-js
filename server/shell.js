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
	cursor: 0,
	// Write in stdout
	write: function (data) {
		process.stdout.write(data);
	},
	// Run command
	process: function () {
		var data = Shell.cmd.toString();
		data = data.replace(/[\r\n]{1,2}$/, '');
		
		Shell.write("\n");
		
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
		Shell.setCmd("");
	},
	// Close tool
	exit: function() {
		Shell.write("Bye\n");
		process.exit(0);
	},
	cmdFromCursorToEnd: function (resetCursor) {
		var currentCmd = Shell.cmd, currentCursor = Shell.cursor,
				cmdLength = currentCmd.length,
				rest = "", cursorBack = "";
		
		if (currentCursor < cmdLength) {
			rest = currentCmd.substr(currentCursor, cmdLength);
			if (resetCursor) cursorBack = Shell.backToCursor();
		}
		
		return rest + cursorBack;
	},
	backToCursor: function () {
		var cursorBack = "";
		for (var i = Shell.cmd.length - Shell.cursor; i > 0; i--) {
			cursorBack += "\b";
		}
		return cursorBack;
	},
	// Read user input
	read: function(chunk) {
		var currentCmd = Shell.cmd, currentCursor = Shell.cursor,
				cmdLength = currentCmd.length,
				rest = Shell.cmdFromCursorToEnd(), cursorBack = "";
		Shell.write(chunk + Shell.cmdFromCursorToEnd(true));
		Shell.cmd = currentCmd.substr(0, currentCursor) + chunk + rest;
		Shell.cursor += chunk.length;
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
		Shell.setCmd('');
	},
	setCmd: function (cmd) {
		Shell.cmd = cmd;
		Shell.cursor = cmd.length;
	},
	// User backspace
	backspace: function () {
		var currentCmd = Shell.cmd, cmdLength = currentCmd.length;
		if (currentCmd.length) {
			//Shell.setCmd(Shell.cmd.substr(0,Shell.cmd.length - 2));
			//Shell.cmd(
			var rest = Shell.cmdFromCursorToEnd();
			var cursor = Shell.cursor - 1;
			Shell.clearLine();
			Shell.setCmd(currentCmd.substr(0, cursor) + rest);
			Shell.cursor = cursor;
			Shell.write(Shell.cmd + Shell.backToCursor());
		}
	},
	// History up
	historyUp: function () {
		if (Shell.historyIndex > 0) {
			Shell.historyIndex--;
			Shell.clear();
			Shell.setCmd(Shell.history[Shell.historyIndex]);
			Shell.write(Shell.cmd);
		}
	},
	// History down
	historyDown: function () {
		if (Shell.historyIndex < Shell.historySize) {
			Shell.historyIndex++;
			Shell.clear();
			Shell.setCmd(Shell.history[Shell.historyIndex] || "");
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
	cursorLeft: function () {
		if (Shell.cursor > 0) {
			Shell.write("\b");
			Shell.cursor--;
		}
	},
	cursorRight: function () {
		if (Shell.cursor < Shell.cmd.length) {
			Shell.write(Shell.cmd.charAt(Shell.cursor));
			Shell.cursor++;
		}
	},
	init: function (command, commands) {
		var stdin = process.openStdin();
		
		Shell.runCommand = command;
		Shell.setCommands(commands || {});
		
		require('tty').setRawMode(true); 
		stdin.resume();
		stdin.setEncoding('utf8');

		stdin.on('keypress', function (chunk, key) {
			if (key) {
				if (key.ctrl && key.name === 'c')  return Shell.clear();
				else if (key.name === 'up')        return Shell.historyUp();
				else if (key.name === 'down')      return Shell.historyDown();
				else if (key.name === 'left')      return Shell.cursorLeft();
				else if (key.name === 'right')     return Shell.cursorRight();
				else if (key.name === 'enter')     return Shell.process();
				else if (key.name === 'backspace') return Shell.backspace();
			}
			if (chunk) Shell.read(chunk);
		});
		
		stdin.on('end', function () {
			Shell.exti();
		});

		Shell.write("Type \"help\" to get help on the tool commants\n");
	}
};

exports.Shell = Shell;