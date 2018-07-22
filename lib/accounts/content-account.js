/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

const Formatter = require("../formatters/formatter");
const DataStoreHolder = require("../data-store-holder");

class ContentAccount extends DataStoreHolder {
    static get TYPE() {
        return Formatter.TYPE;
    }

    /**
     * @async
     * @return {string} Markdown link to account
     */
    getAccountLink() {
        return Promise.reject("Account link not implemented for content account");
    }
}
module.exports = ContentAccount;
