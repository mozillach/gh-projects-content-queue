/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
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
  * as argument if available when the cache is expired. See the fetchData callback.
  */
class DataStore {
    /**
     * @param {fetchData} dataFetcher - Callback to load the data from the API.
     * @param {number} [cacheTime=60000] - Time to cache content in ms.
     */
    constructor(dataFetcher, cacheTime = 60000) {
        this.cacheTime = cacheTime;
        this.lastUpdate = 0;
        this.cachedData = null;
        this.fetch = dataFetcher;
        this.currentWork = null;
    }

    /**
     * Checks if the cache should be considered expired.
     *
     * @type {boolean}
     * @readonly
     */
    get cacheExpired() {
        return this.cachedData !== null && Date.now() - this.lastUpdate < this.cacheTime;
    }

    /**
     * Returns the data for this data store either fresh from the API or the
     * cached instance.
     *
     * @returns {?} Data structure returned by the API.
     */
    async getData() {
        if(this.cacheExpired) {
            return this.cachedData;
        }
        else if(this.currentWork !== null) {
            return this.currentWork;
        }
        else {
            return this.currentWork = this.fetch(this.cachedData, this.lastUpdate).then((data) => {
                this.cachedData = data;
                this.lastUpdate = Date.now();
                this.currentWork = null;
                return data;
            });
        }
    }
}


module.exports = DataStore;
