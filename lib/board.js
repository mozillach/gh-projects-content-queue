/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

//TODO ability to dynamically add required columns from plugins

const Column = require("./column");
const Issues = require("./issues");
const TweetCard = require("./tweet-card");
const EventEmitter = require("events");

const defaultColumnNames = {
    ideas: "Ideas",
    reactions: "Needs Reaction",
    events: "Events",
    toTweet: "To Tweet",
    tweeted: "Tweeted"
};

/**
 * Used in arrangeColumns. Internal column names get converted to
 * after:columnName, except that after is currently broken.
 *
 * @type {Object.<string, string>}
 * @readonly
 */
const columnOrder = {
    toTweet: "last",
    tweeted: "last",
    events: "first",
    reactions: "first",
    ideas: "first",
};

class ProjectNotFoundError extends Error {
    /**
     * @param {string} projectName - Name of the project that was not found.
     */
    constructor(projectName) {
        super(`Could not find project ${projectName}`);
    }
}

/**
 * Abstraction over the GitHub project.
 */
class Board extends EventEmitter {
    /**
     * @param {PromisifiedGitHub} githubClient - GitHub Client.
     * @param {Object} config - Config for the project board.
     * @constructs
     */
    constructor(githubClient, config) {
        super();

        this.githubClient = githubClient;
        this.config = config;
        this.columnNames = Object.assign(Object.assign({}, defaultColumnNames), config.columns);
        this.columns = {};
        this.columnIds = {};
        for(const column in this.columnNames) {
            this.columnIds[column] = 0;
        }

        let firstRun = true;

        this.updateInterval = setInterval(() => {
            firstRun = false;
            this.update().then(() => this.syncCardsToColumns()).then(() => {
                this.emit("updated");
                //TODO ensure the issue events are all done?
            }).catch(console.error);
        }, 60000);

        this.setup().then(() => {
            this.issues = new Issues(githubClient, config);

            // Boards will be filled via this event handler, as that's how the
            // initial issue load works.
            this.issues.on("opened", async (issue) => {
                for(const column of Object.values(this.columns)) {
                    if(column && (await column.hasIssue(issue.number))) {
                        return column.addCard(new TweetCard(issue, config), firstRun);
                    }
                }
                if(this.columnIds.ideas !== 0) {
                    return this.columns[this.columnIds.ideas].addCard(new TweetCard(issue, config));
                }
            });

            this.issues.on("updated", (issue) => {
                for(const column of Object.values(this.columns)) {
                    if(column && column.hasCard(issue.id) && column.id != this.columnIds.tweeted) {
                        column.getCard(issue.id).checkValidity();
                        break;
                    }
                }
            });

            this.issues.on("closed", (issue) => {
                for(const column of Object.values(this.columns)) {
                    if(column && column.hasCard(issue.id)) {
                        column.removeCard(this.columnInstances.getCard(issue.id));
                        break;
                    }
                }
            });
        }).catch((e) => console.error(e));
    }

    /**
     * Updates all the things.
     *
     * @async
     * @returns {undefined}
     */
    update() {
        const promises = [];
        promises.push(this.issues.fetchOpenIssues());
        for(const column of Object.values(this.columns)) {
            promises.push(column.fetchCards());
        }
        return Promise.all(promises);
    }

    /**
     * Gets the ID of the project.
     *
     * @async
     * @returns {number} ID of the project.
     * @throws The project could not be found or another API error occured.
     */
    getBoardID() {
        if(!this.id) {
            return this.githubClient("projects", "getRepoProjects", {
                owner: this.config.owner,
                repo: this.config.repo
            }).then((res) => {
                const project = res.find((p) => p.name === this.config.projectName);
                if(project) {
                    this.id = project.id;
                    return project.id;
                }
                else {
                    throw new ProjectNotFoundError(this.config.projectName);
                }
            });
        }
        return Promise.resolve(this.id);
    }

    /**
     * Checks if the project exists.
     *
     * @async
     * @returns {boolean} Whether the board exists.
     */
    boardExists() {
        return this.getBoardID().then(() => true, (e) => {
            if(e instanceof ProjectNotFoundError) {
                return false;
            }
            throw e;
        });
    }

    /**
     * Fetches all the columns in the project.
     *
     * @async
     * @returns {undefined}
     */
    fetchColumns() {
        return this.getBoardID().then((id) => {
            return this.githubClient("projects", "getProjectColumns", {
                owner: this.config.owner,
                repo: this.config.repo,
                project_id: id
            });
        }).then((res) => {
            const builtinNames = Object.values(this.columnNames);
            for(const c in res) {
                if(c === "meta") {
                    continue;
                }
                const column = res[c];
                this.columns[column.id] = new Column(this.githubClient, column.id);

                if(builtinNames.includes(column.name)) {
                    let universalName;
                    for(const n in this.columnNames) {
                        if(this.columnNames[n] === column.name) {
                            universalName = n;
                            break;
                        }
                    }
                    this.columnIds[universalName] = column.id;
                }
            }
        });
    }

    /**
     * Gets missing columns for the project.
     *
     * @returns {Array.<string>} Columns that aren't in the project yet but are
     *                           required for the operation based on the config.
     */
    missingColumns() {
        const missingColumns = [];
        for(const c in this.columnIds) {
            if(this.columnIds[c] === 0) {
                missingColumns.push(c);
            }
        }
        return missingColumns;
    }

    /**
     * Checks if all the configured columns exist on GitHub.
     *
     * @async
     * @returns {boolean} Whether all required columns exist.
     * @throws API error.
     */
    columnsExist() {
        this.missingColumns().then((missingColumns) => missingColumns.length === 0);
    }

    /**
     * Creates the project board. Saves the id of the board.
     *
     * @async
     * @returns {undefined}
     * @throws API error.
     */
    createBoard() {
        return this.githubClient("projects", "createRepoProject", {
            owner: this.config.owner,
            repo: this.config.repo,
            name: this.config.projectName,
            body: "Twitter Content Queue"
        }).then((res) => {
            this.id = res.number;
        });
    }

    /**
     * Adds a column to the project and save its ID.
     *
     * @param {string} name - Name of the column to create.
     * @async
     * @returns {undefined}
     * @throws API error.
     */
    createColumn(name) {
        return Column.create(this.githubClient, this.id, name).then((res) => {
            for(const gn in this.columnNames) {
                if(this.columnNames[gn] === name) {
                    this.columnIds[gn] = res.id;
                    break;
                }
            }
            this.columns[res.id] = res;
        });
    }

    /**
     * Arranges the columns in a sensible order. Moves the input columns to the
     * left and the output columns to the right.
     *
     * @todo Fix after:id placement
     * @todo Last seems broken on GitHub's side.
     * @returns {undefined}
     * @throws API error.
     */
    async arrangeColumns() {
        for(const column in columnOrder) {
            if(column in this.columnIds && this.columnIds[column] !== 0) {
                let position = columnOrder[column];
                if(position != "first" && position != "last") {
                    position = `after:${this.columnIds[position]}`;
                }
                await this.columns[this.columnIds[column]].move(position);
            }
        }
    }

    /**
     * Creates a project and the required columns.
     *
     * @returns {undefined}
     */
    async setup() {
        if(!(await this.boardExists())) {
            await this.createBoard();
        }

        await this.fetchColumns();

        const missingColumns = this.missingColumns();

        await Promise.all(missingColumns.map((column) => {
            return this.createColumn(column);
        }));

        if(missingColumns.length > 0) {
            await this.arrangeColumns();
        }
    }

    /**
     * Creates a card in the incoming column.
     *
     * @param {TweetCard} card - Card to add.
     * @async
     * @returns {undefined}
     */
    createCard(card) {
        if(!(card instanceof TweetCard)) {
            return Promise.reject("Card must be instance of TweetCard");
        }

        return this.issues.createIssue(card.issue).then(() => {
            return this.columns[this.columnIds.reactions].addCard(card);
        }).then(() => {
            card.checkValidity();
        });
    }

    /**
     * Moves a card to a different column.
     *
     * @param {Card} card - Card to move to a different column.
     * @param {Column} column - Column to move the card to.
     * @param {boolean} [localOnly=false] - If the card should only be moved locally.
     * @param {string} [insertionPoint="last"] - Where to insert the card in the
     *                                           column.
     * @returns {undefined}
     */
    async moveCardToColumn(card, column, localOnly = false, insertionPoint = "last") {
        if(!localOnly) {
            await this.githubClient("projects", "moveProjectCard", {
                id: card.id,
                position: insertionPoint,
                column_id: column.id
            });
        }

        for(const col of this.columns) {
            if(col.hasCard(card.issue.id)) {
                col.removeCard(card, true);
                break;
            }
        }
        column.addCard(card, true);
    }

    /**
     * Syncs the cards to the columns they're actually in. Relies on the
     * information stored within the columns themselves.
     *
     * @returns {undefined}
     */
    syncCardsToColumns() {
        for(const column of this.columns) {
            for(const i in column.issues) {
                const issue = column.issues[i];
                if(!column.hasCard(issue.id)) {
                    for(const col of this.columns) {
                        if(col.id != column.id && col.hasCard(issue.id)) {
                            this.moveCardToColumn(col.getCard(issue.id), column, true);
                        }
                    }
                }
            }
        }
    }

    /**
     * Moves a card to the tweeted column and closes the issue.
     *
     * @param {Card} card - Card to mark as tweeted.
     * @async
     * @returns {undefined}
     */
    cardTweeted(card) {
        return Promise.all([
            card.issue.close(),
            this.moveCardToColumn(card, this.columns[this.columnIds.tweeted], false, "first")
        ]);
    }
}

module.exports = Board;
