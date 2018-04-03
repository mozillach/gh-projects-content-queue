/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/**
 * @module sources/validator
 * @license MPL-2.0
 */
"use strict";

const Source = require("./source");

class ValidatorSource extends Source {
    static get requiredConfig() {
        return [
            'type'
        ];
    }

    constructor(...args) {
        super(...args);

        const Validator = require(`../validators/${this._config.type}`);
        this.validator = new Validator(this._repo.config);

        this._repo.ready.then(() => {
            this._repo.board.on("storesupdated", () => this.onUpdated());
        });

        //TODO check validity of existing cards
    }

    async onUpdated()
    {
        const [
            managedColumns,
            columns
        ] = await Promise.all([
            this._getManagedColumns(),
            this._repo.borad.columns
        ]);
        const ignoredColumnIDs = managedColumns.map((c) => c.id);

        for(const column of Object.values(columns)) {
            if(!ignoredColumnIDs.includes(column.id)) {
                const cards = await column.cards;
                for(const card of cards.values()) {
                    const errors = this.validator.validate(card.toString());
                    card.setValidity(errors);
                }
            }
        }
    }
}

module.exports = ValidatorSource;
