/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/**
 * @module sources/source
 * @license MPL-2.0
 */
"use strict";

/**
 * @alias module:sources/source.Source
 */
class Source {
    static get requiredColumns() {
        return [];
    }

    /**
     * @param {module:repo.Repository} repo - GitHub repo instance.
     * @param {module:twitter-account.TwitterAccount} twitterAccount - Twitter Account instance.
     */
    constructor(repo, twitterAccount) {
        this._repo = repo;
        this._twitterAccount = twitterAccount;
    }
}
module.exports = Source;
