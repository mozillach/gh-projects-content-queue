/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/**
 * @module data-store
 * @license MPL-2.0
 */
"use strict";

/**
 * Returns API data to store.
 *
 * @callback fetchData
 * @async
 * @param {?} apiData - Data that is currently cached, so the last returned data.
 * @param {number?} cacheTime - The timestamp when the data was last cached.
 * @returns {?} Data to store in the cache. If null is returned the cache is
 *          considered empty.
 */

/**
 * Container class that manages a value that contains cached API data.
 * It calls a method gets the currently cached apiData and the last cache time
 * as argument if available when the cache is expired.
 *
 * @see {@link module:data-store~fetchData}
 * @alias module:data-store.DataStore
 */
class DataStore {
    /**
     * @param {fetchData} dataFetcher - Callback to load the data from the API.
     * @param {number} [cacheTime=60000] - Time to cache content in ms.
     */
    constructor(dataFetcher, cacheTime = 60000) {
        /**
         * Time in ms that the data is cached.
         *
         * @type {number}
         */
        this.cacheTime = cacheTime;
        /**
         * Last time the store was updated as timestamp.
         *
         * @type {number}
         */
        this.lastUpdate = Math.min(0, Date.now() - cacheTime - 1);
        /**
         * Cached data in the store.
         *
         * @type {?}
         */
        this.cachedData = undefined;
        /**
         * Promise of current data request if one is running.
         *
         * @type {Promise.<?>}
         */
        this.currentWork = null;
        /**
         * Function to load data into the data store.
         *
         * @type {module:data-store~fetchData}
         */
        this.fetch = dataFetcher;
    }

    /**
     * Checks if the cache should be considered expired.
     *
     * @type {boolean}
     * @readonly
     */
    get cacheExpired() {
        return this.cachedData === null || Date.now() - this.lastUpdate >= this.cacheTime;
    }

    /**
     * Returns the data for this data store either fresh from the API or the
     * cached instance.
     *
     * @async
     * @returns {?} Data structure returned by the API.
     */
    getData() {
        if(!this.cacheExpired) {
            return Promise.resolve(this.cachedData);
        }
        else {
            if(this.currentWork === null) {
                this.currentWork = this.fetch(this.cachedData, this.lastUpdate).then((data) => {
                    this.lastUpdate = Date.now();
                    this.currentWork = null;
                    this.cachedData = data;
                    return data;
                });
            }
            return this.currentWork;
        }
    }
}

module.exports = DataStore;
