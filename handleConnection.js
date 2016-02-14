"use strict";

// (c) 2015 Robot Lux. all Rights Reserved.
// Written by Simon Birrell.

// Handles low-level connection details including serialization and compression.

let clientId = 0;
const   serverLog = require('./serverLog'),
        sendMessage = require('./sendMessage'),
        sendMessageToClient = require('./sendMessageToClient'),
        bson = require("bson"),
        lzw = require('node-lzw'),
        BSON = new bson.BSONPure.BSON();

// Instantiate this module.
//      ws - an open websocket stream
//      clientType - 'browser' or 'agent'. Not currently used.
//      interpretCommand - a function to interpret the command
//      clientAuthenticated - a function to call once the client is authenticated
//      clientClosed - a function to call if the client connection is closed

exports.handleConnection = function(ws, clientType, interpretCommand, clientAuthenticated, clientClosed) {
    let thisId = clientId++,
        authenticated = false,
        rosinstanceId = null,
        orgId = null;

    // Handle a break in the websocket communication by closing down the attached
    // client (browser or agent)    
        
    ws.on('close', function() {
        if (typeof clientClosed!=='undefined') {
            clientClosed();
        }        
    });    

    // Interpret a message recieved on the universal websocket from either browser or agent.
    // If the connecting entity is authenticated then pass the message to the already
    // instantiated handleXConnection object. Oherwise interpret agentConnect and browserConnect
    // messages as authentication attempts.
    // Unauthorized messages are ignored and logged.
    //
    //      data - a serialized and compressed message
    //
    // Any binary objects currently interpreted as BSON and any text objects as JSON.             

    ws.on('message', function incoming(data) {
        try {
            let messageType = typeof data,
                message = null;
            serverLog("messageType = " + messageType);    
            if ((messageType === 'string') || true) {
                message = JSON.parse(data);  
            } else {
                message = BSON.deserialize(data);
            }
            let   mtype = message.mtype,
                  mbody = message.mbody;
            if (mtype!=="graphUpd") {
                serverLog("<- " + JSON.stringify(message));
            }      
            if (mtype==='agentConnect') {
                rosinstanceId = mbody.rosinstance;
                orgId = mbody.org;
                sendMessage(ws, 'agentConnected', thisId.toString());
                authenticated = true;
                if (typeof clientAuthenticated!=='undefined') {
                    clientAuthenticated(mbody, 'agent');
                }
            } else if (mtype==='browserConnect') {
                rosinstanceId = mbody.rosinstance;
                orgId = mbody.org;
                sendMessage(ws, 'browserConnected', thisId.toString());
                authenticated = true;
                if (typeof clientAuthenticated!=='undefined') {
                    clientAuthenticated(mbody, 'browser');
                }
            } else if (authenticated) {
                interpretCommand(mtype, mbody); 
            } 

            if (!authenticated) {
                serverLog("Unauthorized message received");
                serverLog(message);
            }
        }
        catch(err) {
            serverLog("ERROR " + err.message);
            serverLog("Invalid message received: " + data);
            console.trace("Stack:");
        }
    });       
    
}
