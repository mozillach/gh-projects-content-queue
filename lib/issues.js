/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

const EventEmitter = require("events");

//TODO use webhooks instead of polling for updates.

/**
 * Holds a list of all GitHub issues for a repo and emits events when issues are
 * added, closed or edited.
 */
class Issues extends EventEmitter {
    /**
     * @param {PromisifiedGitHub} githubClient - GitHub client to use.
     * @param {Object} config - Repository infromation.
     */
    constructor(githubClient, config) {
        super();
        // ID - Issue map
        this.issues = new Map();
        this.config = config;
        this.githubClient = githubClient;

        this.fetchOpenIssues();
    }

    /**
     * Loads all open issues into the issues map.
     *
     * @async
     * @returns {undefined}
     */
    fetchOpenIssues() {
    }
}

module.exports = Issues;
