"use strict";

const   serverLog = require('./serverLog'),
        sendMessageToWebsocket = require('./sendMessage');

function Browser(ws, mbody) {    
    this.ws = ws;
    this.setupId(mbody);
    global.Browsers.addBrowser(this);
}

Browser.prototype.setupId = function setupId(mbody) {
    this.orgId = ('org' in mbody) ? mbody['org'] : 'unknown';
}

Browser.prototype.interpretCommand = function interpretCommand(mtype, mbody) {
    if (mtype==='ping') {
        sendMessageToWebsocket(this.ws, 'pong');
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

Browser.prototype.close = function() {
    global.RosInstances.unsubscribeFromAllGraphs(this);
    global.Browsers.removeBrowser(this);
}

Browser.prototype.sendMessage = function sendMessage(mtype, mbody) {
    //serverLog("browser.sendMessage: " + mtype + " " + JSON.stringify(mbody));
    sendMessageToWebsocket(this.ws, mtype, mbody);
    //serverLog("sent");
}
        
Browser.prototype.sendCompleteMessage = function sendMessage(message) {
    //serverLog("browser.sendCompleteMessage: " + message.mtype + " " + message.mbody);
    sendMessageToWebsocket(this.ws, message.mtype, message.mbody);
}
        
module.exports = Browser;
