#!/usr/bin/env node

(function () { // wrapper in case we're in module_context mode
  var RemoteExecution = require('../server/remote_execution.js').RemoteExecution;
  var readline = require('readline');
  var args = require('commander');
  var colorize = require('colorize');
  var os = require('os');

  args
    .option('-v, --verbose', 'Verbose output')
    .option('-p, --port <n>', 'Port (default: 3400)', parseInt);

  args.parse(process.argv)
  args.port = args.port || 3400;

  var selectedClient = undefined;
  var remote = new RemoteExecution(args);

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

  function printInstructions (arg) {
    var url = 'http://' + os.hostname() + ':' + args.port + '/client.js';
    log('Add this to your HTML and open the webpage <script src="' + url + '"></script>');
  }

  function selectClient (client) {
    for (var conn_id in remote.clients) {
      if (client == undefined || (conn_id + '').match("^" + client)) {
        selectedClient = conn_id;
        log("Selected client " + conn_id);
        return;
      }
    }

    log('No client selected');
  }

  remote.on('error', function(err) {
    error(err);
  });

  remote.on('clientConnected', function (conn) {
    log("Connected " + conn.id);
    if (selectedClient === undefined) {
      selectClient(conn.id);
    }
  });

  remote.on('clientDisconnected', function (conn) {
    log("Disconnected " + conn.id);
    if (selectedClient === conn.id) {
      selectedClient = undefined;
      selectClient();
    }
  });

  remote.on('message', function(conn, message) {
    try {
      switch(message.msg) {
        case 'cmdresult':
          clientOutput(message.data);
          break;
        case 'exception':
          error("Remote Error: " + message.data.message);
          if (message.data.sourceURL) error("  " + message.data.sourceURL + ':' + message.data.line);
          break;
        case 'log':
          clientLog(message.data);
          break;
        default:
          log("Unknown message");
          log(client_message);
          break;
      }
    } catch (exception) {
      log(exception.stack);
    }
    log('');
  });

  var commands = {
    ls: {
      desc: 'list connected clients',
      fn: function () {
        var conn_id;
        for (conn_id in remote.clients) {
          if (conn_id === remote.client) {
            console.log("  * " + conn_id);
          } else {
            console.log("    " + conn_id);
          }
        }
        if (conn_id) {
          console.log("Select your client with the select command");
        } else {
          console.log("No clients connected");
          printInstructions(args);
        }
      }
    },
    select: {
      desc: 'select a connected client',
      fn: function (client) {
        remote.selectClient(client[0]);
      }
    },
    selected: {
      desc: 'shows selected client',
      fn: function () {
        if (remote.client === undefined) {
          console.log("No client selected");
        } else {
          console.log("Selected client: " + remote.client);
        }
      }
    },
    disconnect: {
      desc: 'disconnect current client',
      fn: function () {
        if (selectedClient) {
          selectedClient = undefined;
          selectClient();
        }
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

  function shellCompleter(linePartial, callback) {
    var items = commands;

    if (linePartial.match(/^select /)) {
      items = remote.clients;
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
  }

  var shell = readline.createInterface(process.stdin, process.stdout, shellCompleter);

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

    if (selectedClient) {
      remote.sendCmd(selectedClient, line);
    } else {
      error("ERROR: no client connected, type 'help'");
    }
    shell.prompt();
  });

  shell.setPrompt('> ');

  printInstructions(args);
  shell.prompt();

})();
