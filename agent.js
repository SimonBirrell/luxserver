"use strict";

// This object represents a single agent connected to the server.

const   serverLog = require('./serverLog'),
        sendMessageToClient = require('./sendMessageToClient'),
        managerInterface = require('./managerInterface');

// Represents an agent that has successfully connected to websocket.
// Finds or instantiates a rosInstance for the ROS instance represented by the agent. 
// Generally there should only be one ROS instance per agent, but it's possible we'll need
// multiple agents in the future (e.g. if the instance is distributed over multiple machines and
// we want priviliged access to each machine).    
//
//      ws - websocket connection
//      mbody - the initial "logon" payload
//
function Agent(ws, mbody) {    
    this.ws = ws;
    this.setupId(mbody);
    this.name = "Agent " + this.fullMachineId + " " + ws.upgradeReq.connection.remoteAddress;

    // Authenticate Agent. If unauthenticated then just return without adding to 
    // global list of agents.
    managerInterface.connect();
    this.agentInfo = managerInterface.authenticateAgent(mbody);
    /*
    if (!this.agentInfo.valid) {
        sendMessageToClient(this, 'authenticationFailed');
        return;        
    } 
    */

    // Maintain a global list of connected agents.
    global.Agents.addAgent(this);
    this.rosInstance = global.RosInstances.findOrCreateRosInstance(mbody);
    if (this.rosInstance.count===1) {
        // Send subscribe message on 1st agent to connect. Might want to modify this
        // to agent who explicitly defines itself as living on the master machine
        sendMessageToClient(this, 'subscribeGraph');         
    } 
} 

// Interpret command from this agent.
//
//      mtype - the command
//      mbody - the payload
//
// Currently, the agent can only report on graph changes.
//
Agent.prototype.interpretCommand = function interpretCommand(mtype, mbody) {
    //serverLog("interpretCommand " + mtype);
    if (mtype==='ping') {
        sendMessageToClient(this, 'pong');
    } else if (mtype==='graphAdd') {
        this.rosInstance.addToGraph(mbody);
    } else if (mtype==='graphDel') {
        this.rosInstance.deleteFromGraph(mbody);
    } else if (mtype==='graphUpd') {
        this.rosInstance.updateFromGraph(mbody);
    }    
}

// This function setups the details of the ROS instance and machines that the agent
// represents, defined in the logon payload.
//      
//      orgId - the organization the user belongs to. S/he have access to all ROS instances
//              in the organization.
//      networkId - the id of the network on which the ROS instance is running. This is to
//                  allow multiple identically-named instances (e.g. swarm of drones) in
//                  the same organization.
//      rosInstanceId - the id of the ROS instance, unique within an organization + network.
//      hostnameId - the hostname of the host machine where the agent is installed
//      rosinstanceHumanId - human readable name for the ROS instance.
//      fullRosInstanceId - orgId + networkId + rosInstanceId. This fully defines unique ROS
//                          instance on a system-wide basis.
//      fullMachineId - fullRosInstanceId + hostnameId. This fully defines a unique host machine
//                        on a system-wide basis.
//
Agent.prototype.setupId = function setupId(mbody) {
    this.orgId = ('org' in mbody) ? mbody['org'] : 'unknown';
    this.rosinstanceId = ('rosinstance' in mbody) ? mbody['rosinstance'] : 'unknown';
    this.networkId = ('network' in mbody) ? mbody['network'] : '0';
    this.hostnameId = ('hostname' in mbody) ? mbody['hostname'] : 'unknown';   
    this.rosinstanceHumanId = ('rosinstanceHuman' in mbody) ? mbody['rosinstanceHuman'] : 'robot';   
    
    this.fullRosInstanceId = this.orgId + " " + this.networkId + " " + this.rosinstanceId;   
    this.fullMachineId = this.fullRosInstanceId + " " + this.hostnameId;   
}

// Send a command to the connected agent. Currently, this will be to launch or kill
// ROS nodes. An acknowledgment message returned to the sender so they know the command has
// been forwarded.
//
//      command - String that defines the command. rosrun, roslaunch, kill
//      sender - Object that made the request, typically a Browser object.
//      args - JSON obejct that contains the command arguments
//
Agent.prototype.doCommand = function doCommand(command, sender, args) {
    sendMessageToClient(this, command, {args: args});
    sender.sendMessage(command + 'Sent', {rosmachine: this.fullMachineId});                        
}

// Send a topic message to the connected agent for publishing to the ROS topic. This is 
// generally sent from the browser to the agent when the user is manually controlling
// the robot.
//
//      command - String that defines the command
//      sender - Object that made the request, typically a Browser object.
//      mbody - JSON object that will be convereted to ROS message by the agent and published
//
Agent.prototype.sendTopicMessage = function sendTopicMessage(command, sender, mbody) {
    sendMessageToClient(this, command, mbody);
}

// Keep connection alive
//
Agent.prototype.sendKeepAlive = function sendKeepAlive() {
    sendMessageToClient(this, 'keepAlive');
}

// Close down the agent on logoff.
// 
Agent.prototype.close = function() {
    // Remove reference from ROS instance and delete if necessary.
    global.RosInstances.removeReference(this.fullRosInstanceId);
    // Remove from global list of agents.
    global.Agents.removeAgent(this);
}
        
module.exports = Agent;
