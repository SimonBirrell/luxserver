"use strict";

exports.trapMessage = function(ws, testMessage) {
    ws.on('message', function(data) {
        let message = JSON.parse(data),
            mtype = message.mtype,             
            mbody = (typeof message.mbody !== 'undefined') ? message.mbody : null    
        
        testMessage(mtype, mbody)
    });
}

exports.sendToWebsocket = function(ws, mtype, mbody) {
    if (typeof mbody !== 'undefined') {
        ws.send(JSON.stringify({mtype:mtype, mbody:mbody}));
    }
    else {
        ws.send(JSON.stringify({mtype:mtype}));
    }
}

exports.openBrowserSocketAndSend = function(message) {
    const   WebSocket = require('ws'),
            //ws = new WebSocket('ws://localhost:8001');
            ws = new WebSocket('ws://localhost:8000');
    ws.on('open', function open() {
        ws.send(JSON.stringify(message));
    });
    return ws;        
}

exports.openAgentSocketAndSend = function(message) {
    const   WebSocket = require('ws'),
            ws = new WebSocket('ws://localhost:8000');
    ws.on('open', function open() {
        ws.send(JSON.stringify(message));
    });
    return ws;        
}

exports.authenticateBrowser = function(orgId) {
    orgId = (typeof orgId!=='undefined') ? orgId : 'theOrg'
    let ws = this.openBrowserSocketAndSend({
        mtype:'browserConnect',
        mbody:{org:orgId,secret:'bar',rosinstance:'baz'}
    });
    
    return ws;
}

exports.authenticateAgent = function(rosinstanceId, orgId, hostnameId, networkId) {
    rosinstanceId = (typeof rosinstanceId!=='undefined') ? rosinstanceId : 'anInstance'
    orgId = (typeof orgId!=='undefined') ? orgId : 'theOrg'
    hostnameId = (typeof hostnameId!=='undefined') ? hostnameId : 'theHostname'
    networkId = (typeof networkId!=='undefined') ? networkId : '0'
    
    let ws = this.openAgentSocketAndSend({
        mtype:'agentConnect',
        mbody:{org:orgId,secret:'bar',rosinstance:rosinstanceId,hostname:hostnameId,network:networkId}
    });
    
    return ws;
}

exports.buildFullMachineId = function(rosinstanceId, orgId, hostnameId, networkId) {
    networkId = (typeof networkId!=='undefined') ? networkId : '0'
    return orgId + " " + networkId + " " + rosinstanceId + " " + hostnameId;    
}

exports.buildFullRosInstanceId = function(rosinstanceId, orgId, hostnameId, networkId) {
    networkId = (typeof networkId!=='undefined') ? networkId : '0'
    return orgId + " " + networkId + " " + rosinstanceId;    
}

exports.displayRosInstances = function () {
    for (let i=0; i<global.RosInstances.RosInstances.length; i++) {
        console.log(">> " + global.RosInstances.RosInstances[i].fullRosInstanceId);            
    }        
}

exports.teardown = function() {
    global.RosInstances.empty();
}


