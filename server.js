"use strict";

// (c) 2015 Robot Lux. all Rights Reserved.
// Written by Simon Birrell.

// The main module for Lux Server.

global.Agents = require('./agents.js');
global.Browsers = require('./browsers.js');
global.RosInstances = require('./rosinstances.js');

const   serverLog = require('./serverLog'),
        WebSocketServer = require('ws').Server,
        managerInterface = require('./managerInterface'),
        handleUniversalConnection = require('./handleUniversalConnection.js');
let     universalServer = null,
        httpServer = null;

// Launches the server to handle websocket requests. Both agent and browser connect to the
// same port.

exports.launch = function() {
    
    // All the below is simply to get the server running on Heroku (which requires a web port)
    // Lets require/import the HTTP module
    var http = require('http');

    // Create a server
    httpServer = http.createServer(handleRequest);

    // Lets define a port we want to listen to
    const PORT=process.env.PORT || 8080; 

    // Lets start our server
    httpServer.listen(PORT);

    // We need a function which handles http requests and sends a response.
    // This is a dummy for the moment as we don't need http except to start up websockets.
    function handleRequest(request, response){
        response.end('It Works!! Path Hit: ' + request.url);
    }

    universalServer = new WebSocketServer({ server: httpServer });
    universalServer.on('connection', handleUniversalConnection.handleUniversalConnection);
    serverLog('Ready to handle agent connections...');

    // Connect to REDIS
    managerInterface.connect();

    return universalServer;    
}

// Clean-up function, currently only called from tests.

exports.shutdown = function() {
    serverLog("Server shutdown");
    if (universalServer) {
        serverLog("Closing Agent socket");
        universalServer.close();
    }

    httpServer.close();
}


