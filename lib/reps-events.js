/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/**
 * @module reps-events
 * @license MPL-2.0
 */
"use strict";

const DataStoreHolder = require("./data-store-holder");
const UpdateManager = require("./update-manager");
const ical = require("ical");
const util = require("util");

const promisedIcal = util.promisify(ical.fromURL.bind(ical));

/**
 * @param {Array.<object>} [events=[]] - Already stored events.
 * @returns {Array.<object>} Updated events.
 * @this module:reps-events.RepsEvents
 */
async function getEvents(events = []) {
    const cal = await promisedIcal(this.url);
    if(cal) {
        for(const e in cal) {
            if(!events.some((ev) => ev.url === e.url)) {
                this.emit('created', e);
            }
        }
        return cal;
    }
    return [];
}

class RepsEvents extends DataStoreHolder {
    constructor(query) {
        super({
            events: getEvents
        });

        this.query = query;

        UpdateManager.register(this);
    }

    get url() {
        return `https://reps.mozilla.org/events/period/future/search/${this.query}/ical/`;
    }
}
module.exports = RepsEvents;
