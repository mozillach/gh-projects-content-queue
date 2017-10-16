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

const DataStoreHolder = require("./data-store-holder");
const UpdateManager = require("./update-manager");
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

class DiscourseThreads extends DataStoreHolder {
    /**
     * @param {string} discourseUrl - API URL of the discourse instance.
     * @param {string} key - API Key for the discourse instance.
     * @param {string} username - Username for the discourse instance.
     * @param {string} forum - Slug of the category to monitor.
     */
    constructor(discourseUrl, key, username, forum) {
        super({
            threads: getThreads
        });

        this.discourse = new Discourse(discourseUrl, key, username);
        this.promisedGetCategory = util.promisify(this.discourse.getCategoryLatestTopic.bind(this.discourse));
        this.forum = forum;

        UpdateManager.register(this);
    }
}

module.exports = DiscourseThreads;
