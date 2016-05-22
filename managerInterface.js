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
	authenticateUniversal(mbody, callback, "agent");
};

exports.authenticateBrowser = function(mbody, callback) {
	authenticateUniversal(mbody, callback, "browser");
};

function authenticateUniversal(mbody, callback, clientType) {
	if (!redisClient) {
		throw "REDIS not connected.";
	}

	// Check we have credentials
	var username = mbody['username'],
		secret = mbody['secret'];
	if ((!username)||(!secret)) {
		serverLog("Username and/or secret missing.");
		serverLog(mbody);
		var invalidInfo = {error: "Missing user or secret"};
		return invalidInfo; 
	}

	// Interrogate REDIS for key
	var key = "robotlux:" + clientType + ":" + secret;

	redisClient.get(key, function(err, reply) {
		if (reply) {
			serverLog("REDIS reply ok");
			var info = JSON.parse(reply);
			serverLog(info);
			if (info['username']===username) {
				serverLog(clientType + " sent username:");
				serverLog(username);				
				callback(info);
			} else {
				serverLog("username didn't match");
				serverLog("Derived username");
				serverLog(usernameFromUser);
				serverLog("info username:");
				serverLog(info['username']);
				callback(false);
			}
		} else {
			serverLog("REDIS replied NULL");
			callback(false);
		}
	});
	
	return;
}



