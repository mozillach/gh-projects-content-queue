/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/**
 * @module events
 * @license MPL-2.0
 */
"use strict";

const DataStoreHolder = require("./data-store-holder");
const ical = require("ical");
const util = require("util");

const promisedIcal = util.promisify(ical.fromURL);

/**
 * @param {[object]} [events=[]] - Already stored events.
 * @returns {[object]} Updated events.
 * @this module:events.Events
 */
async function getEvents(events = []) {
    const cal = await promisedIcal(this.url, {});
    if(cal) {
        const newEvents = [];
        for(const e in cal) {
            const event = cal[e];
            if(!events.some((ev) => ev.url === event.url)) {
                this.emit('created', event);
            }
            newEvents.push(event);
        }
        return newEvents;
    }
    return [];
}
getEvents.emitsEvents = true;

class Events extends DataStoreHolder {
    constructor(url) {
        super({
            events: getEvents
        });

        this.url = url;
    }
}
module.exports = Events;
