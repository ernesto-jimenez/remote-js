# remote-js

This is a small tool to have a remote console to an existing browser.

When developing mobile web pages you usually miss the development console
provided by desktop browsers.

This command line tool allows you to add an script tag into your mobile webpage
that will connect back to the tool using WebSockets allowing you to run
javascript remotely in the mobile browser.

## Requirements

This is a node.js app, so you'll need to install node. That's all :)

## Installation and usage

Getting the tool running is simple:

**Using npm**

    npm install remote_js
    remote_js

_If remote\_js is not found you'll need to make sure your $PATH contains `npm bin`. If `npm bin` is $PWD/node\_modules/.bin your $PATH should contain node\_modules/.bin/_

**From source**

    git clone https://github.com/ernesto-jimenez/remote-js
    cd remote-js
    npm install
    ./bin/remote_js.js

Now you just need to copy & paste the script tag into your web page and start playing around.

## Contribute

This is a fast release for the tool. Feel free to modify it and send your Pull
Requests with fixes and improvements :)
