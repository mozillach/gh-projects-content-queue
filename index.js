/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

const path = require("path");

const { loadConfig } = require("./lib/config");
const ContentQueue = require("./lib/content-queue");
const AccountManager = require("./lib/accounts/manager");

loadConfig(path.join(__dirname, "./config.json")).then((config) => {
    const accountManager = new AccountManager(config.accounts);
    //TODO share repos accross boards
    for(const project of config.boards) {
        new ContentQueue(accountManager, project);
    }
}).catch((e) => console.error(e));
