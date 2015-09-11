"use strict";

const   serverLog = require('./serverLog'),
        sendMessage = require('./sendMessage');

exports.handleBrowserConnection = function connection(ws) {
    const   handleConnection = require('./handleConnection.js').handleConnection;
    let browser = null;
    
    handleConnection(ws, 'browser', interpretCommand, logon, logoff);
        
    function logon(mbody) {
        serverLog("Browser logging on... NEW");
        
        let Browser = require('./browser');
        browser = new Browser(ws, mbody);
    }    
        
    function interpretCommand(mtype, mbody) {
        if (browser) {
            browser.interpretCommand(mtype, mbody);
        } else {
            serverLog("Unauthenticated browser sent command mtype: " + mtype + " mbody: " + JSON.stringify(mbody));
        }
    }  
    
    function logoff() {
        serverLog("Logging off browser...");
        if (browser) {
            browser.close();            
        }
    }
    
}
 
 
