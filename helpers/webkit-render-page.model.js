var system = require('system');
var args = system.args;
var host = args[1];
var cookie = args[2];

try {
    var currentCookie = JSON.parse(cookie);
    if (objectSize(currentCookie)) {
        phantom.addCookie(currentCookie);
    }
} catch (e) {
    console.error(e);
}

if (!Date.prototype.toISOString) {
    Date.prototype.toISOString = function () {
        function pad(n) {
            return n < 10 ? '0' + n : n;
        }

        function ms(n) {
            return n < 10 ? '00' + n : n < 100 ? '0' + n : n
        }

        return this.getFullYear() + '-' +
            pad(this.getMonth() + 1) + '-' +
            pad(this.getDate()) + 'T' +
            pad(this.getHours()) + ':' +
            pad(this.getMinutes()) + ':' +
            pad(this.getSeconds()) + '.' +
            ms(this.getMilliseconds()) + 'Z';
    }
}

function createHAR(address, title, startTime, resources, page) {
    var entries = [];

    resources.forEach(function (resource) {
        var request = resource.request,
            startReply = resource.startReply,
            endReply = resource.endReply;

        if (!request || !startReply || !endReply) {
            return;
        }

        if (request.url.match(/(^data:image\/.*)/i)) {
            return;
        }

        entries.push({
            startedDateTime: request.time.toISOString(),
            time: endReply.time - request.time,
            request: {
                method: request.method,
                url: request.url,
                httpVersion: "HTTP/1.1",
                cookies: [],
                headers: request.headers,
                queryString: [],
                headersSize: -1,
                bodySize: -1
            },
            response: {
                status: endReply.status,
                statusText: endReply.statusText,
                httpVersion: "HTTP/1.1",
                cookies: [],
                headers: endReply.headers,
                redirectURL: "",
                headersSize: -1,
                bodySize: startReply.bodySize,
                content: {
                    size: startReply.bodySize,
                    mimeType: endReply.contentType
                }
            },
            cache: {},
            timings: {
                blocked: 0,
                dns: -1,
                connect: -1,
                send: 0,
                wait: startReply.time - request.time,
                receive: endReply.time - startReply.time,
                ssl: -1
            },
            pageref: address
        });
    });

    return {
        log: {
            version: '1.2',
            creator: {
                name: "PhantomJS",
                version: phantom.version.major + '.' + phantom.version.minor +
                '.' + phantom.version.patch
            },
            pages: [{
                startedDateTime: startTime.toISOString(),
                id: address,
                title: title,
                pageTimings: {
                    onLoad: page.endTime - page.startTime
                }
            }],
            entries: entries
        }
    };
}


function networkStats(entries) {
    var logs = [];
    for (var i = 0; i < entries.length; i++) {
        logs.push(
            "[TIME]\t" + entries[i].time + "ms\t" + "[" + entries[i].request.method + "]" + entries[i].request.url
        );
    }

    return logs;
}

function makePage(address) {

    var WP = require('webpage');
    var instance = WP.create();

    return function () {

        instance.resources = [];

        instance.onLoadStarted = function () {
            instance.startTime = new Date();
            startTime = Date.now();
        };

        instance.onResourceRequested = function (req) {
            instance.resources[req.id] = {
                request: req,
                startReply: null,
                endReply: null
            };
        };

        instance.onResourceReceived = function (res) {
            if (res.stage === 'start') {
                instance.resources[res.id].startReply = res;
            }
            if (res.stage === 'end') {
                instance.resources[res.id].endReply = res;
            }
        };

        instance.open(address, function (status) {

            if (status !== 'success') {
                console.log('FAIL to load the address');
                phantom.exit(1);
            } else {

                this.endTime = new Date();
                this.title = this.evaluate(function () {
                    return document.title;
                });

                try {
                    var har = createHAR(address, instance.title, instance.startTime, instance.resources, instance);
                    var logs = networkStats(har.log.entries);

                    logs.unshift("================================================================================================");
                    logs.push("================================================================================================");
                    logs.push("Finished: " + ((Date.now() - startTime) / 1000).toFixed(2) + "s");

                    var write = {
                        cookie: phantom.cookies || [],
                        logs: logs
                    };

                    console.log(JSON.stringify(write));

                } catch (e) {
                    console.log(e);
                }


                phantom.exit();


            }

        });
    };
}

makePage(host)();

function objectSize(object) {
    var count = 0;
    var i;

    for (i in object) {
        if (object.hasOwnProperty(i)) {
            count++;
        }
    }

    return count;
}