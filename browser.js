"use strict";

// (c) 2015 Robot Lux. all Rights Reserved.
// Written by Simon Birrell.

// This object represents a single browser connected to the server.

const   serverLog = require('./serverLog'),
        sendMessageToClient = require('./sendMessageToClient');

// Represents a browser that has successfully connected to the server.
// Each browser will potentially connect to all ROS instances within an organization.
// The Browser adds itself to a global list.
//
//      ws - the websocket connection 
//      mbody - the logon payload, which contains the organization id.
//
function Browser(ws, mbody) {    
    this.ws = ws;
    this.setupId(mbody);
    this.name = "Browser " + this.orgId + " " + ws.upgradeReq.connection.remoteAddress;
    global.Browsers.addBrowser(this);
}

// Extract and record organization id from logon payload.
//
//      mbody - logon payload
//
Browser.prototype.setupId = function setupId(mbody) {
    this.orgId = ('org' in mbody) ? mbody['org'] : 'unknown';
}

// Interpret a command received from the browser.
//  
//      mtype - string that defines command 
//      mbody - command payload
//
Browser.prototype.interpretCommand = function interpretCommand(mtype, mbody) {
    if (mtype==='ping') {
        sendMessageToClient(this, 'pong');
    } else if (mtype==='subscribeRosInstances') {
        let addRosInstances = global.RosInstances.updateMessage(this.orgId, 'add');
        this.sendCompleteMessage(addRosInstances);   
    } else if (mtype==='subscribeRosInstance') {
        let subscribedRosInstanceId = mbody['rosInstance'];      
        global.RosInstances.attemptGraphSubscription(this, subscribedRosInstanceId);
    } else if (mtype==='unsubscribeRosInstance') {
        let subscribedRosInstanceId = mbody['rosInstance'];      
        global.RosInstances.attemptGraphUnSubscription(this, subscribedRosInstanceId);
    } else if ((mtype==='rosrun')||(mtype==='roslaunch')||(mtype==='kill')) {
        global.Agents.attemptRosCommand(mtype, this, mbody);
    } else if (mtype==='message') {
        global.Agents.attemptSendTopicMessage(mtype, this, mbody);
    }        
}

// Clean up a browser that disconnects. Unsubsscribe from all ROS instance graphs and remove self from
// global browser list.
//
Browser.prototype.close = function() { 
    global.RosInstances.unsubscribeFromAllGraphs(this);
    global.Browsers.removeBrowser(this);
}

// Send a message to the browser from the server.
//
//      mtype - string that defines command 
//      mbody - command payload
//
Browser.prototype.sendMessage = function sendMessage(mtype, mbody) {
    //serverLog("browser.sendMessage: " + mtype + " " + JSON.stringify(mbody));
    sendMessageToClient(this, mtype, mbody);
    //serverLog("sent");
}

// Keep connection alive
//
Browser.prototype.sendKeepAlive = function sendKeepAlive() {
    sendMessageToClient(this, 'keepAlive');
}

// Convenience version of sendMessage.        
Browser.prototype.sendCompleteMessage = function sendMessage(message) {
    sendMessageToClient(this, message.mtype, message.mbody);
}
        
module.exports = Browser;
