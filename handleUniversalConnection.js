"use strict";

const   serverLog = require('./serverLog'),
        sendMessage = require('./sendMessage');
        
exports.handleUniversalConnection = function connection(ws) {
    const   handleConnection = require('./handleConnection.js').handleConnection;
    let     rosinstanceId = null,
            agent = null,
            browser = null,
            clientType = null;
    
    handleConnection(ws, 'unused', interpretCommand, logon, logoff);
    
    function logon(mbody, logonClientType) {
        serverLog("logon and create agent...");
         
        clientType = logonClientType; 
        if (clientType==='agent') {
            let Agent = require('./agent');
            agent = new Agent(ws, mbody);        
        } else if (clientType==='browser') {
            let Browser = require('./browser');
            browser = new Browser(ws, mbody);
        } else {
            serverLog("HACK WARNING: Bad agent attempted login.");
        }      
    }
    
    function interpretCommand(mtype, mbody) {
        if (agent) {
            agent.interpretCommand(mtype, mbody);
        } else if (browser) {
            browser.interpretCommand(mtype, mbody);
        } else {
            serverLog("HACK WARNING: Unauthenticated agent sent command mtype: " + mtype + " mbody: " + JSON.stringify(mbody));
        }
    }
    
    function logoff() {
        serverLog("Logging off agent...");
        if (agent) {
            agent.close();
            agent = null;
        }
        if (browser) {
            browser.close();
            browser = null;
        }
        clientType = null;
        rosinstanceId = null;
    }        
}
