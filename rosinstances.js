"use strict";

const   serverLog = require('./serverLog'),
        RosInstance = require('./rosinstance.js');

module.exports = {
    RosInstances: [],
    
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
    
    addRosInstance: function(rosInstance) {
        this.RosInstances.push(rosInstance);
    },
    
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
    
    find: function(fullRosInstanceId) {
        for (let i=0; i< this.RosInstances.length; i++) {
            if (this.RosInstances[i].fullRosInstanceId===fullRosInstanceId) {
                return this.RosInstances[i];
            }
        }
        return null;
    },
    
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
    
    attemptGraphSubscription: function(observer, subscribedRosInstanceId) {
        let subscribedRosInstance = this.find(subscribedRosInstanceId);
        
        if (subscribedRosInstance) {
            subscribedRosInstance.subscribeToGraph(observer);
        } else {
            observer.sendMessage('rosInstanceUpdate', {rosInstance: subscribedRosInstanceId, error: "Access forbidden."});                        
        }       
    },
    
    attemptGraphUnSubscription: function(observer, subscribedRosInstanceId) {
        let subscribedRosInstance = this.find(subscribedRosInstanceId);
        
        if (subscribedRosInstance) {
            subscribedRosInstance.unsubscribeFromGraph(observer);
        } else {
            observer.sendMessage('unsubscribeRosInstance', {rosInstance: subscribedRosInstanceId, error: "Access forbidden."});                        
        }       
    },

    unsubscribeFromAllGraphs: function(observer) {
        // Brute force - could be optimized by caching the list of rosInstances on the browser
        for (let i=0; i< this.RosInstances.length; i++) {
            let rosInstance = this.RosInstances[i];
            rosInstance.removeObserver(observer);
        }        
    },
    
    updateMessage: function(orgId, updateType) {
        let rosInstances = this.whereOrgIdEquals(orgId);
        let addRosInstances = rosInstances.map(function(obj) { let o = {}; o[updateType] = obj.fullRosInstanceId; return o;});
        return {mtype: 'rosInstancesUpdate', mbody: addRosInstances};
    },
    
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
    
    empty: function() {
        this.RosInstances = [];
    }
}

