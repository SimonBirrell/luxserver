"use strict";

global.Agents = require('./agents.js');
global.Browsers = require('./browsers.js');
global.RosInstances = require('./rosinstances.js');

const   serverLog = require('./serverLog'),
        WebSocketServer = require('ws').Server,
        handleAgentConnection = require('./handleAgentConnection.js'),
        handleBrowserConnection = require('./handleBrowserConnection.js');
let     agentServer = null,
        browserServer = null,
        connections = {},
        clientId = 0;

exports.launch = function() {
    
    agentServer = new WebSocketServer({ port: 8000 });
    agentServer.on('connection', handleAgentConnection.handleAgentConnection);
    serverLog('Ready to handle agent connections...');
    
    browserServer = new WebSocketServer({ port: 8001 });
    browserServer.on('connection', handleBrowserConnection.handleBrowserConnection);
    serverLog('Ready to handle browser connections...');

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
    var server = http.createServer(handleRequest);

    //Lets start our server
    server.listen(PORT, function(){
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
    if (browserServer) {
        serverLog("Closing Browser socket");
        browserServer.close();
    }
}


