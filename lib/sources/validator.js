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
const self = require("../self");

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
            this._repo.issues.on("updated", async (issue) => {
                //TODO this may not mark the card as invalid once it's due.
                try {
                    const column = await this.getCardColumn(issue);
                    if(column !== null) {
                        const card = await column.getCard(issue.id);
                        if(card) {
                            const errors = this.validator.validate(card.content);
                            card.setValidity(errors, Validator.TITLE);
                        }
                        else {
                            console.warn("No card for ", issue.number, "when trying to update it");
                        }
                    }
                } catch(e) {
                    console.error("Handling updated isssue", issue.number, e);
                }
            });
            return this.onUpdated();
        }).catch(console.error);

    }

    async getColumns() {
        const [
            managedColumns,
            columns
        ] = await Promise.all([
            this._getManagedColumns(),
            this._repo.board.columns
        ]);
        const ignoredColumnIDs = managedColumns.map((c) => c.id);
        return Object.values(columns).filter((c) => !ignoredColumnIDs.includes(c.id));
    }

    async getCardColumn(issue) {
        const columns = await this.getColumns();
        for(const column of columns) {
            if(await column.hasIssue(issue.number)) {
                return column;
            }
        }
        return null;
    }

    async onUpdated()
    {
        //TODO some intelligent way to interop with multiple validators of different types. (sniff issue type or something)
        const columns = await this.getColumns();

        for(const column of columns) {
            const cards = await column.cards;
            for(const card of cards.values()) {
                const errors = this.validator.validate(card.content);
                card.setValidity(errors, self(this.validator).TITLE);
            }
        }
    }
}

module.exports = ValidatorSource;
