/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

const DataStore = require("./data-store");
const EventEmitter = require("events");

/**
 * The data stores of this class have been updated.
 *
 * @event DataStoreHolder#storesupdated
 */

/**
 * Manages properties in a class that are DataStores.
 */
class DataStoreHolder extends EventEmitter {
    /**
     * @param {Object.<string,function>} dataStores - Properties that will be data stores with a function that will fill the data store.
     */
    constructor(dataStores) {
        super();
        this._dataStores = dataStores;
        for(const p in dataStores) {
            this[p] = new DataStore(dataStores[p].bind(this));
        }
    }

    /**
     * Updates all the DataStores in the holder.
     *
     * @returns {undefined}
     * @fires DataStoreHolder#storesupdated
     */
    async update() {
        await Promise.all(Object.keys(this._dataStores).map((ds) => this[ds].getData()));
        this.emit("storesupdated");
    }
}

module.exports = DataStoreHolder;
