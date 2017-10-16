/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/**
 * @module sources/manager
 * @license MPL-2.0
 */
"use strict";

class SourceLoadError extends Error {
    constructor(message, sourceType) {
        super(`Error when reading configuration for source ${sourceType}: ${message}`);
        this.sourceType = sourceType;
    }
}

/**
 * @alias module:sources/manager.SourceManager
 */
class SourceManager {
    static get NOT_SOURCES() {
        return [
            'manager',
            'source'
        ];
    }

    constructor(config, repo, twitterAccount) {
        this.sources = new Set();
        this.sourceFactories = new Map();
        this.managedColumns = new Set();

        this._config = config;
        this._repo = repo;
        this._twitterAccount = twitterAccount;

        if(typeof config.sources == "object" && config.sources != null) {
            for(const s in config.sources) {
                const Source = this.getSourceFactory(s);
                if(this.checkSourceConfig(s)) {
                    const sourceConfig = this.getSourceConfig(s);
                    this.sources.add(new Source(this._repo, this._twitterAccount, sourceConfig, () => this.getManagedColumns()));
                    if(Source.managedColumns.length) {
                        for(const c of Source.managedColumns) {
                            this.managedColumns.add(sourceConfig.columns[c]);
                        }
                    }
                }
                else {
                    const sourceConfig = this.getSourceConfig(s);
                    const missingConfig = SourceManager.missingConfig(Source.requiredConfig, sourceConfig);
                    if(!missingConfig.length) {
                        const missingColumns = SourceManager.missingConfig(Source.requiredColumns, sourceConfig.columns);
                        throw new SourceLoadError(`Missing column names: ${missingColumns.join(",")}`, s);
                    }
                    throw new SourceLoadError(`Missing the following config keys: ${missingConfig.join(",")}`, s);
                }
            }
        }
    }

    async getManagedColumns() {
        const [ columns, columnIds ] = await Promise.all([
            this._repo.board.columns,
            this._repo.board.columnIds
        ]);
        return Array.from(this.managedColumns.values()).map((name) => columns[columnIds[name]]);
    }

    getSourceFactory(sourceType) {
        if(SourceManager.NOT_SOURCES.includes(sourceType)) {
            throw new SourceLoadError("It is not a source.");
        }
        if(!this.sourceFactories.has(sourceType)) {
            this.sourceFactories.set(sourceType, require(`./${sourceType}`));
        }
        return this.sourceFactories.get(sourceType);
    }

    getSourceConfig(sourceType) {
        return this._config.sources[sourceType];
    }

    /**
     * @param {[string]} required - Required keys.
     * @param {Object} config - Configuration to check.
     * @returns {boolean} If the config contains all required keys.
     */
    static checkConfigArray(required, config) {
        return !required.length || required.every((c) => c in config);
    }

    /**
     * @param {[string]} required - Required keys.
     * @param {Object} config - Configuration to check against.
     * @returns {[string]} Keys that are not in the config.
     */
    static missingConfig(required, config) {
        return required.filer((c) => !(c in config));
    }

    checkSourceConfig(sourceType) {
        const Source = this.getSourceFactory(sourceType);
        const sourceConfig = this.getSourceConfig(sourceType);
        return SourceManager.checkConfigArray(Source.requiredConfig, sourceConfig)
            && SourceManager.checkConfigArray(Source.requiredColumns, sourceConfig.columns);
    }
}

module.exports = SourceManager;
