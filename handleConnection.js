"use strict";

let clientId = 0;
const   serverLog = require('./serverLog'),
        sendMessage = require('./sendMessage'),
        bson = require("bson"),
        BSON = new bson.BSONPure.BSON();

exports.handleConnection = function(ws, clientType, interpretCommand, clientAuthenticated, clientClosed) {
    let thisId = clientId++,
        authenticated = false,
        rosinstanceId = null,
        orgId = null;
        
    ws.on('close', function() {
        if (typeof clientClosed!=='undefined') {
            clientClosed();
        }        
    });    

    ws.on('message', function incoming(data) {
        try {
            let messageType = typeof data,
                message = null;
            if (messageType === 'string') {
                console.log("json");
                message = JSON.parse(data);  
            } else {
                console.log("bson");
                message = BSON.deserialize(data);
                console.log(message);
                console.log("------");
                console.log(message.mtype);
                console.log("------");
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
                //ws.close(); 
            }
        }
        catch(err) {
            serverLog("ERROR " + err.message);
            serverLog("Invalid message received: " + data);
            console.trace("Stack:");
        }
    });       
    
}
