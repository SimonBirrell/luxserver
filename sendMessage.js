"use strict";

const   serverLog = require('./serverLog');

module.exports = function(ws, messageType, messageBody) {
    let message = typeof messageBody !== 'undefined' ? {mtype:messageType, mbody:messageBody} : {mtype:messageType}
    if (messageType!=="rosInstanceGraphUpd") {
        console.log("-> " + " " + JSON.stringify(message));
    }
    ws.send(JSON.stringify(message), function ack(error) {
    	if (error) {
    		serverLog("ws.send failed while writing");
    		serverLog(messageType);
    		serverLog(messageBody);
    		serverLog(error);
            console.trace("exiting...")
            process.exit(1);
    	}
    });
}    

