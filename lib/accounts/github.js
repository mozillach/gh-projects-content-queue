/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/**
 * @module accounts/github
 * @license MPL-2.0
 */
"use strict";

const GitHub = require("@octokit/rest");
const pagination = require("./pagination");

class GitHubAccount {
    static get pagination() {
        return pagination.github;
    }

    constructor(config) {
        const ghClient = new GitHub();
        ghClient.authenticate({
            type: "token",
            token: config.token
        });
        this.client = ghClient;
    }
}

module.exports = GitHubAccount;
