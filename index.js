/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

const GitHub = require("github");

const { loadConfig } = require("./lib/config");

loadConfig("config.json").then((config) => {
    for(const project of config) {
        const ghClient = new GitHub();
        ghClient.authenticate({
            type: "token",
            token: project.githubToken
        });
    }
});
