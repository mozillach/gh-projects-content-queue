/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

//TODO get rid of built in columns and use sources instead. Main problem to solve here is how to sort those columns.

const Column = require("./column");
const TweetCard = require("./tweet-card");
const DataStoreHolder = require("./data-store-holder");

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
class NoProjectsError extends Error {
    /**
     * @param {string} owner - Owner of the repo.
     * @param {string} repo - Repo name.
     */
    constructor(owner, repo) {
        super(`No projects in repo ${owner}/${repo}`);
    }
}

/**
 * Fetches all the columns in the project.
 *
 * @param {Object.<string,Column>} [oldColumns={}] - Previous columns.
 * @async
 * @this Board
 * @returns {Object.<string,Column>} New columns object.
 */
function fetchColumns(oldColumns = {}) {
    return this.getBoardID().then((id) => {
        return this.githubClient.projects.getProjectColumns({
            owner: this.config.owner,
            repo: this.config.repo,
            project_id: id
        });
    }).then(({ data: res }) => {
        const columns = {};
        for(const c in res) {
            const column = res[c];
            if(column.id in oldColumns) {
                columns[column.id] = oldColumns[column.id];
                //updates.push(columns[column.id].update());
            } else {
                columns[column.id] = new Column(this.githubClient, column.id, column.name);
            }
        }
        return columns;
    });
}

/**
 * @this Board
 * @async
 * @returns {Object.<string,string>} Column name to ID map.
 */
function buildColumnIds() {
    return this.columns.then((columns) => {
        const builtinNames = Object.values(this.columnNames);
        const columnIds = {};
        for(const column of Object.values(columns)) {
            if(builtinNames.includes(column.name)) {
                let universalName;
                for(const n in this.columnNames) {
                    if(this.columnNames[n] === column.name) {
                        universalName = n;
                        break;
                    }
                }
                columnIds[universalName] = column.id;
                builtinNames.splice(builtinNames.indexOf(column.name), 1);
            }
        }
        for(const column in this.columnNames) {
            if(!(column in columnIds)) {
                columnIds[column] = 0;
            }
        }
        return columnIds;
    });
}

/**
 * Fired when an issue is opened in the repo.
 *
 * @event Board#opened
 * @type {Issue}
 */

/**
 * All the data for the board has been updated.
 *
 * @event Board#upadted
 */

/**
 * Abstraction over the GitHub project.
 */
class Board extends DataStoreHolder {
    /**
     * @param {external:GitHub} githubClient - GitHub Client.
     * @param {Object} config - Config for the project board.
     * @fires Board#opened
     * @constructs
     */
    constructor(githubClient, config) {
        super({
            columns: fetchColumns,
            columnIds: buildColumnIds
        });

        this.githubClient = githubClient;
        this.config = config;
        this.columnNames = Object.assign(Object.assign({}, defaultColumnNames), config.columns);

        this.ready = this.setup().catch((e) => console.error("Board setup", e));
    }

    /**
     * Updates all the things.
     *
     * @fires Board#updated
     * @returns {undefined}
     */
    async update() {
        await super.update();
        await this.syncCardsToColumns();
        this.emit("updated");
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
            return this.githubClient.projects.getRepoProjects({
                owner: this.config.owner,
                repo: this.config.repo
            }).then(({ data: res }) => {
                if(res.length) {
                    const project = res.find((p) => p.name === this.config.projectName);
                    if(project) {
                        this.id = project.id;
                        return project.id;
                    }
                    throw new ProjectNotFoundError(this.config.projectName);
                }
                throw new NoProjectsError(this.config.owner, this.config.repo);
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
            if(e instanceof ProjectNotFoundError || e instanceof NoProjectsError) {
                return false;
            }
            throw e;
        });
    }

    /**
     * Gets missing columns for the project.
     *
     * @returns {Array.<string>} Columns that aren't in the project yet but are
     *                           required for the operation based on the config.
     */
    async missingColumns() {
        const missingColumns = [];
        const columnIds = await this.columnIds;
        for(const c in columnIds) {
            if(columnIds[c] === 0) {
                missingColumns.push(this.columnNames[c]);
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
        return this.githubClient.projects.createRepoProject({
            owner: this.config.owner,
            repo: this.config.repo,
            name: this.config.projectName,
            body: "Twitter Content Queue"
        }).then(({ data: res }) => {
            this.id = res.number;
        });
    }

    /**
     * Adds a column to the project and save its ID.
     *
     * @param {string} name - Name of the column to create.
     * @returns {undefined}
     * @throws API error.
     */
    async createColumn(name) {
        const res = await Column.create(this.githubClient, this.id, name);
        for(const gn in this.columnNames) {
            if(this.columnNames[gn] === name) {
                const columnIds = await this.columnIds;
                columnIds[gn] = res.id;
                break;
            }
        }
        const columns = await this.columns;
        columns[res.id] = res;
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
        const columnIds = await this.columnIds;
        for(const column in columnOrder) {
            if(column in columnIds && columnIds[column] !== 0) {
                let position = columnOrder[column];
                if(position != "first" && position != "last") {
                    position = `after:${columnIds[position]}`;
                }
                const columns = await this.columns;
                await columns[columnIds[column]].move(position);
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

        const missingColumns = await this.missingColumns();

        await Promise.all(missingColumns.map((column) => {
            return this.createColumn(column);
        }));

        if(missingColumns.length > 0) {
            await this.arrangeColumns();
        }

        const columns = await this.columns;

        return Promise.all(Array.from(Object.values(columns), (c) => c.ready));
    }

    /**
     * Adds a card to the incoming column from an existing issue.
     *
     * @param {Issue} issue - Issue to add as card.
     * @param {Column} [column] - Column to add the card to. Defaults to the
     *                            ideas column.
     * @param {boolean} [localOnly=false] - If the card should only be added
     *                                      on the local column model.
     * @returns {Card} Card that was added to the column.
     */
    async addCard(issue, column, localOnly = false) {
        if(!column) {
            const [ columns, columnIds ] = await Promise.all([
                this.columns,
                this.columnIds
            ]);
            column = columns[columnIds.ideas];
        }

        return column.addCard(new TweetCard(issue, this.config), localOnly);
    }

    /**
     * Moves a card to a different column.
     *
     * @param {Card} card - Card to move to a different column.
     * @param {Column} column - Column to move the card to.
     * @param {boolean} [localOnly=false] - If the card should only be moved locally.
     * @param {string} [insertionPoint="last"] - Where to insert the card in the
     *                                           column. top, bottom or after.
     * @returns {undefined}
     */
    async moveCardToColumn(card, column, localOnly = false, insertionPoint = "bottom") {
        if(!localOnly) {
            await this.githubClient.projects.moveProjectCard({
                id: card.id,
                position: insertionPoint,
                column_id: column.id
            });
        }

        const columns = await this.columns;
        for(const col of Object.values(columns)) {
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
    async syncCardsToColumns() {
        const columns = Object.values(await this.columns);
        for(const column of columns) {
            const issues = await column.issues;
            for(const i in issues) {
                const card = issues[i];
                if(!column.hasGithubCardId(card.id)) {
                    for(const col of columns) {
                        if(col.id != column.id && col.hasGithubCardId(card.id)) {
                            this.moveCardToColumn(col.getCardById(card.id), column, true);
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
     * @param {string} url - URL to the tweet.
     * @returns {undefined}
     */
    async cardTweeted(card, url) {
        let successMsg = "Successfully tweeted. See " + url;
        if(card.content.isRetweet) {
            successMsg = "Successfully retweeted.";
        }
        const [ columns, columnIds ] = await Promise.all([
            this.columns,
            this.columnIds
        ]);
        return Promise.all([
            card.issue.close(),
            this.moveCardToColumn(card, columns[columnIds.tweeted], false, "top"),
            card.comment(successMsg)
        ]);
    }
}

module.exports = Board;
