/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

const EventEmitter = require("events");

/**
 * Extends the built-in EventEmitter to chain one handler after another based
 * on the promise the handler returns. Rejected promises are logged as error but
 * otherwise ignored.
 *
 * @extends external:EventEmitter
 */
class AsyncEventEmitter extends EventEmitter {
    constructor() {
        super();
    }

    emit(eventName, ...args) {
        const p = { promise: Promise.resolve() };
        return super.emit(eventName, p, ...args);
    }

    on(eventName, handler) {
        const wrappedHandler = (p, ...args) => {
            p.promise = p.promise.then(() => handler(...args))
                .catch((e) => console.error("error while handling ", eventName, e));
        };
        super.on(eventName, wrappedHandler);
    }
}

module.exports = AsyncEventEmitter;
