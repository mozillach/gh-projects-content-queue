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

const Board = require("./board");
const SourceManager = require("./sources/manager");

/**
 * Default labels for the default labels.
 *
 * @const
 * @enum {string}
 */
const DEFAULT_LABELS = {
    // retweet: "Retweet",
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
     * @param {module:accounts/manager~AccountManager} accountManager - Account manager.
     *                                           authenticated for a user.
     * @param {module:config~Config} config - Config for this project.
     * @param {module:repo~Repository} repository - Repository this board is in.
     */
    constructor(accountManager, config, repository) {
        const [ owner, repo ] = config.repo.split("/");
        config.owner = owner;
        config.repo = repo;

        config.labels = Object.assign(Object.assign({}, DEFAULT_LABELS), config.labels);

        /**
         * @type {module:config~Config}
         */
        this.config = config;
        this.repo = repository;
        this.accountManager = accountManager;
        const githubClient = accountManager.getAccount('github', config.githubAccount).client;
        this.board = new Board(githubClient, config, repository);
        this.manager = new SourceManager(config, this.repo, this.accountManager, this.board);
        this.repo.ready
            .then(() => Promise.all([
                this.repo.addIssueTemplates(this.config),
                this.repo.ensureLabels(this.config.labels)
            ]))
            .catch((e) => console.error("ContentQueue setup", e));
    }
}

module.exports = ContentQueue;
