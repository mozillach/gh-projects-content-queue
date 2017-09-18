/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/**
 * @module sources/squad
 * @license MPL-2.0
 */
"use strict";

const Source = require("./source");
const RotatingList = require("../rotating-list");

/**
 * @alias module:sources/squad.SquadSource
 * @extends module:sources/source.Source
 */
class SquadSource extends Source {
    static get requiredColumns() {
        return [
            'target'
        ];
    }

    static get requiredConfig() {
        return Source.requiredConfig.concat([
            'squad'
        ]);
    }

    /**
     * @inheritdoc
     */
    constructor(...args) {
        super(...args);

        this.squad = new RotatingList(this._config.squad);

        this._repo.issues.on('opened', async (issue) => {
            const column = await this.getColumn('target');
            if(!issue.assignee && (await column.hasIssue(issue.number))) {
                await issue.assign(this.squad.getNext());
            }
        });

        //TODO doesn't properly init because cards aren't populated yet.
        this.getColumn('target').then(async (column) => {
            const cards = await column.cards;
            for(const card of cards.values()) {
                if(!card.issue.assignee) {
                    await card.assign(this.squad.getNext());
                }
            }
        }).catch(console.error);
    }
}

module.exports = SquadSource;
