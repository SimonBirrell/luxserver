"use strict";

const   serverLog = require('./serverLog');

module.exports = {
    AgentLookup: [],
    
    reset: function() {
        this.AgentLookup = [];
    },
    
    addAgent: function(agent) {
        serverLog("Adding agent with rosinstanceId: " + agent.rosinstanceId);
        this.AgentLookup.push(agent);
    },
    
    removeAgent: function(agent) {
        serverLog("Removing agent " + agent);
        let index = this.AgentLookup.indexOf(agent);
        if (index > -1) {
            this.AgentLookup.splice(index, 1);
            serverLog("removed");
            serverLog(this.rosInstancesConnected());
        }
    },
    
    rosInstancesConnected: function(orgId) {
        let rosInstances = [];
        if (typeof orgId!=='undefined') {
            for (let i=0; i < this.AgentLookup.length; i++) {
                if (this.AgentLookup[i].orgId===orgId) {
                    rosInstances.push(this.AgentLookup[i].rosinstanceId);
                }
            }            
        } else {
            for (let i=0; i < this.AgentLookup.length; i++) {
                rosInstances.push(this.AgentLookup[i].rosinstanceId);
            }
        }
        return rosInstances;
    },
    
    getAgentOnMachine: function(fullMachineId) {
        for (let i=0; i < this.AgentLookup.length; i++) {
            if (this.AgentLookup[i].fullMachineId===fullMachineId) {
                return this.AgentLookup[i];
            }
        }
        return null;
    },
    
    getAgentOnRosInstance: function(rosInstanceId) {
        for (let i=0; i < this.AgentLookup.length; i++) {
            console.log(this.AgentLookup[i].fullRosInstanceId);
            if (this.AgentLookup[i].fullRosInstanceId===rosInstanceId) {
                return this.AgentLookup[i];
            }
        }
        return null;
    },
    
    attemptRosCommand: function(command, sender, mbody) {
        let rosMachineId = mbody.rosmachine,
            args = mbody.args,
            agent = global.Agents.getAgentOnMachine(rosMachineId);
        
        if ((agent)&&(agent.orgId===sender.orgId)) {
            agent.doCommand(command, sender, args);
        } else {
            sender.sendMessage(command + 'Sent', {rosmachine: rosMachineId, error: "Access forbidden."});                        
        }       
    },

    attemptSendTopicMessage: function(command, sender, mbody) {
        let rosInstanceId = mbody.rosInstance,
            args = mbody.args,
            agent = global.Agents.getAgentOnRosInstance(rosInstanceId);
        
        if ((agent)&&(agent.orgId===sender.orgId)) {
            agent.sendTopicMessage(command, sender, mbody);
        } else {
            sender.sendMessage('messageStatus', {rosInstance: rosInstanceId, topic: mbody.topic, error: "Access forbidden."});                        
        }       
    }
};

