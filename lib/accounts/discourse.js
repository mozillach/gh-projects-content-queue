/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/**
 * @module discourse-threads
 * @license MPL-2.0
 */
"use strict";

const DataStoreHolder = require("../data-store-holder");
const Discourse = require("discourse-sdk");
const util = require("util");

/**
 * @typedef {object} DiscourseTopic
 * @property {string} slug
 * @property {string} title
 * @property {string} created_at
 * @property {boolean} pinned
 * @property {boolean} visible
 * @property {boolean} closed
 * @property {boolean} archived
 * @property {string} excerpt
 * @property {number} id
 */
/**
 * @param {[DiscourseTopic]} [threads=[]] - Already stored threads.
 * @returns {[DiscourseTopic]} Updated threads.
 * @this DiscourseThreads
 */
async function getThreads(threads = []) {
    const result = await this.promisedGetCategory(this.forum, '');
    const existingIds = threads.map((t) => t.id);
    for(const topic of result.topic_list.topcis) {
        if(!existingIds.includes(topic.id)) {
            this.emit('created', topic);
        }
    }
    return result.topic_list.topics;
}
getThreads.emitsEvents = true;

class DiscourseThreads extends DataStoreHolder {
    /**
     * @param {Object} config - Discourse client config.
     */
    constructor(config) {
        super({
            threads: getThreads
        });

        this.discourse = new Discourse(config.url, config.key, config.username);
        this.promisedGetCategory = util.promisify(this.discourse.getCategoryLatestTopic.bind(this.discourse));
        //TODO have a factory for thread watchers or something
        this.forum = config.forum;
    }
}

module.exports = DiscourseThreads;
