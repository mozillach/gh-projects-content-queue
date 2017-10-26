/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

const GitHub = require("github");
const Twitter = require("twitter");
const path = require("path");

const { loadConfig } = require("./lib/config");
const ContentQueue = require("./lib/content-queue");

loadConfig(path.join(__dirname, "./config.json")).then((config) => {
    for(const project of config) {
        const ghClient = new GitHub({
            Promise: Promise,
            protocol: "https"
        });
        ghClient.authenticate({
            type: "token",
            token: project.githubToken
        });
        const twitterClient = new Twitter(project.twitter);
        new ContentQueue(ghClient, twitterClient, project);
    }
}).catch((e) => console.error(e));
