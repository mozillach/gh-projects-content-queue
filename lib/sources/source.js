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

    static get requiredConfig() {
        return [
            'columns'
        ];
    }

    /**
     * @param {module:repo.Repository} repo - GitHub repo instance.
     * @param {module:twitter-account.TwitterAccount} twitterAccount - Twitter Account instance.
     * @param {object} config - Source specific config.
     */
    constructor(repo, twitterAccount, config) {
        this._repo = repo;
        this._twitterAccount = twitterAccount;
        this._config = config;
    }

    async getColumn(columnKey) {
        const [ columns, columnIds ] = await Promise.all([
            this._repo.board.columns,
            this._repo.board.columnIds
        ]);
        return columns[columnIds[this._config.columns[columnKey]]];
    }
}
module.exports = Source;
