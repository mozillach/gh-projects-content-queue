/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/**
 * @module update-manager
 * @license MPL-2.0
 */
"use strict";

const UpdateManager = {
    UPDATE_INTERVAL: 60000,
    targets: new Set(),
    interval: setInterval(() => UpdateManager.update(), UpdateManager.UPDATE_INTERVAL),
    /**
     * @param {module:data-store-holder} sh - DataStoreHolder to get automatic updates.
     * @returns {undefined}
     */
    register(sh) {
        this.targets.add(sh);
    },
    async update() {
        for(const target of this.targets.values()) {
            try {
                await target.update();
            }
            catch(e) {
                console.error('Updating a data store resulted in an error:', e);
            }
        }
    }
};
module.exports = UpdateManager;
