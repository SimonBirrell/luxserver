"use strict";

const   serverLog = require('./serverLog'),
        sendMessage = require('./sendMessage');
        
exports.handleAgentConnection = function connection(ws) {
    const   handleConnection = require('./handleConnection.js').handleConnection;
    let     rosinstanceId = null,
            agent = null;
    
    handleConnection(ws, 'agent', interpretCommand, logon, logoff);
    
    function logon(mbody) {
        serverLog("logon and create agent...");
         
        let Agent = require('./agent');
        agent = new Agent(ws, mbody);        
        
    }
    
    function interpretCommand(mtype, mbody) {
        if (agent) {
            agent.interpretCommand(mtype, mbody);
        } else {
            serverLog("Unauthenticated agent sent command mtype: " + mtype + " mbody: " + JSON.stringify(mbody));
        }
    }
    
    function logoff() {
        serverLog("Logging off agent...");
        if (agent) {
            agent.close();
        }
    }
        
}


/// No longer used: delete this file