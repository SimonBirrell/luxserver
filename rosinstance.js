"use strict";

const   serverLog = require('./serverLog');

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
    global.Browsers.sendToAllBrowsersInOrg('rosInstancesUpdate', [{'add':this.fullRosInstanceId}], this.orgId);        
}

RosInstance.prototype.notifyDeletion = function notifyDeletion() {
    global.Browsers.sendToAllBrowsersInOrg('rosInstancesUpdate', [{'del':this.fullRosInstanceId}], this.orgId);     
}

RosInstance.prototype.subscribeToGraph = function subscribeToGraph(observer) {
    serverLog("subscribeToGraph graph = " + JSON.stringify(this.graph));
    if (this.orgId === observer.orgId) {
        observer.sendMessage('rosInstanceGraph', {rosInstance: this.fullRosInstanceId, graph: this.graph});    
        this.addObserver(observer);        
    } else {
        observer.sendMessage('rosInstanceUpdate', {rosInstance: this.fullRosInstanceId, error: "Access forbidden."});                        
    }
}

RosInstance.prototype.unsubscribeFromGraph = function unsubscribeFromGraph(observer) {
    if (this.orgId === observer.orgId) {
        observer.sendMessage('unsubscribedRosInstance', {rosInstance: this.fullRosInstanceId});    
        this.removeObserver(observer);        
    } else {
        observer.sendMessage('unsubscribeRosInstance', {rosInstance: this.fullRosInstanceId, error: "Access forbidden."});                        
    }
}

RosInstance.prototype.addObserver = function addObserver(observer) {
    for (let i=0; i<this.observers.length; i++) {
        if (this.observers[i] === observer) {
            return;
        }
    }
    this.observers.push(observer);
}

RosInstance.prototype.removeObserver = function removeObserver(observer) {
    for (let i=0; i<this.observers.length; i++) {
        if (this.observers[i] === observer) {
            this.observers.splice(i, 1);
            return;
        }
    }
}
 
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

RosInstance.prototype.close = function close() {
    global.RosInstances.deleteRosInstance(this);
}

  
module.exports = RosInstance;
