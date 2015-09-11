"use strict";

var assert = require('assert');

describe('Browser Commands', function() {
    const   server = require('../server.js'),
            T = require('./test-helpers');        

    beforeEach(function() {
        global.Agents.reset();
        global.Browsers.reset();      
        server.launch();
    });
    
    afterEach(function() {
        server.shutdown(); 
        T.teardown(); 
        console.log("");
    });
    
    it('allows a browser to connect', function(done) {
        let ws = T.authenticateBrowser();

        T.trapMessage(ws, function(mtype, mbody) {
            assert((mtype==='browserConnected'), 'Correct mtype');
            done();
         });
    });
    
    it("should close connection if browser sends any other command without being properly connected", function(done) {
        
        let ws = T.openBrowserSocketAndSend({
            mtype:'ping',
            mbody: {}
        });

        ws.on('close', function close() {
            done();
        });        
    });
    
    it("should accept a command if authenticated", function(done) {
        let ws = T.authenticateBrowser();

        T.trapMessage(ws, function(mtype, mbody) {
            if (mtype==='pong') {
                done();
            }
        });
        
        ws.on('open', function() {
            T.sendToWebsocket(ws, 'ping');
        });
                             
    });
    
    it('should receive a subscribeRosInstances command and send an empty update. Subsequent agent connections will send out updates.', function(done) {
        let ws = T.authenticateBrowser(),
            count = 0;

        T.trapMessage(ws, function(mtype, mbody) {
            console.log("T received " + mtype + " " + mbody);
            if (mtype==='rosInstancesUpdate') {
                if (count===0) {
                    console.log("1st update mbody: " + JSON.stringify(mbody));                  
                    assert((mbody.length===0), '** No rosintances yet');
                } else if (count===1) {
                    console.log("2nd update mbody: " + JSON.stringify(mbody));                  
                    assert(mbody.length===1, 'Should return one rosInstance');                    
                    assert((mbody[0]['add'] === T.buildFullRosInstanceId('eeny', 'theOrg','0') ), 'with proper rosInstanceId');
                } else if (count===2) {
                    console.log("3rd update mbody: " + JSON.stringify(mbody));                  
                    assert(mbody.length===1, 'Should return another new rosInstance');
                    assert(mbody[0]['add']  === T.buildFullRosInstanceId('meeny', 'theOrg','0'), 'Should return another new rosInstance');
                } else if (count===3) {
                    console.log("4th update mbody: " + JSON.stringify(mbody));                  
                    assert(mbody.length===1, 'Should return a deleted rosInstance');
                    assert(mbody[0]['del']  === T.buildFullRosInstanceId('eeny', 'theOrg','0'), 'Should return another new rosInstance');
                    done();
                }
                count ++;
            }
        });
        
        ws.on('open', function() {
            T.sendToWebsocket(ws, 'subscribeRosInstances');
            let ws2 = T.authenticateAgent('eeny'),
                ws3 = T.authenticateAgent('meeny');
            
            ws3.on('open', function() {
                setTimeout(function() {
                   ws2.close();
                }, 50);
            });    
        });        
    });
    
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
                    assert((JSON.stringify(mbody[0])===JSON.stringify({'add':'myOrg 0 foo'})), "stringy");
                    ws3.close();
                } else if (count===1) {
                    console.log("2nd update mbody: " + mbody.length + " " + JSON.stringify(mbody));                    
                    assert(((mbody.length===1) && (mbody[0]==={add:'myOrg 0 foo'})), 'Should return one rosInstance');                    
                }
                count ++;
            }
        });            

        ws.on('open', function() {
            T.sendToWebsocket(ws, 'subscribeRosInstances');
        });        
                
    });

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
    

        ws.on('open', function() {
            T.sendToWebsocket( ws, 'message', topicMessage);
        });        
    });
    
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
    

        ws.on('open', function() {
            T.sendToWebsocket( ws, 'message', topicMessage);
        });        
    });
    
    it("should accept a legitimate subscription to a RosInstance", function(done) {
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
                assert(mtype==='rosInstanceGraph', 'received full graph');
                let updatedRosInstance = mbody.rosInstance;
                assert(updatedRosInstance === targetRosInstance, 'Correct rosInstance');
                assert.deepEqual(mbody.graph, {}, "Should have empty set");
                rosInstance = global.RosInstances.find(targetRosInstance);
                T.sendToWebsocket(ws2, 'graphAdd', [['xxx','xxx-content'], ['yyy','yyy-content']]);                
            } else if (count===2) {
                assert(mtype==='rosInstanceGraphAdd', 'received add command');
                assert(mbody.graph['xxx']==='xxx-content', "1st Addition key correct");
                assert(mbody.graph['yyy']==='yyy-content', "2nd Addition key correct");

                T.sendToWebsocket(ws3, 'graphDel', [['xxx',{}]]);
            } else if (count===3) {
                assert(mtype==='rosInstanceGraphDel', 'received a delete command');
                assert(mbody.graph.length===1, "Should have one deletion");
                assert(mbody.graph[0]==='xxx', "1st deletion key correct");
                T.sendToWebsocket(ws2, 'graphUpd', [['yyy','zzz-content']]);
                
            } else if (count===4) {
                assert(mtype==='rosInstanceGraphUpd', 'received an update command');
                assert(mbody.graph.length===1, "Should have one update");
                assert(mbody.graph[0][0]==='yyy', "1st Update key correct");
                assert(mbody.graph[0][1]==='zzz-content', "1st Update value correct");
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
    
        ws.on('open', function() {
            T.sendToWebsocket(ws, 'subscribeRosInstance', {rosInstance: targetRosInstance});
        });        
        
    });

    it("should not accept an illegitimate subscription to a RosInstance", function(done) {
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
    
        ws.on('open', function() {
            T.sendToWebsocket(ws, 'subscribeRosInstance', {rosInstance: targetRosInstance});
        });        
        
    });
            
    it("should accept a graph unsubscription", function(done) {
        let ws2 = T.authenticateAgent('foo', 'myOrg', 'eeny'),
            ws3 = T.authenticateAgent('foo', 'myOrg', 'meeny'),
            ws4 = T.authenticateAgent('bar', 'otherOrg', 'mo'),
            ws = T.authenticateBrowser('myOrg'),
            count = 0,
            targetRosInstance = T.buildFullRosInstanceId('foo', 'myOrg', 'eeny'),
            rosInstance = null;    
            
        T.trapMessage(ws, function(mtype, mbody) {
            if ((mtype==='rosInstanceUpdate') || (mtype==='rosInstanceGraph') || (mtype==='rosInstanceGraphAdd')) {
                if (count===0) {
                    let updatedRosInstance = mbody.rosInstance;
                    assert(updatedRosInstance === targetRosInstance, 'Correct rosInstance');
                    rosInstance = global.RosInstances.find(targetRosInstance);
                    T.sendToWebsocket(ws2, 'graphAdd', [['xxx','xxx-content'], ['yyy','yyy-content']]);                
                    
                } else if (count===1) {
                    assert(mtype==='rosInstanceGraphAdd', "Should have addition");
                    T.sendToWebsocket(ws, 'unsubscribeRosInstance', {rosInstance: targetRosInstance});
                } else if (count===2) {
                    throw("shouldn't receive update after unsubscription");
                }
                count++;
            } else if (mtype==='unsubscribedRosInstance') {
                assert(mbody.rosInstance === targetRosInstance);
                T.sendToWebsocket(ws2, 'graphAdd', [['ppp','xxx-content'], ['qqq','yyy-content']]);                
                T.sendToWebsocket(ws, 'ping');
            } else if (mtype==='pong') {
                done();
            }
        });            
    
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

    function testCommandSentToAgent(done, command) {
        let agentWs2 = T.authenticateAgent('foo', 'myOrg', 'eeny'),
            agentWs3 = T.authenticateAgent('foo', 'myOrg', 'meeny'),
            agentWs4 = T.authenticateAgent('bar', 'otherOrg', 'mo'),
            browserWs = T.authenticateBrowser('myOrg'),
            targetRosMachineId = T.buildFullMachineId('foo', 'myOrg', 'meeny'),
            agentReceivedOk = false;    
            
        T.trapMessage(browserWs, function(mtype, mbody) {
            if (mtype===command + 'Sent') {
                assert(agentReceivedOk, "agent receives " + command + " first");
                assert(mbody.rosmachine===targetRosMachineId, command + 'Sent received by browser');
                done();
            }
        });

        T.trapMessage(agentWs3, function(mtype, mbody) {
            if (mtype===command) {
                assert(mbody.args==='foo/bar', 'args passed correctly to agent');
                agentReceivedOk = true;
            }
        });

        browserWs.on('open', function() {
            T.sendToWebsocket(browserWs, command, {rosmachine: targetRosMachineId, args: 'foo/bar'});
        });                
    }

    function testCommandRejectedForDifferentOrg(done, command) {
        let agentWs2 = T.authenticateAgent('foo', 'myOrg', 'eeny'),
            agentWs3 = T.authenticateAgent('foo', 'myOrg', 'meeny'),
            agentWs4 = T.authenticateAgent('bar', 'otherOrg', 'mo'),
            browserWs = T.authenticateBrowser('myOrg'),
            targetRosMachineId = T.buildFullMachineId('bar', 'otherOrg', 'mo'),
            agentReceivedOk = false;    
            
        T.trapMessage(browserWs, function(mtype, mbody) {
            if (mtype===command + 'Sent') {
                assert(!agentReceivedOk, "agent should not receive " + command);
                assert(mbody.rosmachine===targetRosMachineId, command + 'Sent received by browser');
                done();
            }
        });

        T.trapMessage(agentWs3, function(mtype, mbody) {
            if (mtype===command) {
                assert(mbody.args==='foo/bar', 'args passed correctly to agent');
                agentReceivedOk = true;
            }
        });

        browserWs.on('open', function() {
            T.sendToWebsocket(browserWs, command, {rosmachine: targetRosMachineId, args: 'foo/bar'});
        });                
    }

    function testCommandSentToNonExistentAgent(done, command) {
        let agentWs2 = T.authenticateAgent('foo', 'myOrg', 'eeny'),
            agentWs3 = T.authenticateAgent('foo', 'myOrg', 'meeny'),
            agentWs4 = T.authenticateAgent('bar', 'otherOrg', 'mo'),
            browserWs = T.authenticateBrowser('myOrg'),
            targetRosMachineId = T.buildFullMachineId('bar', 'doesntExist', 'mo'),
            agentReceivedOk = false;    
            
        T.trapMessage(browserWs, function(mtype, mbody) {
            if (mtype===command + 'Sent') {
                assert(!agentReceivedOk, "agent should not receive " + command);
                assert(mbody.rosmachine===targetRosMachineId, command + 'Sent received by browser');
                done();
            }
        });

        T.trapMessage(agentWs3, function(mtype, mbody) {
            if (mtype===command) {
                assert(mbody.args==='foo/bar', 'args passed correctly to agent');
                agentReceivedOk = true;
            }
        });

        browserWs.on('open', function() {
            T.sendToWebsocket(browserWs, command, {rosmachine: targetRosMachineId, args: 'foo/bar'});
        });        
    }    
            
});
