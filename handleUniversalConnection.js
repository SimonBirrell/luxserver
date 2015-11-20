"use strict";

// (c) 2015 Robot Lux. all Rights Reserved.
// Written by Simon Birrell.

// Handles connection to either an agent or a browser (both connect to the same websocket).
// Connected to a single websocket, it interprets authentication messages, instantiates a handler
// for either browser or client handlers and passes other messages along to them.
// One handleUniversalConnection object is instantiated for each client that connects.
// The mechanics of handling a connection (including compression etc.) are delegated
// to handleConnection.

const   serverLog = require('./serverLog'),
        sendMessage = require('./sendMessage');
        
// Handle connections.
//
//  ws - a websocket listening for clients.
 
exports.handleUniversalConnection = function connection(ws) {
    const   handleConnection = require('./handleConnection.js').handleConnection;
    let     rosinstanceId = null,
            agent = null,
            browser = null,
            clientType = null;
    
    // Set up handleConnection to call back on receiving a command, logging on or off.
    // handleConnection handles lower-level decompression etc.
    handleConnection(ws, 'unused', interpretCommand, logon, logoff);
    
    // Callback from handleConnection when a client has successfully logged on.
    //
    //      mbody - Payload that came with the login command
    //      logonClientType - 'agent' or 'browser'
    //
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
    
    // Callback from handleConnection when a client sends a message (apart from logon/off).
    //
    //      mtyype - string that defines command
    //      mbody - command payload
    //      See readme.MD for protocol details
    //
    function interpretCommand(mtype, mbody) {
        if (agent) {
            agent.interpretCommand(mtype, mbody);
        } else if (browser) {
            browser.interpretCommand(mtype, mbody);
        } else {
            serverLog("HACK WARNING: Unauthenticated agent sent command mtype: " + mtype + " mbody: " + JSON.stringify(mbody));
        }
    }
    
    // Callback from handleConnection when a client logs off or connection breaks.
    //
    function logoff() {
        serverLog("Logging off client...");
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
