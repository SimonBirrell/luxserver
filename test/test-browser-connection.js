"use strict";

// Test the commands that the browser sends to the server.
// The T helper contains functions to connect to the server via websockets as if it
// were a browser.

var assert = require('assert');

describe('Browser Commands', function() {
    const   server = require('../server.js'),
            T = require('./test-helpers');        

    beforeEach(function() {
        T.startup();
        global.Agents.reset();
        global.Browsers.reset();      
        server.launch();
    });
    
    afterEach(function() {
        server.shutdown(); 
        T.teardown(); 
        console.log("");
    });
    
    // A browser that authenticates correctly should receive a browserConnected message.
    //
    it('allows a browser to connect', function(done) {
        let ws = T.authenticateBrowser();

        T.trapMessage(ws, function(mtype, mbody) {
            assert((mtype==='browserConnected'), 'Correct mtype');
            done();
         });
    });
    
    // Disabled.
    // Not closing socket any longer on unauthorized message. Just logging and ignoring it.
    xit("should close connection if browser sends any other command without being properly connected", function(done) {
        
        let ws = T.openBrowserSocketAndSend({
            mtype:'ping',
            mbody: {}
        });

        ws.on('close', function close() {
            done();
        });        
    });

    // Accept non-authentication messages once the browser has authenticated.
    //
    it("should accept a command if authenticated", function(done) {
        let ws = T.authenticateBrowser();

        T.trapMessage(ws, function(mtype, mbody) {
            if (mtype==='pong') {
                done();
            }
        });
        
        // Commands from browser to server
        ws.on('open', function() {
            T.sendToWebsocket(ws, 'ping');
        });
                             
    });
    
    // The browser will generally start of by sending a subscribeRosInstances command
    // so that it can be notified of any new or changed ROS instances in this org.
    // If no ROS instances are connected then send an empty update.
    //
    it('should receive a subscribeRosInstances command and send an empty update. Subsequent agent connections will send out updates.', function(done) {
        let ws = T.authenticateBrowser(),
            count = 0,
            eenyReceived = false,
            meenyReceived = false,
            deleteReceived = false;

        var checkMessage = function(mbody) {
            if ((mbody[0]['add']) && (mbody[0]['add']['rosInstanceId'] === T.buildFullRosInstanceId('eeny', 'theOrg','0'))) {
                eenyReceived = true;
            } else if ((mbody[0]['add']) && (mbody[0]['add']['rosInstanceId'] === T.buildFullRosInstanceId('meeny', 'theOrg','0'))) {
                meenyReceived = true;
            } else if (mbody[0]['del']  === T.buildFullRosInstanceId('eeny', 'theOrg','0')) {
                deleteReceived = true;
            }
        }    

        T.trapMessage(ws, function(mtype, mbody) {
            console.log("T received " + mtype + " " + mbody);
            if (mtype==='rosInstancesUpdate') {
                if (count===0) {
                    console.log("1st update mbody: " + JSON.stringify(mbody));                  
                    assert((mbody.length===0), '** No rosintances yet');
                } else if (count===1) {
                    console.log("2nd update mbody: " + JSON.stringify(mbody));                  
                    assert(mbody.length===1, 'Should return one rosInstance');  
                    checkMessage(mbody);
                    assert((mbody[0]['add']['rosInstanceHumanId'] === "foo"), 'RosInstanceId ok');
                } else if (count===2) {
                    console.log("3rd update mbody: " + JSON.stringify(mbody));                  
                    assert(mbody.length===1, 'Should return another new rosInstance');
                    checkMessage(mbody);
                } else if (count===3) {
                    console.log("4th update mbody: " + JSON.stringify(mbody));                  
                    assert(mbody.length===1, 'Should return a deleted rosInstance');
                    //assert(mbody[0]['del']  === T.buildFullRosInstanceId('eeny', 'theOrg','0'), 'Should return another new rosInstance');
                    checkMessage(mbody);
                    assert(deleteReceived, 'Delete Received');
                    assert(eenyReceived, 'Eeny RosInstanceId ok');
                    assert(meenyReceived, 'Meeny RosInstanceId ok');
                    if (eenyReceived && meenyReceived && deleteReceived) {
                        done();
                    }
                }
                count ++;
            }
        });
        
        // Commands from browser to server
        ws.on('open', function() {
            T.sendToWebsocket(ws, 'subscribeRosInstances');
            // Create two agents
            let ws2 = T.authenticateAgent('eeny'),
                ws3 = T.authenticateAgent('meeny');
            
            ws3.on('open', function() {
                setTimeout(function() {
                   ws2.close();
                }, 50);
            });    
        });        
    });
    
    // The browser will generally start of by sending a subscribeRosInstances command
    // so that it can be notified of any new or changed ROS instances in this org.
    // If a ROS instance is already connected then it should be sent.
    //
    it("should receive a subscribeRosInstances command and send out any already connected agents that are in the same org", function(done) {
                
        let ws2 = T.authenticateAgent('foo', 'myOrg', 'eeny'),
            ws3 = T.authenticateAgent('foo', 'myOrg', 'meeny'),
            ws4 = T.authenticateAgent('bar', 'otherOrg', 'mo'),
            ws = T.authenticateBrowser('myOrg'),
            count = 0;            
            
        ws3.on('close', function() {
            setTimeout(function() {
                let instances = global.Agents.rosInstancesConnected("myOrg"),
                    rosInstances = global.RosInstances.RosInstances;
                assert((instances.length===1), "1 instance returned");
                assert((rosInstances.length===2), "2 RosInstances total");
                done();
            }, 50);
        });    
        
        T.trapMessage(ws, function(mtype, mbody) {
            if (mtype==='rosInstancesUpdate') {
                if (count===0) {
                    assert((mbody.length===1), "(mbody.length===1)")                ;
                    assert((mbody[0]['add']['rosInstanceId']==='myOrg 0 foo'), "stringy");
                    ws3.close();
                } else if (count===1) {
                    console.log("2nd update mbody: " + mbody.length + " " + JSON.stringify(mbody));  
                    console.log(mtype);
                    console.log(mbody);                  
                    //assert(((mbody.length===1) && (mbody[0]==={add:'myOrg 0 foo'})), 'Should return one rosInstance');                    
                    assert(((mbody.length===1) && (mbody[0]['add']==='myOrg 0 foo')), 'Should return one rosInstance');                    
                }
                count ++;
            }
        });            

        // Commands from browser to server
        ws.on('open', function() {
            T.sendToWebsocket(ws, 'subscribeRosInstances');
        });        
                
    });

    // Topic messages ahould be forwarded to agent if auhtorized.
    //
    it("should accept a topic message from the browser and send it on to the agent", function(done) {
        let ws2 = T.authenticateAgent('foo', 'myOrg', 'eeny'),
            ws = T.authenticateBrowser('myOrg'),
            topicMessage = {
                                    "rosInstance":"myOrg 0 foo",
                                    "topic":" /cmd_vel",
                                    "message":{
                                        "linear":{"x":0,"y":0,"z":0},
                                        "angular":{"x":0,"y":0,"z":-0.1106}
                                    }
                                };

        T.trapMessage(ws2, function(mtype, mbody) {
            if (mtype==='message') {
                assert(mbody.topic === ' /cmd_vel', 'Correct topic name');
                assert.deepEqual(mbody.message, topicMessage.message, "Message should be same as the one passed by the browser." );
                done();
            }    
        });
    

        // Commands from browser to server
        ws.on('open', function() {
            T.sendToWebsocket( ws, 'message', topicMessage);
        });        
    });
    
    // Don't let people send messages to another organization's robot.
    //
    it("should not accept a topic message from the browser if instance is wrong", function(done) {
        let ws2 = T.authenticateAgent('foo', 'differentOrg', 'eeny'),
            ws = T.authenticateBrowser('myOrg'),
            topicMessage = {
                                    "rosInstance":"myOrg 0 foo",
                                    "topic":" /cmd_vel",
                                    "message":{
                                        "linear":{"x":0,"y":0,"z":0},
                                        "angular":{"x":0,"y":0,"z":-0.1106}
                                    }
                                };

        T.trapMessage(ws, function(mtype, mbody) {
            if (mtype==='messageStatus') {
                console.log("****************");
                console.log(mbody);
                assert(mbody.topic === ' /cmd_vel', 'Correct topic name');
                assert(mbody.error === 'Access forbidden.', 'Wrong instance' );
                done();
            }    
        });
    

        // Commands from browser to server
        ws.on('open', function() {
            T.sendToWebsocket( ws, 'message', topicMessage);
        });        
    });
    
    // Subscribe to a connected ROS instance and test that it receives updates from
    // the agent.
    it("should accept a legitimate subscription to a RosInstance", function(done) {
        // Create three agents and one browser
        let ws2 = T.authenticateAgent('foo', 'myOrg', 'eeny'),
            ws3 = T.authenticateAgent('foo', 'myOrg', 'meeny'),
            ws4 = T.authenticateAgent('bar', 'otherOrg', 'mo'),
            ws = T.authenticateBrowser('myOrg'),
            count = 0,
            targetRosInstance = T.buildFullRosInstanceId('foo', 'myOrg', 'eeny'),
            rosInstance = null,
            ws5 = null;                
            
        T.trapMessage(ws, function(mtype, mbody) {
            if (count===1) {
                // First, the browser receives rosInstanceGraph - The full graph of the ROS instance
                console.log(mtype);
                console.log(mbody);
                assert(mtype==='rosInstanceGraph', 'received full graph');
                let updatedRosInstance = mbody.rosInstance;
                assert(updatedRosInstance === targetRosInstance, 'Correct rosInstance');
                assert.deepEqual(mbody.graph, {}, "Should have empty set");
                rosInstance = global.RosInstances.find(targetRosInstance);
                // An agent sends a graphAdd to Server
                T.sendToWebsocket(ws2, 'graphAdd', [['xxx','xxx-content'], ['yyy','yyy-content']]);                
            } else if (count===2) {
                // Second, the browser receives rosInstanceGraphAdd with the new additions
                assert(mtype==='rosInstanceGraphAdd', 'received add command');
                assert(mbody.graph['xxx']==='xxx-content', "1st Addition key correct");
                assert(mbody.graph['yyy']==='yyy-content', "2nd Addition key correct");
                // Another agent deletes an item from the graph
                T.sendToWebsocket(ws3, 'graphDel', [['xxx',{}]]);
            } else if (count===3) {
                // Third, the browser receives rosInstanceGraphDel with the deleted item
                assert(mtype==='rosInstanceGraphDel', 'received a delete command');
                assert(mbody.graph.length===1, "Should have one deletion");
                assert(mbody.graph[0]==='xxx', "1st deletion key correct");
                // An agent updates an item
                T.sendToWebsocket(ws2, 'graphUpd', [['yyy','zzz-content']]);
            } else if (count===4) {
                // Fourth, the browser receives the updated item
                assert(mtype==='rosInstanceGraphUpd', 'received an update command');
                assert(mbody.graph.length===1, "Should have one update");
                assert(mbody.graph[0][0]==='yyy', "1st Update key correct");
                assert(mbody.graph[0][1]==='zzz-content', "1st Update value correct");
                // Connect a second browser and check the graph received includes the update
                ws5 = T.authenticateBrowser('myOrg');
                T.trapMessage(ws5, function(mtype, mbody) {
                    if (mtype==='rosInstanceGraph') {
                        //assert.deepEqual(mbody.graph, {'xxx':'xxx-content', 'yyy':'zzz-content'}, "Should receive modified graph");
                        assert.deepEqual(mbody.graph, {'yyy':'zzz-content'}, "Should receive modified graph");
                        done();
                    }
                });        
                ws5.on('open', function() {
                    T.sendToWebsocket(ws5, 'subscribeRosInstance', {rosInstance: targetRosInstance});
                });        
            }
            count++;
        });            
    
        // Commands from browser to server
        ws.on('open', function() {
            T.sendToWebsocket(ws, 'subscribeRosInstance', {rosInstance: targetRosInstance});
        });        
        
    });

    // Don't let anybody subscribe to a different organization's robot.
    //
    it("should not accept an illegitimate subscription to a RosInstance", function(done) {
        // Create three agents and one browser
        let ws2 = T.authenticateAgent('foo', 'myOrg', 'eeny'),
            ws3 = T.authenticateAgent('foo', 'myOrg', 'meeny'),
            ws4 = T.authenticateAgent('bar', 'otherOrg', 'mo'),
            ws = T.authenticateBrowser('differentOrg'),
            count = 0,
            targetRosInstance = T.buildFullRosInstanceId('foo', 'myOrg', 'eeny');    
            
        T.trapMessage(ws, function(mtype, mbody) {
            if (mtype==='rosInstanceUpdate') {
                let updatedRosInstance = mbody.rosInstance;
                assert(updatedRosInstance === targetRosInstance, 'Correct rosInstance');
                let change = mbody.change;
                assert(!change, "Shouldn't receive change");
                let err = mbody.error;
                assert(err, "Should have error");
                done();
            }
        });            
    
        // Commands from browser to server
        ws.on('open', function() {
            T.sendToWebsocket(ws, 'subscribeRosInstance', {rosInstance: targetRosInstance});
        });        
        
    });

    // Allow browsers to unsubscribe.
    //        
    it("should accept a graph unsubscription", function(done) {
        // Create three agents and one browser
        let ws2 = T.authenticateAgent('foo', 'myOrg', 'eeny'),
            ws3 = T.authenticateAgent('foo', 'myOrg', 'meeny'),
            ws4 = T.authenticateAgent('bar', 'otherOrg', 'mo'),
            ws = T.authenticateBrowser('myOrg'),
            count = 0,
            targetRosInstance = T.buildFullRosInstanceId('foo', 'myOrg', 'eeny'),
            rosInstance = null;    
            
        T.trapMessage(ws, function(mtype, mbody) {
            if ((mtype==='rosInstanceUpdate') || (mtype==='rosInstanceGraph') || (mtype==='rosInstanceGraphAdd')) {
                // Check the initial sequence of commands from server to browser
                if (count===0) {
                    let updatedRosInstance = mbody.rosInstance;
                    assert(updatedRosInstance === targetRosInstance, 'Correct rosInstance');
                    rosInstance = global.RosInstances.find(targetRosInstance);
                    T.sendToWebsocket(ws2, 'graphAdd', [['xxx','xxx-content'], ['yyy','yyy-content']]);                
                    
                } else if (count===1) {
                    assert(mtype==='rosInstanceGraphAdd', "Should have addition");
                    // Browser tells server that enough is enough
                    T.sendToWebsocket(ws, 'unsubscribeRosInstance', {rosInstance: targetRosInstance});
                } else if (count===2) {
                    throw("shouldn't receive update after unsubscription");
                }
                count++;
            } else if (mtype==='unsubscribedRosInstance') {
                // Server should send this after receiving unsubscribe request 
                assert(mbody.rosInstance === targetRosInstance);
                // Agent sends an update. Browser should not receive it.
                T.sendToWebsocket(ws2, 'graphAdd', [['ppp','xxx-content'], ['qqq','yyy-content']]);                
                // Do a ping-pong to finish off test.
                T.sendToWebsocket(ws, 'ping');
            } else if (mtype==='pong') {
                done();
            }
        });            
    
        // Commands from browser to server
        ws.on('open', function() {
            T.sendToWebsocket(ws, 'subscribeRosInstance', {rosInstance: targetRosInstance});
        });        
                
    });
    
    it("should accept rosrun command and pass it on to the selected machine", function(done) {
        testCommandSentToAgent(done, 'rosrun');
    });
    
    it("should reject rosrun command for different org", function(done) {
        testCommandRejectedForDifferentOrg(done, 'rosrun');
    });
    
    it("should reject rosrun command for a non-existent org", function(done) {
        testCommandSentToNonExistentAgent(done, 'rosrun');
    });
    
    it("should accept roslaunch command and pass it on to the selected machine", function(done) {
        testCommandSentToAgent(done, 'roslaunch');
    });
    
    it("should reject roslaunch command for different org", function(done) {
        testCommandRejectedForDifferentOrg(done, 'roslaunch');
    });
    
    it("should reject roslaunch command for a non-existent org", function(done) {
        testCommandSentToNonExistentAgent(done, 'roslaunch');
    });
    
    it("should accept kill command and pass it on to the selected machine", function(done) {
        testCommandSentToAgent(done, 'kill');
    });
    
    it("should reject kill command for different org", function(done) {
        testCommandRejectedForDifferentOrg(done, 'kill');
    });
    
    it("should reject kill command for a non-existent org", function(done) {
        testCommandSentToNonExistentAgent(done, 'kill');
    });
    
    
    ///// Utility functions //////////////////////////////////////////

    // Check a command send from the browser was appropriately passed on 
    // to agent.
    //
    function testCommandSentToAgent(done, command) {
        // Create three agents and one browser
        let agentWs2 = T.authenticateAgent('foo', 'myOrg', 'eeny'),
            agentWs3 = T.authenticateAgent('foo', 'myOrg', 'meeny'),
            agentWs4 = T.authenticateAgent('bar', 'otherOrg', 'mo'),
            browserWs = T.authenticateBrowser('myOrg'),
            targetRosMachineId = T.buildFullMachineId('foo', 'myOrg', 'meeny'),
            agentReceivedOk = false,
            browserReceivedOk = false;    
            
        T.trapMessage(browserWs, function(mtype, mbody) {
            // Check that the browser receives acknowledgement
            if (mtype===command + 'Sent') {
                browserReceivedOk = true;
                if (agentReceivedOk) {
                    done();
                }
                // assert(agentReceivedOk, "agent receives " + command + " first");
                // assert(mbody.rosmachine===targetRosMachineId, command + 'Sent received by browser');
                // console.log("DONE");
                // done();
            }
        });

        T.trapMessage(agentWs3, function(mtype, mbody) {
            // Check that the agent receives the command
            if (mtype===command) {
                assert(mbody.args==='foo/bar', 'args passed correctly to agent');
                agentReceivedOk = true;
                if (browserReceivedOk) {
                    done();
                }
            }
        });



        // Commands from browser to server
        browserWs.on('open', function() {
            console.log("SENDING FIRST COMMAND");
            T.sendToWebsocket(browserWs, command, {rosmachine: targetRosMachineId, args: 'foo/bar'});
        });                
    }

    function testCommandRejectedForDifferentOrg(done, command) {
        // Create three agents and one browser
        let agentWs2 = T.authenticateAgent('foo', 'myOrg', 'eeny'),
            agentWs3 = T.authenticateAgent('foo', 'myOrg', 'meeny'),
            agentWs4 = T.authenticateAgent('bar', 'otherOrg', 'mo'),
            browserWs = T.authenticateBrowser('myOrg'),
            targetRosMachineId = T.buildFullMachineId('bar', 'otherOrg', 'mo'),
            agentReceivedOk = false;    
            
        T.trapMessage(browserWs, function(mtype, mbody) {
            // When the browser receives acknowledgement, check the command was NOT passed on
            if (mtype===command + 'Sent') {
                assert(!agentReceivedOk, "agent should not receive " + command);
                assert(mbody.rosmachine===targetRosMachineId, command + 'Sent received by browser');
                done();
            }
        });

        T.trapMessage(agentWs3, function(mtype, mbody) {
            // See if the agent receives the command. It shouldn't, in this test
            if (mtype===command) {
                assert(mbody.args==='foo/bar', 'args passed correctly to agent');
                agentReceivedOk = true;
            }
        });

        // Commands from browser to server
        browserWs.on('open', function() {
            T.sendToWebsocket(browserWs, command, {rosmachine: targetRosMachineId, args: 'foo/bar'});
        });                
    }

    // Check that no browser commands sent to non-existent agents.
    // 
    function testCommandSentToNonExistentAgent(done, command) {
        // Create three agents and one browser
        let agentWs2 = T.authenticateAgent('foo', 'myOrg', 'eeny'),
            agentWs3 = T.authenticateAgent('foo', 'myOrg', 'meeny'),
            agentWs4 = T.authenticateAgent('bar', 'otherOrg', 'mo'),
            browserWs = T.authenticateBrowser('myOrg'),
            targetRosMachineId = T.buildFullMachineId('bar', 'doesntExist', 'mo'),
            agentReceivedOk = false;    
            
        T.trapMessage(browserWs, function(mtype, mbody) {
            // When the browser receives acknowledgement, check the command was NOT passed on
            if (mtype===command + 'Sent') {
                assert(!agentReceivedOk, "agent should not receive " + command);
                assert(mbody.rosmachine===targetRosMachineId, command + 'Sent received by browser');
                done();
            }
        });

        T.trapMessage(agentWs3, function(mtype, mbody) {
            // See if the agent receives the command. It shouldn't, in this test
            if (mtype===command) {
                assert(mbody.args==='foo/bar', 'args passed correctly to agent');
                agentReceivedOk = true;
            }
        });

        // Commands from browser to server
        browserWs.on('open', function() {
            T.sendToWebsocket(browserWs, command, {rosmachine: targetRosMachineId, args: 'foo/bar'});
        });        
    }    
            
});
