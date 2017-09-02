/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/**
 * @module async-event-emitter
 * @license MPL-2.0
 */
"use strict";

const EventEmitter = require("events");

/**
 * @callback asyncListener
 * @async
 * @param {?} args - Arguments.
 * @returns {undefined} When the next handler should be called.
 * @throws {Error} When something went wrong while handling. Does not abort the
 *                 chain but logs the error.
 */

/**
 * Extends the built-in EventEmitter to chain one handler after another based
 * on the promise the handler returns. Rejected promises are logged as error but
 * otherwise ignored. It only currently supports this for the on/addListener
 * methods. once and the prepending methods for adding listeners will not be
 * chained.
 *
 * @extends external:EventEmitter
 * @alias module:async-event-emitter.AsyncEventEmitter
 */
class AsyncEventEmitter extends EventEmitter {
    constructor() {
        super();
    }

    /**
     * Emit a new event to the async listeners.
     *
     * @param {string} eventName - Name of the event to fire.
     * @param {?} args - Arguments to pass along with the event.
     * @fires eventName
     * @returns {undefined}
     */
    emit(eventName, ...args) {
        const p = { promise: Promise.resolve() };
        return super.emit(eventName, p, ...args);
    }

    /**
     * Add a new async listener.
     *
     * @param {string} eventName - Event to listen for.
     * @param {module:async-event-emitter~asyncListener} handler - Async event handler.
     * @returns {undefined}
     */
    on(eventName, handler) {
        const wrappedHandler = (p, ...args) => {
            p.promise = p.promise.then(() => handler(...args))
                .catch((e) => console.error("error while handling ", eventName, e));
        };
        super.on(eventName, wrappedHandler);
    }
}

module.exports = AsyncEventEmitter;
