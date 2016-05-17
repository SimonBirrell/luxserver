"use strict";

// (c) 2015 Robot Lux. all Rights Reserved.
// Written by Simon Birrell.

// Communication with REDIS that stores authentication details

var redisClient = null;

exports.connect = function() {
	redisClient = require('redis').createClient(process.env.REDIS_URL);
}

exports.authenticateAgent = function(mbody) {
	var invalidInfo = {
		valid: false,
		error: "No error defined"
	};

	// Check we have credentials
	var user = mbody['user'],
		secret = mbody['secret'];
	if ((!user)||(!secret)) {
		invalidInfo['error'] = "Missing user or secret";
		return invalidInfo; 
	}

	// Interrogate REDIS for key
	var key = "robotlux:agent:" + secret;

	redisClient.get(key, function(err, reply) {
		console.log(reply);
		if (reply) {

		} else {

		}
	});

	var agentInfo = {
		valid: true
	}

	console.log("********* Authenticating agent **************");

	return agentInfo;
}

