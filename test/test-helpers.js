"use strict";

// Helper functions for the tests.
// These allow the instantiation of a pseudo-browser and/or pseudo-agent to
// connect to the server via websockets.

var bson = require("bson");
var BSON = new bson.BSONPure.BSON();
var mockery = require('mockery');

// Mock out REDIS server for tests
var dummyRedisFakeStore = {},
    dummyRedis = {
        // Keep register of keys and values
        addAgentInfo: function(key, agentInfo) {
            key = "robotlux:agent:" + key;
            dummyRedisFakeStore[key] = JSON.stringify(agentInfo);
        },
        addBrowserInfo: function(key, browserInfo) {
            key = "robotlux:browser:" + key;
            dummyRedisFakeStore[key] = JSON.stringify(browserInfo);
        },
        createClient: function() {
            console.log("Creating FAKE REDIS");
            return {
                get: function(key, callback) {
                    var value = dummyRedisFakeStore[key];
                    if (value) {
                        callback(null, value);                            
                    } else {
                        callback(null, null);
                    }
                }
            };
        }
    };

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
exports.authenticateBrowser = function(orgId, user, secret) {
    orgId = (typeof orgId!=='undefined') ? orgId : 'theOrg'

    user = (typeof user!=='undefined') ? user : 'user' + randomString();
    secret = (typeof secret!=='undefined') ? secret : 'bar' + randomString();
    //secret = (typeof secret!=='undefined') ? secret : 'bar';
    var username = user + '@' + orgId + '.orgs.robotlux.com';
    var browserInfo = {
                        email: username,
                        name: user,
                        org_slug: orgId,
                    };

    dummyRedis.addBrowserInfo(secret, browserInfo);

    // Test incorrect password by passing '****'
    secret = (secret=='****') ? 'incorrect_password' : secret;
    var dataToSend = {
                org: orgId,
                user: user,
                username: username,
                secret: secret,
                rosinstance: 'baz'
        };


    let ws = this.openBrowserSocketAndSend({
        mtype: 'browserConnect',
        mbody: (secret!=='no_auth') ? dataToSend : {}
    });
    
    return ws;
}

// Creates a pseudo-agent and authenticates it against the server.
// Returns the websocket so further messages can be sent to server.
// Sets the agent data in the Fake REDIS store.
//
exports.authenticateAgent = function(rosinstanceId, orgId, hostnameId, networkId, user, secret) {
    rosinstanceId = (typeof rosinstanceId!=='undefined') ? rosinstanceId : 'anInstance'
    orgId = (typeof orgId!=='undefined') ? orgId : 'theOrg'
    hostnameId = (typeof hostnameId!=='undefined') ? hostnameId : 'theHostname'
    networkId = (typeof networkId!=='undefined') ? networkId : '0'
    user = (typeof user!=='undefined') ? user : 'user' + randomString();
    secret = (typeof secret!=='undefined') ? secret : 'bar' + randomString();
    var username = user + '@robotlux.orgs.robotlux.com';
    var agentInfo = {
                        slug: user,
                        username: username,
                        org_slug: orgId,
                        network: networkId
                    };

    dummyRedis.addAgentInfo(secret, agentInfo);

    // Test incorrect password by passing '****'
    secret = (secret=='****') ? 'incorrect_password' : secret;

    let ws = this.openAgentSocketAndSend({
        mtype:'agentConnect',
        mbody:{ org: orgId,
                user: user,
                username: username,
                secret: secret,
                rosinstance: rosinstanceId,
                hostname: hostnameId,
                network: networkId}
    });
    
    return ws;
}

function randomString() {
    return Math.floor((Math.random() * 100000)).toString();
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

// Do any high-level mocking
exports.startup = function() {
    mockery.enable({
        warnOnReplace: false,
        warnOnUnregistered: false
    });
    mockery.registerMock('redis', dummyRedis);
    //dummyRedis.addAgentInfo('robotlux:agent:bar', dummyAgentInfo);
};

// Clean out the ROS instance list after each test.
//
exports.teardown = function() {
    global.RosInstances.empty();
    mockery.disable();
};


