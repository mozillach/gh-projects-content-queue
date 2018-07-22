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
            'validator'
        ];
    }

    constructor(...args) {
        super(...args);

        const Validator = require(`../validators/${this._config.validator}`);
        this.validator = new Validator(this._repo.config);

        this._repo.ready.then(() => {
            this._repo.board.on("storesupdated", () => this.onUpdated());
            //TODO previously ran on issues update event. That'd mean incremental checks instead of checking all cards every time.
            // this._repo.issues.on("updated", async (issue) => {
            //     try {
            //         const column = await this.handleCard(issue);
            //         if(column !== null) {
            //             const card = await column.getCard(issue.id);
            //             if(card) {
            //                 this.checkCardValidity(card);
            //             }
            //             else {
            //                 console.warn("No card for ", issue.number, "when trying to update it");
            //             }
            //         }
            //     } catch(e) {
            //         console.error("Handling updated isssue", issue.number, e);
            //     }
            // });
            return this.onUpdated();
        }).catch(console.error);

    }

    async onUpdated()
    {
        //TODO some intelligent way to interop with multiple validators of different types. (sniff issue type or something)
        const [
            managedColumns,
            columns
        ] = await Promise.all([
            this._getManagedColumns(),
            this._repo.board.columns
        ]);
        const ignoredColumnIDs = managedColumns.map((c) => c.id);

        for(const column of Object.values(columns)) {
            if(!ignoredColumnIDs.includes(column.id)) {
                const cards = await column.cards;
                for(const card of cards.values()) {
                    const errors = this.validator.validate(card.content);
                    card.setValidity(errors);
                }
            }
        }
    }
}

module.exports = ValidatorSource;
