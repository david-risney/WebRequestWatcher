var id = {
    onBeforeRequest: "onBeforeRequest",
    onBeforeSendHeaders: "onBeforeSendHeaders",
    onSendHeaders: "onSendHeaders",
    onHeadersReceived: "onHeadersReceived",
    onAuthRequired: "onAuthRequired",
    onBeforeRedirect: "onBeforeRedirect",
    onResponseStarted: "onResponseStarted",
    onCompleted: "onCompleted",
    onErrorOccurred: "onErrorOccurred",
};

var settings = {
    ".*": {
        onBeforeRequest: {
            log: true,
            cancel: false,
            redirect: false // false for nothing, string of URL to redirect to, or 2 to add the requestId to the query
        },
        onBeforeSendHeaders: {
            log: true,
            cancel: false,
            addRequestHeaders: false // Emptry array for nothing, array with headers to add, or 2 for adding requestId header
        },
        onSendHeaders: {
            log: true,
        },
        onHeadersReceived: {
            log: true,
            cancel: false,
            redirect: false,
            addResponseHeaders: false
        },
        onAuthRequired: {
            log: true,
            creds: false // false for no creds or { username: username, password: password} for providing username and password.
        },
        onBeforeRedirect: {
            log: true
        },
        onResponseStarted: {
            log: true
        },
        onCompleted: {
            log: true
        },
        onErrorOccurred: {
            log: true
        }
    }
};

function makeReturnObj(info, eventId) {
    var result = {},
        log = false,
        redirect = false,
        redirects = [],
        cancel = false,
        addRequestHeaders = [],
        addResponseHeaders = [],
        creds = false;

    Object.keys(settings).filter(function (key) {
        return (new RegExp(key)).test(info.url);
    }).map(function (key) {
        return settings[key][eventId];
    }).filter(function (entry) {
        return entry;
    }).forEach(function (entry) {
        if (entry.log) {
            log = true;
        }
        if (entry.cancel) {
            cancel = true;
        }
        if (entry.redirect) {
            redirects.push(entry.redirect);
            redirect = entry.redirect;
        }
        if (entry.addRequestHeaders) {
            addRequestHeaders = entry.addRequestHeaders;
        }
        if (entry.addResponseHeaders) {
            addResponseHeaders = entry.addResponseHeaders;
        }
        if (entry.creds) {
            creds = entry.creds;
        }
    });

    if (log) {
        console.log(eventId, info);
    }

    if (redirect && (eventId === id.onBeforeRequest || eventId === id.onHeadersReceived)) {
        if (redirect === 2) {
            var url = new URL(info.url);
            var split = url.search.split("&");
            if (split.map(function (entry) { return entry.split("=")[0]; }).indexOf("requestId") === -1) {
                url.search = split.concat(["requestId=" + info.requestId]).join("&");
                result.redirectUrl = url.toString();
            }
        } else if (redirect) {
            result.redirectUrl = redirect;
        }

        if (redirects.indexOf(result.redirectUrl) !== -1) {
            delete result.redirectUrl;
        }
    }

    if (addRequestHeaders && eventId === id.onBeforeSendHeaders) {
        var headers = info.requestHeaders;

        if (addRequestHeaders === 2) {
            if (headers.map(function (entry) { return entry.name; }).indexOf("requestId") === -1) {
                headers.push({name: "requestId", value: info.requestId});
                result.requestHeaders = headers;
            }
        } else if (addRequestHeaders.length > 0) {
            result.requestHeaders = headers.concat(addRequestHeaders);
        }
    }

    if (addResponseHeaders && eventId === id.onHeadersReceived) {
        var headers = info.responseHeaders;

        if (addResponseHeaders === 2) {
            if (headers.map(function (entry) { return entry.name; }).indexOf("requestId") === -1) {
                headers.push({name: "requestId", value: info.requestId});
                result.responseHeaders = headers;
            }
        } else if (addResponseHeaders.length > 0) {
            result.responseHeaders = headers.concat(addResponseHeaders);
        }
    }

    if (cancel && (eventId === id.onBeforeRequest || eventId === id.onBeforeSendHeaders || eventId === id.onHeadersReceived )) {
        result.cancel = true;
    }

    if (creds && eventId === id.onAuthRequired) {
        result.authCredentials = creds;
    }

    return result;
}

function subscribe(eventId, additional) {
    if (additional) {
        chrome.webRequest[eventId].addListener(function(info) { 
            return makeReturnObj(info, eventId);
        }, {urls: ["<all_urls>"]}, additional);
    } else {
        chrome.webRequest[eventId].addListener(function(info) { 
            return makeReturnObj(info, eventId);
        }, {urls: ["<all_urls>"]});
    }
}

function get(url) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.send();
}

subscribe(id.onBeforeRequest, ["blocking"]);
subscribe(id.onBeforeSendHeaders, ["requestHeaders", "blocking"]);
subscribe(id.onSendHeaders, ["requestHeaders"]);
subscribe(id.onHeadersReceived, ["responseHeaders", "blocking"]);
subscribe(id.onAuthRequired, ["blocking"]);
subscribe(id.onBeforeRedirect, []);
subscribe(id.onResponseStarted, ["responseHeaders"]);
subscribe(id.onCompleted, []);
subscribe(id.onErrorOccurred);

console.log("");
console.log("Obtain a resource with get(url)");
console.log("Mess with settings via the settings object: ");
console.log(settings);
console.log("");
