/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/**
 * @module data-store-holder
 * @license MPL-2.0
 */
"use strict";

const DataStore = require("./data-store");
const AsyncEventEmitter = require("./async-event-emitter");

/**
 * The data stores of this class have been updated.
 *
 * @event module:data-store-holder.DataStoreHolder#storesupdated
 */

/**
 * Manages properties in a class that are {@link module:data-store.DataStore DataStores}.
 * The properties return a promise that resolves to the value of the DataStore.
 * All DataStores are initialized with the default cache time.
 *
 * @extends module:async-event-emitter.AsyncEventEmitter
 * @alias module:data-store-holder.DataStoreHolder
 */
class DataStoreHolder extends AsyncEventEmitter {
    /**
     * @param {Object.<string,function>} dataStores - Properties that will be
     *        data stores with a function that will fill the data store.
     */
    constructor(dataStores) {
        super();
        /**
         * @private
         * @type {object}
         */
        this._dataStores = {};
        for(const p in dataStores) {
            this._dataStores[p] = new DataStore(dataStores[p].bind(this));
            Object.defineProperty(this, p, {
                enumerable: true,
                get: this.getData.bind(this, p)
            });
        }
    }

    /**
     * @see module:data-store.DataStore#getData
     * @param {string} property - Property to get the data for.
     * @returns {?} Data in the store.
     */
    getData(property) {
        return this._dataStores[property].getData();
    }

    /**
     * Updates all the DataStores in the holder.
     *
     * @returns {undefined}
     * @fires module:data-store-holder.DataStoreHolder#storesupdated
     */
    async update() {
        await Promise.all(Object.keys(this._dataStores).map((ds) => this.getData(ds)));
        this.emit("storesupdated");
    }
}

module.exports = DataStoreHolder;
