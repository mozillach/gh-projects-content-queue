/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

const Source = require("./source");
const TweetCard = require("../tweet-card");

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
            const columns = Object.values(await repo.board.columns.getData());
            for(const column of columns) {
                if(column && (await column.hasIssue(issue.number))) {
                    return column.addCard(new TweetCard(issue, repo.config), repo.issues.firstRun);
                }
            }
            // If the card is in no other column add it to the backlog.
            return repo.board.addCard(issue);
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
    }
}
module.exports = IssuesSource;
