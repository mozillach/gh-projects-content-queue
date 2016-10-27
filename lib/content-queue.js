/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

//TODO ensure repo exists.
//TODO ensure necessary rights are granted -> repo?

const Board = require("./board");

/**
 * Basic class that manages the events for a single repo.
 */
class ContentQueue {
    /**
     * @param {external:GitHubClient} githubClient - GitHub client from github
     *                                               authenticated for a user.
     * @param {external:TwitterClient} twitterClient - Authenticated for a user.
     * @param {Object} config - Config for this project
     * @constructs
     */
    constructor(githubClient, twitterClient, config) {
        const [ owner, repo ] = config.repo.split("/");
        config.owner = owner;
        config.repo = repo;

        this.config = config;
        this.board = new Board(githubClient, config);
    }
}

module.exports = ContentQueue;
