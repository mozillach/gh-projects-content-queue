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

        repo.issues.on("opened", async (issue) => {
            this.addIssue(issue, this._repo.issues.firstRun);
        });

        repo.issues.on("updated", async (issue) => {
            const columns = Object.values(await repo.board.columns.getData());
            for(const column of columns) {
                //TODO generalize this into columns that are not to be worked on provided by sources
                if(column && column.hasCard(issue.id) && column.id != repo.board.columnIds.tweeted) {
                    column.getCard(issue.id).checkValidity();
                    break;
                }
            }
        });

        repo.issues.on("closed", async (issue) => {
            const columns = Object.values(await repo.board.columns.getData());
            for(const column of columns) {
                //TODO generalize this into columns that are not to be worked on provided by sources
                if(column && column.hasCard(issue.id) && column.id != repo.board.columnIds.tweeted) {
                    column.removeCard(repo.board.columnInstances.getCard(issue.id));
                    break;
                }
            }
        });

        repo.issues.issues.getData().then(async (issues) => {
            if(issues.size > 0) {
                for(const issue of issues.values()) {
                    await this.addIssue(issue, true);
                }
            }
        });
    }

    async addIssue(issue, firstRun) {
        const columns = Object.values(await this._repo.board.columns.getData());
        for(const column of columns) {
            if(column && (await column.hasIssue(issue.number))) {
                return this._repo.boarda.ddCard(issue, column, firstRun);
            }
        }
        // If the card is in no other column add it to the backlog.
        return this._repo.board.addCard(issue);
    }
}
module.exports = IssuesSource;
