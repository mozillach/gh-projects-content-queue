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
const DataStore = require("../data-store");

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
            this.squad = Promise.resolve(new RotatingList(this._config.squad));
        }
        else if("squadTeam" in this._config) {
            const store = new DataStore(async (prevList) => {
                const squad = await this._repo.getUsersInTeam(this._config.squadTeam);
                const list = new RotatingList(squad);

                if(prevList) {
                    let nextUser,
                        counter = 0;

                    //TODO this uses implementation details of rotating lists.
                    do {
                        nextUser = prevList.getNext();
                        ++ counter;
                    } while(!list.items.includes(nextUser) && counter < prevList.size);

                    list.current = Math.max(list.items.indexOf(nextUser) - 1, 0);
                }
                return list;
            });
            Object.defineProperty(this, 'squad', {
                enumerable: true,
                get() {
                    return store.getData();
                }
            });
        }
        else {
            throw new Error("Either needs an array of usernames as squad or a squadTeam name");
        }
        this.ready = this.processCards().catch(console.error);
    }

    async processCards() {
        await this._repo.ready;
        this._repo.issues.on('opened', async (issue) => {
            const column = await this.getColumn('target');
            if(!issue.assignee && (await column.hasIssue(issue.number))) {
                const squad = await this.squad;
                await issue.assign(squad.getNext());
            }
        });

        const column = await this.getColumn('target');
        const cards = await column.cards;
        for(const card of cards.values()) {
            if(!card.issue.assignee) {
                const squad = await this.squad;
                await card.assign(squad.getNext());
            }
        }
    }
}

module.exports = SquadSource;
