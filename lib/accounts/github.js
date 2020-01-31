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

const { retry } = require("@octokit/plugin-retry");
const { throttling } = require("@octokit/plugin-throttling");
const GitHub = require("@octokit/rest")
    .plugin(retry)
    .plugin(throttling);

const MAX_RETRIES = 5;

class GitHubAccount {
    constructor(config) {
        const ghClient = new GitHub({
            auth: `token ${config.token}`,
            throttle: {
                onRateLimit: (retryAfter, options) => {
                    console.warn(`Request quota exhausted for request ${options.method} ${options.url}`);

                    if (options.request.retryCount < MAX_RETRIES) {
                        console.log(`Retrying after ${retryAfter} seconds!`);
                        return true;
                    }
                },
                onAbuseLimit: (retryAfter, options) => {
                    console.warn(`Abuse detected for request ${options.method} ${options.url}`);
                }
            }
        });
        this.client = ghClient;
    }
}

module.exports = GitHubAccount;
