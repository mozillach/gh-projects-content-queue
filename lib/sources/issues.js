/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

const Source = require("./source");

class IssuesSource extends Source {
    static get requiredColumns() {
        return [
            "ideas"
        ];
    }

    //TODO repo.board.tweeted should be a configuration of this source

    constructor(repo, twitterAccount) {
        super(repo, twitterAccount);

        // Boards will be filled via this event handler, as that's how the
        // initial issue load works.

        repo.issues.on("opened", (issue) => {
            this.addIssue(issue, this._repo.issues.firstRun).catch(console.error);
        });

        repo.issues.on("updated", async (issue) => {
            try {
                const column = await this.handleCard(issue);
                if(column !== null) {
                    await column.getCard(issue.id).checkValidity();
                }
            } catch(e) {
                console.error("Handling updated isssue", issue.id, e);
            }
        });

        repo.issues.on("closed", async (issue) => {
            try {
                const column = await this.handleCard(issue);
                if(column !== null) {
                    await column.removeCard(column.getCard(issue.id));
                }
            } catch(e) {
                console.error("Handling closed issue", issue.id, e);
            }
        });

        repo.issues.issues.then(async (issues) => {
            if(issues.size > 0) {
                for(const issue of issues.values()) {
                    await this.addIssue(issue, true);
                }
            }
        });
    }

    async handleCard(issue) {
        const [ columns, columnIds ] = await Promise.all([
            this._repo.board.columns,
            this._repo.board.columnIds
        ]);
        for(const column of Object.values(columns)) {
            //TODO generalize this into columns that are not to be worked on provided by sources
            if(column && column.hasCard(issue.id) && column.id != columnIds.tweeted) {
                return column;
            }
        }
        return null;
    }

    async addIssue(issue, firstRun) {
        const columns = Object.values(await this._repo.board.columns);
        for(const column of columns) {
            if(column && (await column.hasIssue(issue.number))) {
                return this._repo.board.addCard(issue, column, firstRun);
            }
        }
        // If the card is in no other column add it to the backlog.
        return this._repo.board.addCard(issue);
    }
}
module.exports = IssuesSource;
