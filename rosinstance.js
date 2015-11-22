"use strict";

// (c) 2015 Robot Lux. all Rights Reserved.
// Written by Simon Birrell.

// Represents a ROS instance connected to the server by way of one or more agents.
// It handles subscriptions and updates for the ROS instance.
// Each ROS Instance has a graph which contains the nodes, topics and packages.
// This is a superset of the ROS computational graph which just contains nodes and topics.

const   serverLog = require('./serverLog');

// Create a connected ROS instance.
//
//      fullRosInstanceId - fully qualified ID for ROS instance
//      rosInstanceHumandId - human readable name, e.g. "My Sex Robot"
//      orgId - the organization this ROS instance belongs to 
//
function RosInstance(fullRosInstanceId, rosInstanceHumanId, orgId) {    
    this.fullRosInstanceId = fullRosInstanceId;
    this.rosInstanceHumanId = rosInstanceHumanId;
    this.orgId = orgId;
    this.count = 1;
    this.observers = [];
    this.graph = {};
    
    global.RosInstances.addRosInstance(this);
    
    this.notifyAddition();         
}

RosInstance.prototype.notifyAddition = function notifyAddition() {
    global.Browsers.sendToAllBrowsersInOrg('rosInstancesUpdate', [
        {'add': {   rosInstanceId: this.fullRosInstanceId,
                    rosInstanceHumanId: "foo" //this.fullRosInstanceId
                }}], this.orgId);        
}

RosInstance.prototype.notifyDeletion = function notifyDeletion() {
    global.Browsers.sendToAllBrowsersInOrg('rosInstancesUpdate', [{'del':this.fullRosInstanceId}], this.orgId);     
}

// Allows an observer to subscribe to graph changes.
//
//      observer - an observing object that implements sendMessage()
//
RosInstance.prototype.subscribeToGraph = function subscribeToGraph(observer) {
    serverLog("subscribeToGraph graph = " + JSON.stringify(this.graph));
    if (this.orgId === observer.orgId) {
        observer.sendMessage('rosInstanceGraph', {rosInstance: this.fullRosInstanceId, graph: this.graph});    
        this.addObserver(observer);        
    } else {
        observer.sendMessage('rosInstanceUpdate', {rosInstance: this.fullRosInstanceId, error: "Access forbidden."});                        
    }
}

// Allows a subscribed observer to unsubscribe from graph changes.
//
//      observer - an observing object that implements sendMessage()
//
RosInstance.prototype.unsubscribeFromGraph = function unsubscribeFromGraph(observer) {
    if (this.orgId === observer.orgId) {
        observer.sendMessage('unsubscribedRosInstance', {rosInstance: this.fullRosInstanceId});    
        this.removeObserver(observer);        
    } else {
        observer.sendMessage('unsubscribeRosInstance', {rosInstance: this.fullRosInstanceId, error: "Access forbidden."});                        
    }
}

// Add observer to list. This should probably be private.
//
RosInstance.prototype.addObserver = function addObserver(observer) {
    for (let i=0; i<this.observers.length; i++) {
        if (this.observers[i] === observer) {
            return;
        }
    }
    this.observers.push(observer);
}

// Remove observer from list. This should probably be private.
//
RosInstance.prototype.removeObserver = function removeObserver(observer) {
    for (let i=0; i<this.observers.length; i++) {
        if (this.observers[i] === observer) {
            this.observers.splice(i, 1);
            return;
        }
    }
}
 
// Add an item to the graph and notify observers. Generally triggered by agent, registering a 
// change in the ROS computational graph.
//
//      addition - new item. 2 element array [key, value]
//                 Not really interpreted by server, just stored and passed on to
//                 observers.  
//
RosInstance.prototype.addToGraph = function addToGraph(addition) {
    let browserGraphUpdate = {};
    for (let i=0; i<addition.length; i++) {
        let key = addition[i][0],
            value = addition[i][1];
        this.graph[key] = value;    
        browserGraphUpdate[key] = value;
    }
    for (let i=0; i<this.observers.length; i++) {
        this.observers[i].sendMessage('rosInstanceGraphAdd', {rosInstance: this.fullRosInstanceId, graph: browserGraphUpdate});    
    }
}

// Alter an item to the graph and notify observers. Generally triggered by agent, registering a 
// change in the ROS computational graph.
//
//      change - changed item. 2 element array [key, value]
//               Not really interpreted by server, just stored and passed on to
//               observers.  
//
//  Note that there is currently little practical difference between and "Add" and an "Update".
//
RosInstance.prototype.updateFromGraph = function updateFromGraph(change) {
    //serverLog("");
    //serverLog("updateFromGraph ");
    //serverLog(change);
    for (let i=0; i<change.length; i++) {
        let key = change[i][0],
            value = change[i][1];
        this.graph[key] = value;    
    }
    for (let i=0; i<this.observers.length; i++) {
        this.observers[i].sendMessage('rosInstanceGraphUpd', {rosInstance: this.fullRosInstanceId, graph: change});    
    }
}

// Delete items from the graph. Generally triggered by agent, registering a 
// deletion in the ROS computational graph.
//
//      snip - array of keys of items to remove.
//
RosInstance.prototype.deleteFromGraph = function deleteFromGraph(snip) {
    let snipInBrowserFormat = [];
    for (let i=0; i<snip.length; i++) {
        let key = snip[i][0];
            snipInBrowserFormat.push(key);
            delete this.graph[key];
    }
    for (let i=0; i<this.observers.length; i++) {
        this.observers[i].sendMessage('rosInstanceGraphDel', {rosInstance: this.fullRosInstanceId, graph: snipInBrowserFormat});    
    }
}

// Clean up a ROS instance that disconnects
//
RosInstance.prototype.close = function close() {
    global.RosInstances.deleteRosInstance(this);
}

  
module.exports = RosInstance;
