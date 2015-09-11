"use strict";

const   serverLog = require('./serverLog');

module.exports = {
    BrowserLookup: [],
    reset: function() {
        this.BrowserLookup = [];
    },
    addBrowser: function(browser) {
        this.BrowserLookup.push(browser);
    },
    removeBrowser: function(browser) {
        serverLog("Removing browser " + browser);
        let index = this.BrowserLookup.indexOf(browser);
        if (index > -1) {
            this.BrowserLookup.splice(index, 1);
            serverLog("removed");
        }
    },
    sendToAllBrowsers: function(mtype, mbody) {
        //console.log("= Send to all browsers:" + mtype + " " + JSON.stringify(mbody));
        serverLog("= " + this.BrowserLookup.length + " browsers");
        for (let i=0; i < this.BrowserLookup.length; i++) {
            let browser = this.BrowserLookup[i];
            browser.sendMessage(mtype, mbody);
        }
    },

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

    sendToAllBrowsersComplete: function(message) {
        this.sendToAllBrowsers(message.mtype, message.mbody);
    },
    
};
