/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/**
 * @module sources/issues
 * @license MPL-2.0
 */
"use strict";

const Source = require("./source");

/**
 * @alias module:sources/issues.IssuesSource
 * @extends module:sources/source.Source
 */
class IssuesSource extends Source {
    static get requiredColumns() {
        return [
            "target",
            "ignored"
        ];
    }

    //TODO repo.board.tweeted should be a configuration of this source
    /**
     * @inheritdoc
     */
    constructor(repo, twitterAccount, config) {
        super(repo, twitterAccount, config);

        // Boards will be filled via this event handler, as that's how the
        // initial issue load works.

        repo.issues.on("opened", (issue) => {
            return this.addIssue(issue, this._repo.issues.firstRun).catch(console.error);
        });

        repo.issues.on("updated", async (issue) => {
            try {
                const column = await this.handleCard(issue);
                if(column !== null) {
                    const card = await column.getCard(issue.id);
                    if(card) {
                        card.checkValidity();
                    }
                    else {
                        //TODO card is not in the system yet, should we add it?
                    }
                }
            } catch(e) {
                console.error("Handling updated isssue", issue.id, e);
            }
        });

        repo.issues.on("closed", async (issue) => {
            try {
                const column = await this.handleCard(issue);
                if(column !== null) {
                    const card = await column.getCard(issue.id);
                    if(card) {
                        await column.removeCard(card);
                    }
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
        }).catch(console.error);

        repo.issues.closedIssues.then(async (issues) => {
            if(issues.size > 0) {
                const tweeted = await this.getColumn('ignored');
                for(const issue of issues.values()) {
                    const card = await this.addIssue(issue, true, true);
                    if(card && card.column && card.column.id !== tweeted.id) {
                        await card.column.removeCard(card);
                    }
                }
            }
        }).catch(console.error);
    }

    /**
     * @param {module:issue.Issue} issue - Issue to handle.
     * @returns {module:column.Column?} Column where the issue is in.
     */
    async handleCard(issue) {
        const [ columns, tweeted ] = await Promise.all([
            this._repo.board.columns,
            this.getColumn('ignored')
        ]);
        for(const column of Object.values(columns)) {
            //TODO generalize this into columns that are not to be worked on provided by sources
            if(column && column.id != tweeted.id && (await column.hasIssue(issue.number))) {
                return column;
            }
        }
        return null;
    }

    /**
     * @param {module:issue.Issue} issue - Issue to add to the default column.
     * @param {boolean} firstRun - If this is the first run.
     * @param {boolean} [isClosed=false] - Issue is closed.
     * @returns {module:tweet-card.TweetCard?} Created tweet card.
     */
    async addIssue(issue, firstRun, isClosed = false) {
        const columns = await this._repo.board.columns;
        for(const column of Object.values(columns)) {
            if(column && (await column.hasIssue(issue.number))) {
                return this._repo.board.addCard(issue, column, firstRun);
            }
        }
        if(!isClosed) {
            const ideas = await this.getColumn('target');
            // If the card is in no other column add it to the backlog.
            return this._repo.board.addCard(issue, ideas);
        }
    }
}
module.exports = IssuesSource;
