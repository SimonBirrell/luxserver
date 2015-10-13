"use strict";

// (c) 2015 Robot Lux. all Rights Reserved.
// Written by Simon Birrell.

// This object represents the global list of connected Agents, It's a class method if you like.

const   serverLog = require('./serverLog');

module.exports = {
    AgentLookup: [],
    
    reset: function() {
        this.AgentLookup = [];
    },
    
    // Add agent to the gobal list.
    //
    //      agent - an Agent object
    //
    addAgent: function(agent) {
        serverLog("Adding agent with rosinstanceId: " + agent.rosinstanceId);
        this.AgentLookup.push(agent);
    },
    
    // Remove agent from the gobal list.
    //
    //      agent - an Agent object
    //
    removeAgent: function(agent) {
        serverLog("Removing agent " + agent);
        let index = this.AgentLookup.indexOf(agent);
        if (index > -1) {
            this.AgentLookup.splice(index, 1);
            serverLog("removed");
            serverLog(this.rosInstancesConnected());
        }
    },
    
    // Return list of connected ROS Instances that belong to the given organization.
    //
    //      orgId - an organization
    //
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
    
    // Find the connected agent installed on a given machine.
    //
    //      fullMachineId - fully qualified definition of a machine
    //
    getAgentOnMachine: function(fullMachineId) {
        for (let i=0; i < this.AgentLookup.length; i++) {
            if (this.AgentLookup[i].fullMachineId===fullMachineId) {
                return this.AgentLookup[i];
            }
        }
        return null;
    },
    
    // Find the agent that represents a given ROS instance.
    //
    //      rosInstanceId - fully qualified definition of a ROS instance
    //
    getAgentOnRosInstance: function(rosInstanceId) {
        for (let i=0; i < this.AgentLookup.length; i++) {
            console.log(this.AgentLookup[i].fullRosInstanceId);
            if (this.AgentLookup[i].fullRosInstanceId===rosInstanceId) {
                return this.AgentLookup[i];
            }
        }
        return null;
    },
    
    // Forward a command for a ROS instance to the appropriate Agent.
    //
    //      command - rosrun, roslaunch, kill
    //      sender - the sending object, typically a Browser
    //      mbody - the command payload, which will include the rosInstanceId
    //
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

    // Forward a topic message for a ROS instance to the appropriate Agent.
    //
    //      command - always 'message'
    //      sender - the sending object, typically a Browser
    //      mbody - the message payload, which will include the rosInstanceId
    //    
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

