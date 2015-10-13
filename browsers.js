"use strict";

// (c) 2015 Robot Lux. all Rights Reserved.
// Written by Simon Birrell.

// This object represents the global list of connected Browsers, It's a class method if you like.

const   serverLog = require('./serverLog');

module.exports = {
    BrowserLookup: [],

    // Clear list of browsers.
    //
    reset: function() {
        this.BrowserLookup = [];
    },

    // Add a Browser to the global list.
    //
    //      brwoser - a Browser object
    //
    addBrowser: function(browser) {
        this.BrowserLookup.push(browser);
    },

    // Remove a browser from the global list.
    //
    //      brwoser - a Browser object
    //    
    removeBrowser: function(browser) {
        serverLog("Removing browser " + browser);
        let index = this.BrowserLookup.indexOf(browser);
        if (index > -1) {
            this.BrowserLookup.splice(index, 1);
            serverLog("removed");
        }
    },

    // Send command to all connected browsers.
    // Currently unused, could be used for general warnings, e.g. "System going down".
    //      
    //      mtype - string that defines command
    //      mbody - command payload
    //
    sendToAllBrowsers: function(mtype, mbody) {
        //console.log("= Send to all browsers:" + mtype + " " + JSON.stringify(mbody));
        serverLog("= " + this.BrowserLookup.length + " browsers");
        for (let i=0; i < this.BrowserLookup.length; i++) {
            let browser = this.BrowserLookup[i];
            browser.sendMessage(mtype, mbody);
        }
    },

    // Convenience version of sendToAllBrowsers
    //
    sendToAllBrowsersComplete: function(message) {
        this.sendToAllBrowsers(message.mtype, message.mbody);
    },
    
    // Send command to all connected browsers in given Origanization
    // Used to send updates to multiple connected browsers.
    //      
    //      orgId - fully qualified definition of the organization
    //      mtype - string that defines command
    //      mbody - command payload
    //
    sendToAllBrowsersInOrg: function(mtype, mbody, orgId) {
        //console.log("= Send to all browsers:" + mtype + " " + JSON.stringify(mbody));
        serverLog("= " + this.BrowserLookup.length + " browsers");
        for (let i=0; i < this.BrowserLookup.length; i++) {
            let browser = this.BrowserLookup[i];
            if (browser.orgId === orgId) {
                browser.sendMessage(mtype, mbody);
            }
        }
    },

};
