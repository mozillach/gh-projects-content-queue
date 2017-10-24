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

    /**
     * @inheritdoc
     */
    constructor(...args) {
        super(...args);

        if("squad" in this._config) {
            this.squad = new RotatingList(this._config.squad);
            this.processCards();
        }
        else if("squadTeam" in this._config) {
            this._repo.getUsersInTeam(this._config.squadTeam).then((squad) => {
                this.squad = squad;
                return this._repo.ready;
            }).then(() => this.processCards()).catch(console.error);
        }
        else {
            throw new Error("Either needs an array of usernames as squad or a squadTeam name");
        }
    }

    async processCards() {
        await this._repo.ready;
        this._repo.issues.on('opened', async (issue) => {
            const column = await this.getColumn('target');
            if(!issue.assignee && (await column.hasIssue(issue.number))) {
                await issue.assign(this.squad.getNext());
            }
        });

        const column = await this.getColumn('target');
        const cards = await column.cards;
        for(const card of cards.values()) {
            if(!card.issue.assignee) {
                await card.assign(this.squad.getNext());
            }
        }
    }
}

module.exports = SquadSource;
