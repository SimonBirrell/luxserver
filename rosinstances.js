"use strict";

// (c) 2015 Robot Lux. all Rights Reserved.
// Written by Simon Birrell.

// A global list of ROS instances.
// Manages the list and also serves as router for subscription requests.

const   serverLog = require('./serverLog'),
        RosInstance = require('./rosinstance.js');

module.exports = {
    RosInstances: [],
    
    // Find a ROS Instance or create one if it doesn't already exist.
    //
    //      mbody - the logon payload
    //
    // contains details of the ROS instance to be located or created.
    //
    findOrCreateRosInstance: function(mbody) {
        let orgId = ('org' in mbody) ? mbody['org'] : 'unknown';
        let rosinstanceId = ('rosinstance' in mbody) ? mbody['rosinstance'] : 'unknown';
        let networkId = ('network' in mbody) ? mbody['network'] : '0';
        let hostnameId = ('hostname' in mbody) ? mbody['hostname'] : 'unknown';   

        let rosInstanceHumanId = ('rosInstanceHuman' in mbody) ? mbody['rosInstanceHuman'] : 'robot';   

        let fullRosInstanceId = orgId + " " + networkId + " " + rosinstanceId;   
        
        for (let i=0; i< this.RosInstances.length; i++) {
            if (this.RosInstances[i].fullRosInstanceId===fullRosInstanceId) {
                this.RosInstances[i].count++;
                return this.RosInstances[i];
            }
        }
                
        let rosInstance = new RosInstance(fullRosInstanceId, rosInstanceHumanId, orgId);
        
        return rosInstance;
    },
    
    // Add a ROS Instance to the global list.
    //
    //      rosInstance - a RosInstance object
    //
    addRosInstance: function(rosInstance) {
        this.RosInstances.push(rosInstance);
    },
    
    // Remove a ROS Instance from the global list.
    //
    //      rosInstance - a RosInstance object
    //
    removeReference: function(fullRosInstanceId) {
        for (let i=0; i< this.RosInstances.length; i++) {
            if (this.RosInstances[i].fullRosInstanceId===fullRosInstanceId) {
                this.RosInstances[i].count--;
                if (this.RosInstances[i].count===0) {
                    this.RosInstances[i].notifyDeletion();
                    this.RosInstances.splice(i,1);   
                }
                return;
            }
        }
    },
    
    // Find a ROS Instance given its id.
    //
    //      fullRosInstanceId - fully specifies ROS instance on a system-wide basis
    //
    find: function(fullRosInstanceId) {
        for (let i=0; i< this.RosInstances.length; i++) {
            if (this.RosInstances[i].fullRosInstanceId===fullRosInstanceId) {
                return this.RosInstances[i];
            }
        }
        return null;
    },
    
    // Find any connected ROS instances attached to an orgainzation.
    //
    //      orgId - organization id
    //
    whereOrgIdEquals: function(orgId) {
        let rosInstances = [];
        if (typeof orgId!=='undefined') {
            for (let i=0; i < this.RosInstances.length; i++) {
                if (this.RosInstances[i].orgId===orgId) {
                    rosInstances.push(this.RosInstances[i]);
                }
            }            
        } else {
            for (let i=0; i < this.RosInstances.length; i++) {
                rosInstances.push(this.RosInstances[i]);
            }
        }
        return rosInstances;
    },
    
    // Attempt to subscribe an observer to a specified ROS instance. Returns error message
    // if ROS instance doesn't exist or should not be acccessed by observe.
    //
    //      observer - an object that implements sendMessage()
    //      subscribedRosInstanceId - the id of the ROS instance to subscribe to
    //
    attemptGraphSubscription: function(observer, subscribedRosInstanceId) {
        let subscribedRosInstance = this.find(subscribedRosInstanceId);
        
        if (subscribedRosInstance) {
            subscribedRosInstance.subscribeToGraph(observer);
        } else {
            observer.sendMessage('rosInstanceUpdate', {rosInstance: subscribedRosInstanceId, error: "Access forbidden."});                        
        }       
    },
     
    // Attempt to unsubscribe a subscribed observer from a specified ROS instance. Returns error message
    // if ROS instance doesn't exist or should not be acccessed by observe.
    //
    //      observer - an object that implements sendMessage()
    //      subscribedRosInstanceId - the id of the ROS instance to subscribe to
    //
    attemptGraphUnSubscription: function(observer, subscribedRosInstanceId) {
        let subscribedRosInstance = this.find(subscribedRosInstanceId);
        
        if (subscribedRosInstance) {
            subscribedRosInstance.unsubscribeFromGraph(observer);
        } else {
            observer.sendMessage('unsubscribeRosInstance', {rosInstance: subscribedRosInstanceId, error: "Access forbidden."});                        
        }       
    },

    // Unsubscribe an observer from all ROS instances.
    //
    //      observer - an object that implements sendMessage()
    //    
    unsubscribeFromAllGraphs: function(observer) {
        // Brute force - could be optimized by caching the list of rosInstances on the browser
        for (let i=0; i< this.RosInstances.length; i++) {
            let rosInstance = this.RosInstances[i];
            rosInstance.removeObserver(observer);
        }        
    },
    
    // Creates update message to be sent later to Browser.
    // See rosInstancesUpdate documentaion in readme.MD
    // Typically used to announce presence of a newly-connected ROS instance.
    // TODO Not sure this function belongs here.
    updateMessage: function(orgId, updateType) {
        let rosInstances = this.whereOrgIdEquals(orgId);
        let addRosInstances = rosInstances.map(function(obj) { 
                                                let o = {}; 
                                                o[updateType] = {
                                                    rosInstanceId: obj.fullRosInstanceId, 
                                                    rosInstanceHumanId: obj.rosInstanceHumanId
                                                }; 
                                                return o;
                                            });
        return {mtype: 'rosInstancesUpdate', mbody: addRosInstances};
    },
    
    // Remove ROS instance from global list, e.g. on log off.
    //
    //      rosInstance - ROS instance to remove
    //
    deleteRosInstance: function(rosInstance) {
        let i = this.RosInstances.indexOf(rosInstance);
        if (i>-1) {
            this.RosInstances.splice(i, 1);
            serverLog("Rosinstance " + rosInstance.fullRosInstanceId + " deleted.")
        }
        else {
            serverLog("RosInstance " + rosInstance.fullRosInstanceId + " could not be deleted - not found");
        }
    },
    
    // Wipe global list of ROS instances.
    //
    empty: function() {
        this.RosInstances = [];
    }
}

