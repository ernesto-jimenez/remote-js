#!/usr/bin/env node

(function () { // wrapper in case we're in module_context mode
  var RemoteExecution = require('../server/remote_execution.js').RemoteExecution;
  var readline = require('readline');
  var args = require('commander');

  args
    .option('-v, --verbose', 'Verbose output')
    .option('-p, --port <n>', 'Port (default: 3400)', parseInt);

  args.parse(process.argv)
  args.port = args.port || 3400;

  RemoteExecution.init(args);
  RemoteExecution.printInstructions();

  var commands = {
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
    },
    help: {
      desc: 'help',
      fn: function () {
        console.log("This is the list of reserved commands:\n");
        for (var cmd in commands) {
          var description = commands[cmd].desc;
          if (description) {
            console.log("  " + cmd + ": " + description);
          }
        }
        console.log("Any other input is executed in the remote client\n");
      }
    },
    exit: {
      desc: 'exit',
      fn: function () {
        process.exit(0);
      }
    }
  };

  var shell = readline.createInterface(process.stdin, process.stdout, function (linePartial, callback) {
    var items = commands;

    if (linePartial.match(/^select /)) {
      items = RemoteExecution.clients;
      linePartial = linePartial.substr('select '.length);
    }

    var matches = [];
    for (var k in items) {
      if (linePartial.length <= k.length
        && k.substr(0, linePartial.length) == linePartial) {
        matches.push(k);
      }
    }
    callback(null, [matches, linePartial]);
  });
  shell.on('line', function (line) {
    line = line.trim();
    if (line === '') {
      shell.prompt();
      return;
    }

    var cmdOpts = line.split(' ');
    var cmd = cmdOpts.shift();
    if (cmd in commands) {
      commands[cmd].fn(cmdOpts);
      shell.prompt();
      return;
    }

    RemoteExecution.sendCmd(line);
    shell.prompt();
  });
  shell.setPrompt('> ');
  shell.prompt();

})();
