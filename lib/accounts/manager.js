/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/**
 * @module accounts/manager
 * @license MPL-2.0
 */
"use strict";

class AccountManager {
    /**
     * Types that would resolve but are not account types.
     *
     * @type {[string]}
     * @readonly
     */
    static get NOT_ACCOUNTS() {
        return [
            'manager',
            'pagination'
        ];
    }

    constructor(config) {
        this.accounts = {};
        this.accountFactories = {};

        for(const type in config) {
            for(const accountInfo of config[type]) {
                this.registerAccount(type, accountInfo.name, accountInfo);
            }
        }
    }

    registerAccount(type, name, config) {
        if(!this.accountFactories.hasOwnProperty(type)) {
            this.accountFactories[type] = require(`./${type}`);
            this.accounts[type] = {};
        }
        if(!this.accounts[type].hasOwnProperty(name)) {
            this.accounts[type][name] = new this.accountFactories[type](config);
        }
    }

    getAccount(type, name) {
        if(!this.accounts.hasOwnProperty(type)) {
            throw new Error(`Unknwon account type ${type}`);
        }
        if(!this.accounts[type].hasOwnProperty(name)) {
            throw new Error(`Unknown account ${name} for ${type}`);
        }
        return this.accounts[type][name];
    }
}

module.exports = AccountManager;
