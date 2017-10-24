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
    /**
     * Column keys required by this source. The configuration then defines their
     * names.
     *
     * @type {[string]}
     * @readonly
     */
    static get requiredColumns() {
        return [];
    }

    /**
     * Configuration keys required by this source.
     *
     * @type {[string]}
     * @readonly
     */
    static get requiredConfig() {
        return [
            'columns'
        ];
    }

    /**
     * Column keys that contain closed issues this Source will manage and should
     * not be altered by other sources.
     *
     * @type {[string]}
     * @readonly
     */
    static get managedColumns() {
        return [];
    }

    /**
     * @param {module:repo.Repository} repo - GitHub repo instance.
     * @param {module:twitter-account.TwitterAccount} twitterAccount - Twitter Account instance.
     * @param {object} config - Source specific config.
     * @param {function} getManagedColumns - Callback that returns the managed columns.
     */
    constructor(repo, twitterAccount, config, getManagedColumns) {
        this._repo = repo;
        this._twitterAccount = twitterAccount;
        this._config = config;
        this._getManagedColumns = getManagedColumns;
    }

    async getColumn(columnKey) {
        await this._repo.ready;
        const [ columns, columnIds ] = await Promise.all([
            this._repo.board.columns,
            this._repo.board.columnIds
        ]);
        return columns[columnIds[this._config.columns[columnKey]]];
    }
}
module.exports = Source;
