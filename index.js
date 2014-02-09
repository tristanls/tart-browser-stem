/*

index.js - "tart-browser-stem": Tart browser bootstrapping stem

The MIT License (MIT)

Copyright (c) 2014 Tristan Slominski

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

*/
"use strict";

// setImmediate browser shim
require('setimmediate');

var crypto = require('crypto');
var https = require('https');
var marshal = require('tart-marshal');
var tart = require('tart');
var transport = require('tart-transport-httpc');
var url = require('url');

var Stem = module.exports = function Stem(window) {
    var self = this;

    self.sponsor = tart.minimal();

    var parsedUrl = url.parse(window.location);
    self.hostname = parsedUrl.hostname;
    self.port = parsedUrl.port;

    self.transport = self.sponsor(transport({
        hostname: self.hostname,
        port: self.port
    }));

    self.domainName = crypto.randomBytes(42).toString('base64');
    self.domain = marshal.domain(
        'ansible://' + self.domainName + '/', self.sponsor, self.transport);
    self.receptionist = self.domain.receptionist;

    self.window = window;
};

Stem.prototype.bootstrap = function bootstrap() {
    var self = this;

    self.subscribeToEvents();

    // invoke the capability we wanted in the first place
    var parsedUrl = url.parse(self.window.location);
    console.dir(parsedUrl);

    // pathname has leading '/' and trailing '/'
    // hash starts with '#'
    var address = 'ansible:/' + parsedUrl.pathname + parsedUrl.hash;
    var content = self.domain.encode({
        request: parsedUrl.search,
        ok: self.receptionist
    });

    self.transport({
        address: address,
        content: content
    });
};

Stem.prototype.subscribeToEvents = function subscribeToEvents() {
    var self = this;

    var eventSource = new EventSource("http://localhost:8080/events/" + self.domainName);
    eventSource.onmessage = function (event) {
        // event.data:
        // <address>\n
        // <contents>\n\n
        var message = event.data.split('\n');
        if (message.length != 2) {
            console.error("Invalid message format", event.data);
            return;
        }

        console.log(message[0], message[1]);
    }
};