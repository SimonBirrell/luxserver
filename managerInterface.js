"use strict";

// (c) 2015 Robot Lux. all Rights Reserved.
// Written by Simon Birrell.

// Communication with REDIS that stores authentication details

const   serverLog = require('./serverLog');

var 	redisClient = null;

exports.connect = function() {
	serverLog("");
	serverLog("Connecting to REDIS...");
	serverLog("");
	redisClient = require('redis').createClient(process.env.REDIS_URL);
}

exports.authenticateAgent = function(mbody, callback) {
	if (!redisClient) {
		throw "REDIS not connected.";
	}

	// Check we have credentials
	var username = mbody['user'],
		secret = mbody['secret'];
	if ((!username)||(!secret)) {
		serverLog("Username and/or secret missing.");
		serverLog(mbody);
		var invalidInfo = {error: "Missing user or secret"};
		return invalidInfo; 
	}

	// Interrogate REDIS for key
	var key = "robotlux:agent:" + secret;

	redisClient.get(key, function(err, reply) {
		if (reply) {
			serverLog("REDIS reply ok");
			var agentInfo = JSON.parse(reply);
			serverLog(agentInfo);
			if (agentInfo['username']===username) {
				callback(agentInfo);
			} else {
				serverLog("username didn't match");
				serverLog("agent sent username:");
				serverLog(username);				
				serverLog("agentInfo username:");
				serverLog(agentInfo['username']);
				callback(false);
			}
		} else {
			serverLog("REDIS replied NULL");
			callback(false);
		}
	});
	
	return;
}

