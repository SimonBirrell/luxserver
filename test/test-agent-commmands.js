"use strict";

// Test the commands that the agent sends to the server.
// The T helper contains functions to connect to the server via websockets as if it
// were an agent.

var assert = require('assert');

describe('LuxAgent Commands', function() {
    const   server = require('../server.js'),
            T = require('./test-helpers');  
    let receivedConnect = false;              

    beforeEach(function() {
        T.startup();
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

    // An agent that sends the wrong credentials should be refused
    it('should refuse an agent that sends incorrect authentication details', function(done) {
        let ws = T.authenticateAgent("instance","org","machine","network","wrong_user","****");

        T.trapMessage(ws, function(mtype, mbody) {
            assert((mtype!=='agentConnected'), 'should not be connected');
            assert((mtype==='agentRefused'), 'connection should be explicitly refused');
            assert((mbody['errorMessage']==='Invalid agent credentials.'), 'should send human-readable error message');
            assert((mbody['errorCode']==='ERR_INVALID_CREDENTIALS'), 'should send machine-readable error code');
            done();
        });            

    });
    
    // Disabled.
    // Not closing socket any longer on unauthorized message. Just logging and ignoring it.
    xit("should close connection if clients sends any other command without being properly connected", function(done) {
        
        let ws = T.openBrowserSocketAndSend({
            mtype:'ping',
            mbody: {}
        });

        ws.on('close', function close() {
            done();
        });        
    });
    
    // Commands can go from agent to server after agent is authenticated.
    //
    it("should accept a command if authenticated", function(done) {
        let ws = T.authenticateAgent();
        
        // Trap server to agent commands.
        T.trapMessage(ws, function(mtype, mbody) {
            if (mtype==='pong') {
                done();
            }
        });        

        // Send agent to server commands
        ws.on('open', function() {
            T.sendToWebsocket(ws, 'ping');
        });
                             
    });

    // After authentication, the first thing the server does is subscribe to agent's graph
    // 
    it('requests a graph subscription once a lux agent connects', function(done) {
        let ws = T.authenticateAgent();

        // Trap server to agent commands.
        T.trapMessage(ws, function(mtype, mbody) {
            if (mtype==='subscribeGraph') {
                done();
            }
        });        
    });
    
    // Two agents should be able to connect simultaneously.
    //
    it('allows two lux agents to connect', function(done) {
        
        let idConnection1 = "",
            idConnection2 = "";

        let ws1 = T.authenticateAgent();
        
        // Trap server to agent 1 commands.
        T.trapMessage(ws1, function(mtype, mbody) {
            if (mtype==='agentConnected') {
                idConnection1 = mbody;
            }
        });        
        
        let ws2 = T.authenticateAgent();

        // Trap server to agent 2 commands.
        T.trapMessage(ws2, function(mtype, mbody) {
            if (mtype==='agentConnected') {
                idConnection2 = mbody;
                assert((idConnection1 !== idConnection2), 'Different connection IDs for connections');
                done();
            }
        });                
    });
    
    // Check that ROS instances are created on the server
    // 
    it("should allow agents to connect and disconnect", function(done) {
        // Create three agents
        let ws1 = T.authenticateAgent("instance1", "anOrg"),
            ws2 = T.authenticateAgent("instance1", "anOrg"),
            ws3 = T.authenticateAgent("instance3", "anOrg"),
            count = 0,
            instances = null;
              
        // Trap server to agent 3 commands.
        T.trapMessage(ws3, function(mtype, mbody) {
            // Check three instances have been created
            instances = global.Agents.rosInstancesConnected("anOrg");
            assert((instances.length===3), "Full set of instances returned");
            ws2.on('close', function() {
                // On closing an agent, check only to instances remain.
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

    // Check creation and destruction of ROS instances (not via websockets).
    //
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

    // Various agents may connect from the same ROS instance. Onyl one reports the ROS 
    // computational graph to the server.
    // So what do the others do? Right now they can report installed packages on the 
    // agent's host. In the future they could also report CPU consumption, memory etc.
    //
    it('sends subscribeGraph only to first agent from rosInstance to connect', function(done) {
        let ws = T.authenticateAgent("instance","org","machine","network");
        
        // Trap server to agent 1 commands.
        T.trapMessage(ws, function(mtype, mbody) {
            
            if (mtype==='subscribeGraph') {
                // Create second agent
                let ws2 = T.authenticateAgent("instance","org","machine2","network"),
                    count = 0;
                // Trap server to agent 2 commands    
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

    // This is an early attempt at a more efficient binary protocol.
    // Compression will need to be added, probably specific to the message type.
    // 
    it('allows BSON as well as JSON', function(done) {
        let ws = T.authenticateAgent("instance","org","machine","network");

        // Messages recived by dummy agent
        T.trapMessage(ws, function(mtype, mbody) {
            
            if (mtype==='subscribeGraph') {
                // Agent sends a graph item
                T.sendToWebsocketAsBSON(ws, 'graphAdd', [['foo', 'bar']]);
                // After message from agent received, check the ROS instance has been updated
                setTimeout(function() {
                    assert((global.RosInstances.RosInstances[0].graph['foo']==='bar'), "JSON from client updates graph");
                    done();
                }, 200);
            }

        });        
    });
    
});