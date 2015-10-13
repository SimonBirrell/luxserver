"use strict";

// (c) 2015 Robot Lux. all Rights Reserved.
// Written by Simon Birrell.

// Send a message to a websocket.
// Currently only sends JSON (but receives BSON etc.) so any compression additions
// willy imply changes here.

const   serverLog = require('./serverLog');

// Send a message to a websocket.
//
//      ws - a connected websocket
//      mtype - command to send
//      mbody - command payload
//
module.exports = function(ws, mtype, mbody) {
    let message = typeof mbody !== 'undefined' ? {mtype: mtype, mbody: mbody} : {mtype: mtype}
    if (mtype!=="rosInstanceGraphUpd") {
        console.log("-> " + " " + JSON.stringify(message));
    }
    ws.send(JSON.stringify(message), function ack(error) {
    	if (error) {
    		serverLog("ws.send failed while writing");
    		serverLog(mtype);
    		serverLog(mbody);
    		serverLog(error);
            console.trace("exiting...")
            process.exit(1);
    	}
    });
}    

