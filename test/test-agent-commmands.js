"use strict";

var assert = require('assert');

describe('LuxAgent Commands', function() {
    const   server = require('../server.js'),
            T = require('./test-helpers');  
    let receivedConnect = false;              

    beforeEach(function() {
        server.launch();
    });
    
    afterEach(function() {
        console.log("afterEach");
        server.shutdown();       
        T.teardown(); 
    });
    
    it('allows a lone lux agent to connect and create RosInstance', function(done) {
        let ws = T.authenticateAgent("instance","org","machine","network");
        
        T.trapMessage(ws, function(mtype, mbody) {
            
            if (mtype==='agentConnected') {
                receivedConnect = true;
            }
            else if (mtype==='subscribeGraph') {
                assert((receivedConnect === true), 'Received agentConnect');
                let fullMachineId = T.buildFullMachineId("instance","org","machine","network"),     
                    fullRosInstanceId = T.buildFullRosInstanceId("instance","org","machine","network");
                
                // Check Agent correctly created
                assert((global.Agents.AgentLookup.length===1), "Agent created");
                assert((global.Agents.AgentLookup[0].fullRosInstanceId === fullRosInstanceId), "Agent assigned to correct RosInstanceId");        
                assert((global.Agents.AgentLookup[0].fullMachineId === fullMachineId), "Agent assigned to correct machineId");        
                
                // Check RosInstance correctly created
                assert((global.Agents.getAgentOnMachine(fullMachineId)), 'Registered under correct machine Id');
                assert((global.RosInstances.RosInstances.length===1), "RosInstance created");
                assert((global.RosInstances.RosInstances[0].fullRosInstanceId === T.buildFullRosInstanceId("instance","org","machine","network")), "RosInstance correctly named");
                done();
            }
        });        
    });
    
    it("should close connection if clients sends any other command without being properly connected", function(done) {
        
        let ws = T.openBrowserSocketAndSend({
            mtype:'ping',
            mbody: {}
        });

        ws.on('close', function close() {
            done();
        });        
    });
    
    it("should accept a command if authenticated", function(done) {
        let ws = T.authenticateAgent();
        
        T.trapMessage(ws, function(mtype, mbody) {
            if (mtype==='pong') {
                done();
            }
        });        

        ws.on('open', function() {
            T.sendToWebsocket(ws, 'ping');
        });
                             
    });
    
    it('requests a graph subscription once a lux agent connects', function(done) {
        let ws = T.authenticateAgent();

        T.trapMessage(ws, function(mtype, mbody) {
            if (mtype==='subscribeGraph') {
                done();
            }
        });        
    });
    
    it('allows two lux agents to connect', function(done) {
        
        let idConnection1 = "",
            idConnection2 = "";

        let ws1 = T.authenticateAgent();
        
        T.trapMessage(ws1, function(mtype, mbody) {
            if (mtype==='agentConnected') {
                idConnection1 = mbody;
            }
        });        
        
        let ws2 = T.authenticateAgent();

        T.trapMessage(ws2, function(mtype, mbody) {
            if (mtype==='agentConnected') {
                idConnection2 = mbody;
                assert((idConnection1 !== idConnection2), 'Different connection IDs for connections');
                done();
            }
        });                
    });
    
    it("should allow agents to connect and disconnect", function(done) {
        let ws1 = T.authenticateAgent("instance1", "anOrg"),
            ws2 = T.authenticateAgent("instance1", "anOrg"),
            ws3 = T.authenticateAgent("instance3", "anOrg"),
            count = 0,
            instances = null;
              
        T.trapMessage(ws3, function(mtype, mbody) {
            instances = global.Agents.rosInstancesConnected("anOrg");
            assert((instances.length===3), "Full set of instances returned");
            ws2.on('close', function() {
                if (count===1) {
                    setTimeout(function() {
                        instances = global.Agents.rosInstancesConnected("anOrg");
                        assert((instances.length===2), "2 instances returned");
                        done();                                            
                    }, 50);
                }
                count++;
            });
            ws2.close();
        });
    });

    it("should handle rosinstances list", function() {
        let mbody = {org:'org', secret:'secret', rosinstance:'anInstance', hostname:'hostname1',network:'3'};
        global.RosInstances.findOrCreateRosInstance(mbody);
        assert(global.RosInstances.RosInstances.length===1, 'One rosinstance');

        mbody.hostname = 'hostname2';
        global.RosInstances.findOrCreateRosInstance(mbody);
        assert(global.RosInstances.RosInstances.length===1, 'One rosinstance still');
        
        mbody.rosinstance = 'anotherInstance';
        let three = global.RosInstances.findOrCreateRosInstance(mbody);
        assert(global.RosInstances.RosInstances.length===2, 'Two rosinstances');
                
        three.close();        
        assert(global.RosInstances.RosInstances.length===1, 'One rosinstance again');
                
    });
    
    it('sends subscribeGraph only to first agent from rosInstance to connect', function(done) {
        let ws = T.authenticateAgent("instance","org","machine","network");
        
        T.trapMessage(ws, function(mtype, mbody) {
            
            if (mtype==='subscribeGraph') {
                let ws2 = T.authenticateAgent("instance","org","machine2","network"),
                    count = 0;
                T.trapMessage(ws2, function(mtype2, mbody) {
                    console.log("******* " + mtype2);
                    assert(mtype2!=='subscribeGraph', 'does not receive subscribeGraph');
                    count ++;
                    if (count===2) {
                        done();
                    }
                });    
                ws2.on('open', function() {
                    T.sendToWebsocket(ws2, 'ping');
                });
            }
        });        
    });
    
});