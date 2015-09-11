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


