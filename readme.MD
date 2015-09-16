LuxServer
=========

Tests
-----
    mocha --harmony -w
    mocha --harmony -w -g 'string for matching test names'

Protocol
--------

Error condition signaled by mbody containing error key:
{...., error: 'message', ...}

General
=======
A full RosInstanceId looks like this:
"<org_id> <network_id> <base_ros_instance_id>"

A full machineId looks like this:
"<org_id> <network_id> <base_ros_instance_id> <machine_id>"

Graph Structure transmitted from agent looks like this:


Browser -> Server
=================

browserConnenct
---------------
mtype: browserConnect
mbody: {rosinstance: rosInstanceBase, org: orgId, user: userName, secret: secret}

Reply:

mtype: browserConnected
mbody: instanceN

subscribeRosInstances
---------------------
mtype: subscribeRosInstances

Reply:

mtype: rosInstancesUpdate
mbody: [{add: fullRosInstanceId1}, {add: fullRosInstanceId2}... {add: fullRosInstanceIdN}]

and as changes occur:

mtype: rosInstancesUpdate
mbody: [{add: fullRosInstanceId1}, {del: fullRosInstanceId2}... {add: fullRosInstanceIdN}]

subscribeRosInstance
--------------------
mtype: subscribeRosInstance
mbody: rosInstance: fullRosInstanceId

Reply:

mtype: rosInstanceGraph
mbody: {rosInstance: fullRosInstanceId, graph: graph}

unsubscribeRosInstance
----------------------
mtype: unsubscribeRosInstance
mbody: {rosInstance: fullRosInstanceId}

Reply:

mtype: unsubscribedRosInstance
mbody: {rosInstance: fullRosInstanceId}

rosrun
------
mtype: rosrun
mbody: {rosmachine: fullMachineId, args: args}

Reply:

mtype: rosrunSent
mbody: {rosmachine: fullMachineId, args: args}

roslaunch
---------
Performs a 'roslaunch' command on a machine in the ROS instance.
mtype: roslaunch
mbody: {rosmachine: fullMachineId, args: args}

Reply:

mtype: roslaunchSent
mbody: {rosmachine: fullMachineId, args: args}

kill
----
Kills a process on one of the hosts in the ROS instance.
mtype: kill
mbody: {rosmachine: fullMachineId, args: args}

Reply:

mtype: kill
mbody: {rosmachine: fullMachineId, args: args}

TODO: Incorporate PID identifier.

message
-------
Sends message to a ROS topic, as if it had been published by a regular ROS node.
mtype: message
mbody: {rosInstance: rosInstanceId, topic: topicName, message: <JSON message>}

Server -> Browser
=================

rosInstanceGraphAdd
-------------------
mtype: rosInstanceGraphAdd
mbody: {rosInstance: rosInstanceId, graph: hash}

rosInstanceGraphDel
-------------------
mtype: rosInstanceGraphAdd
mbody: {rosInstance: rosInstanceId, graph: ['key1', 'key2'...]}


Agent -> Server
===============

agentConnect
------------
mtype: agentConnect
mbody: {rosinstance: rosInstanceBase, org: orgId, user: userName, secret: secret}

Reply:

mtype: agentConnected
mbody: instanceN

graphAdd
--------
mtype: graphAdd 
mbody: [[key1, value1], [key2, value2], ... [keyN, valueN]]

graphUpd
--------
mtype: graphUpd
mbody: [[key1, value1], [key2, value2], ... [keyN, valueN]]

graphDel
--------
mtype: graphDel
mbody: [key1, key2, ... keyN] ??? Is it that or [[key, value], [key, value] ...]


MAYBE ****************

rosrunResult
------------
mtype: rosrunResult
mbody: ?

END NEW *****************

Server -> Agent
===============

subscribeGraph
--------------
mtype: subscribeGraph

rosrun
------
mtype: rosrun
mbody: {args: args}

roslaunch
---------
mtype: roslaunch
mbody: {args: args}

kill
----
mtype: kill
mbody: {args: args}

message
-------
Publish a ROS message to a topic.
mtype: message
mbody: {topic: topicName, message: {...JSON encoded version of ROS message..}}

if an error then will get:

mtype: messageStatus
error: 






