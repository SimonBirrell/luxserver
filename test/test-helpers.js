"use strict";

// Helper functions for the tests.
// These allow the instantiation of a pseudo-browser and/or pseudo-agent to
// connect to the server via websockets.

var bson = require("bson");
var BSON = new bson.BSONPure.BSON();

// Define a callback to intercept any messages sent from the server to the client 
// (agent or browser) via websocket ws. This is used to check that the server is returning the 
// messages that we expect it should.
//
exports.trapMessage = function(ws, testMessage) {
    ws.on('message', function(data) {
        let message = JSON.parse(data),
            mtype = message.mtype,             
            mbody = (typeof message.mbody !== 'undefined') ? message.mbody : null    
        
        testMessage(mtype, mbody)
    });
}
 
// Send a JSON-encoded message via an already-opened websocket to the server.
// 
exports.sendToWebsocket = function(ws, mtype, mbody) {
    if (typeof mbody !== 'undefined') {
        ws.send(JSON.stringify({mtype:mtype, mbody:mbody}));
    }
    else {
        ws.send(JSON.stringify({mtype:mtype}));
    }
}

// Send a BSON-encoded message via an already-opened websocket to the server.
// 
exports.sendToWebsocketAsBSON = function(ws, mtype, mbody) {
    let message = {};

    if (typeof mbody !== 'undefined') {
        message = {mtype:mtype, mbody:mbody};
    }
    else {
        message = {mtype:mtype};
    }
    ws.send(BSON.serialize(message, false, true, false), { binary: true, mask: true });
}

// Create a socket that represents a pseudo-browser, connect to server and send a message,
// Returns the websocket so further messages can be sent to server.
//
exports.openBrowserSocketAndSend = function(message) {
    const   WebSocket = require('ws'),
            ws = new WebSocket('ws://localhost:8080');
    ws.on('open', function open() {
        ws.send(JSON.stringify(message));
    });
    return ws;        
}

// Create a socket that represents a pseudo-agent, connect to server and send a message,
// Returns the websocket so further messages can be sent to server.
//
exports.openAgentSocketAndSend = function(message) {
    const   WebSocket = require('ws'),
            ws = new WebSocket('ws://localhost:8080');
    ws.on('open', function open() {
        ws.send(JSON.stringify(message));
    });
    return ws;        
}

// Creates a pseudo-browser and authenticates it against the server.
// Returns the websocket so further messages can be sent to server.
//
exports.authenticateBrowser = function(orgId) {
    orgId = (typeof orgId!=='undefined') ? orgId : 'theOrg'
    let ws = this.openBrowserSocketAndSend({
        mtype:'browserConnect',
        mbody:{org:orgId,secret:'bar',rosinstance:'baz'}
    });
    
    return ws;
}

// Creates a pseudo-agent and authenticates it against the server.
// Returns the websocket so further messages can be sent to server.
//
exports.authenticateAgent = function(rosinstanceId, orgId, hostnameId, networkId) {
    rosinstanceId = (typeof rosinstanceId!=='undefined') ? rosinstanceId : 'anInstance'
    orgId = (typeof orgId!=='undefined') ? orgId : 'theOrg'
    hostnameId = (typeof hostnameId!=='undefined') ? hostnameId : 'theHostname'
    networkId = (typeof networkId!=='undefined') ? networkId : '0'
    
    let ws = this.openAgentSocketAndSend({
        mtype:'agentConnect',
        mbody:{ org: orgId,
                user: 'user',
                secret: 'bar',
                rosinstance: rosinstanceId,
                hostname: hostnameId,
                network: networkId}
    });
    
    return ws;
}

// Convert parameters into a fully-qualified machine id.
// TODO: This is really part of the protocol and should be moved to main code
//
exports.buildFullMachineId = function(rosinstanceId, orgId, hostnameId, networkId) {
    networkId = (typeof networkId!=='undefined') ? networkId : '0'
    return orgId + " " + networkId + " " + rosinstanceId + " " + hostnameId;    
}

// Convert parameters into a fully-qualified ROS instance id.
// TODO: This is really part of the protocol and should be moved to main code
//
exports.buildFullRosInstanceId = function(rosinstanceId, orgId, hostnameId, networkId) {
    networkId = (typeof networkId!=='undefined') ? networkId : '0'
    return orgId + " " + networkId + " " + rosinstanceId;    
}

// List currently-connected ROS instance. For debugging.
//
exports.displayRosInstances = function () {
    for (let i=0; i<global.RosInstances.RosInstances.length; i++) {
        console.log(">> " + global.RosInstances.RosInstances[i].fullRosInstanceId);            
    }        
}

// Clean out the ROS instance list after each test.
//
exports.teardown = function() {
    global.RosInstances.empty();
}


