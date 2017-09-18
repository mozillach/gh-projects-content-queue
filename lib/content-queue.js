/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/**
 * @module content-queue
 * @license MPL-2.0
 * @todo ensure repo exists.
 */
"use strict";

const Repository = require("./repo");
const TwitterAccount = require("./twitter-account");
const SourceManager = require("./sources/manager");

/**
 * Default labels for the default labels.
 *
 * @const
 * @enum {string}
 */
const DEFAULT_LABELS = {
    retweet: "Retweet",
    ready: "ready",
    invalid: "invalid"
};

/**
 * Basic class that manages the events for a single repo.
 *
 * @alias module:content-queue.ContentQueue
 */
class ContentQueue {
    /**
     * @param {external:GitHub} githubClient - GitHub client from GitHub
     *                                           authenticated for a user.
     * @param {external:Twitter} twitterClient - Authenticated for a user.
     * @param {module:config~Config} config - Config for this project.
     */
    constructor(githubClient, twitterClient, config) {
        const [ owner, repo ] = config.repo.split("/");
        config.owner = owner;
        config.repo = repo;

        config.labels = Object.assign(Object.assign({}, DEFAULT_LABELS), config.labels);

        /**
         * @type {module:config~Config}
         */
        this.config = config;
        /**
         * @type {external:GitHub}
         */
        this.githubClient = githubClient;
        /**
         * @type {external:Twitter}
         */
        this.twitterClient = twitterClient;
        /**
         * @type {module:twitter-account.TwitterAccount}
         */
        this.twitterAccount = new TwitterAccount(twitterClient);
        /**
         * @type {module:repo.Repository}
         */
        this.repo = new Repository(githubClient, this.twitterAccount, config);

        Promise.all([
            this.repo.ready,
            this.twitterAccount.ready
        ]).then(() => {
            this.manager = new SourceManager(config, this.repo, this.twitterAccount);
        }).catch((e) => console.error("ContentQueue setup", e));
    }
}

module.exports = ContentQueue;
