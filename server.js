"use strict";

global.Agents = require('./agents.js');
global.Browsers = require('./browsers.js');
global.RosInstances = require('./rosinstances.js');

const   serverLog = require('./serverLog'),
        WebSocketServer = require('ws').Server,
        handleUniversalConnection = require('./handleUniversalConnection.js'),
        handleAgentConnection = require('./handleAgentConnection.js'),
        handleBrowserConnection = require('./handleBrowserConnection.js');
let     agentServer = null,
        browserServer = null,
        connections = {},
        clientId = 0,
        httpServer = null;

exports.launch = function() {
    
    agentServer = new WebSocketServer({ port: 8000 });
    //agentServer.on('connection', handleAgentConnection.handleAgentConnection);
    agentServer.on('connection', handleUniversalConnection.handleUniversalConnection);
    serverLog('Ready to handle agent connections...');

    // All the below is simply to get the server running on Heroku (which require a web port)
    //Lets require/import the HTTP module
    var http = require('http');

    //Lets define a port we want to listen to
    const PORT=process.env.PORT || 8080; 

    //We need a function which handles requests and send response
    function handleRequest(request, response){
        response.end('It Works!! Path Hit: ' + request.url);
    }

    //Create a server
    httpServer = http.createServer(handleRequest);


    //Lets start our server
    httpServer.listen(PORT, function(){
        //Callback triggered when server is successfully listening. Hurray!
        console.log("Server listening on: http://localhost:%s", PORT);
    });

    return agentServer;    
}

exports.shutdown = function() {
    serverLog("Server shutdown");
    if (agentServer) {
        serverLog("Closing Agent socket");
        agentServer.close();
    }

    httpServer.close();
}


