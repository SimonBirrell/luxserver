"use strict";

const   serverLog = require('./serverLog'),
        sendMessage = require('./sendMessage');

function Agent(ws, mbody) {    
    this.ws = ws;
    this.setupId(mbody);
    global.Agents.addAgent(this);
    this.rosInstance = global.RosInstances.findOrCreateRosInstance(mbody);
    if (this.rosInstance.count===1) {
        // Send subscribe message on 1st agent to connect. Might want to modify this
        // to agent who explicitly defines itself as being on the master machine
        sendMessage(ws, 'subscribeGraph');            
    } 
}

Agent.prototype.interpretCommand = function interpretCommand(mtype, mbody) {
    //serverLog("interpretCommand " + mtype);
    if (mtype==='ping') {
        sendMessage(this.ws, 'pong');
    } else if (mtype==='graphAdd') {
        this.rosInstance.addToGraph(mbody);
    } else if (mtype==='graphDel') {
        this.rosInstance.deleteFromGraph(mbody);
    } else if (mtype==='graphUpd') {
        this.rosInstance.updateFromGraph(mbody);
    }    
    //serverLog("......")    
}

Agent.prototype.setupId = function setupId(mbody) {
    this.orgId = ('org' in mbody) ? mbody['org'] : 'unknown';
    this.rosinstanceId = ('rosinstance' in mbody) ? mbody['rosinstance'] : 'unknown';
    this.networkId = ('network' in mbody) ? mbody['network'] : '0';
    this.hostnameId = ('hostname' in mbody) ? mbody['hostname'] : 'unknown';   
    this.rosinstanceHumanId = ('rosinstanceHuman' in mbody) ? mbody['rosinstanceHuman'] : 'robot';   
    
    this.fullRosInstanceId = this.orgId + " " + this.networkId + " " + this.rosinstanceId;   
    this.fullMachineId = this.fullRosInstanceId + " " + this.hostnameId;   
}

Agent.prototype.doCommand = function doCommand(command, sender, args) {
    sendMessage(this.ws, command, {args: args});
    sender.sendMessage(command + 'Sent', {rosmachine: this.fullMachineId});                        
}

Agent.prototype.sendTopicMessage = function sendTopicMessage(command, sender, mbody) {
    sendMessage(this.ws, command, mbody);
}

Agent.prototype.close = function() {
    global.RosInstances.removeReference(this.fullRosInstanceId);
    global.Agents.removeAgent(this);
}
        
module.exports = Agent;
