"use strict";

let clientId = 0;
const   serverLog = require('./serverLog'),
        sendMessage = require('./sendMessage');

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
            let message = JSON.parse(data);  
            let   mtype = message.mtype,
                  mbody = message.mbody;
            if (mtype!=="graphUpd") {
                serverLog("<- " + JSON.stringify(message));
            }      
            if (mtype===clientType + 'Connect') {
                rosinstanceId = mbody.rosinstance;
                orgId = mbody.org;
                sendMessage(ws, clientType + 'Connected', thisId.toString());
                authenticated = true;
                if (typeof clientAuthenticated!=='undefined') {
                    clientAuthenticated(mbody);
                }
            } else if (authenticated) {
                //ﬁserverLog("Interpreting command");
                interpretCommand(mtype, mbody); 
            } 

            if (!authenticated) {
                serverLog("Unauthorized message received");
                ws.close(); 
            }
        }
        catch(err) {
            serverLog("ERROR " + err.message);
            serverLog("Invalid message received: " + data);
            console.trace("Stack:");
        }
    });       
    
}
