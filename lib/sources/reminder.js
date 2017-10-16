/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/**
 * @module sources/reminder
 * @license MPL-2.0
 */
"use strict";

const Source = require("./source");

/**
 * @alias module:sources/reminder.ReminderSource
 * @extends module:sources/source.Source
 */
class ReminderSource extends Source {
    static get requiredColumns() {
        return [
            'target'
        ];
    }

    constructor(...args) {
        super(...args);

        this.lastRun = Date.now();

        this._repo.board.on("updated", async () => {
            const [ columns, ignoredColumns, target ] = await Promise.all([
                this._repo.board.columns,
                this._getManagedColumns(),
                this.getColumn('target')
            ]);
            const interval = Date.now() - this.lastRun;
            this.lastRun = Date.now();
            const ignoredColumnIDs = ignoredColumns.map((c) => c.id);
            for(const column of Object.values(columns)) {
                if(!ignoredColumnIDs.includes(column.id)) {
                    const cards = await column.cards;
                    for(const card of cards.values()) {
                        try {
                            if(card.content.isScheduled && (column.id !== target.id || !card.content.isValid)) {
                                const date = card.content.date.getTime();
                                if(date > Date.now() && Math.abs(date - Date.now() - this.REMIND_BEFORE) <= interval) {
                                    let content = "";
                                    if(card.issue.assignee) {
                                        content += `Hey @${card.issue.assignee}, `;
                                    }
                                    content += "this tweet is due in less than **1 day** and ";
                                    if(column.id === target.id) {
                                        content += "not yet ready.";
                                    }
                                    else {
                                        content += `is not yet in the "${this._config.columns.target}" column.`;
                                    }
                                    await card.remind(content);
                                }
                            }
                        }
                        catch(e) {
                            card.reportError(e);
                        }
                    }
                }
            }
        });
    }

    get REMIND_BEFORE() {
        return 1000 * 60 * 60 * 24;
    }
}

module.exports = ReminderSource;
