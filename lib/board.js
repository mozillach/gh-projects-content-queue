/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/**
 * @module board
 * @license MPL-2.0
 */
"use strict";

const Column = require("./column");
const Card = require("./card");
const DataStoreHolder = require("./data-store-holder");
const UpdateManager = require("./update-manager");
const { ProjectNotFoundError, NoProjectsError } = require("./board-errors");
const GitHubAccount = require("./accounts/github");

/**
 * Fetches all the columns in the project.
 *
 * @param {Object<module:column.Column>} [oldColumns={}] - Previous columns.
 * @async
 * @this module:board.Board
 * @returns {Object<module:column.Column>} New columns object.
 */
function fetchColumns(oldColumns = {}) {
    return this.getBoardID().then((id) => {
        return this.githubClient.projects.getProjectColumns({
            project_id: id
        });
    }).then((response) => {
        return GitHubAccount.pagination(this.githubClient, response);
    }).then((res) => {
        const columns = {};
        for(const column of res) {
            if(column.id in oldColumns) {
                columns[column.id] = oldColumns[column.id];
                //updates.push(columns[column.id].update());
            } else {
                columns[column.id] = new Column(this.githubClient, column.id, column.name, this.cards);
            }
        }
        return columns;
    });
}

/**
 * @this module:board.Board
 * @async
 * @returns {Object<string>} Column name to ID map.
 */
function buildColumnIds() {
    return this.columns.then((columns) => {
        const columnIds = {};
        for(const column of Object.values(columns)) {
            columnIds[column.name] = column.id;
        }
        return columnIds;
    });
}

/**
 * Fired when an issue is opened in the repo.
 *
 * @event module:board.Board#opened
 * @type {Issue}
 */

/**
 * Abstraction over the GitHub project.
 *
 * @alias module:board.Board
 * @extends module:data-store-holder.DataStoreHolder
 */
class Board extends DataStoreHolder {
    /**
     * @param {external:GitHub} githubClient - GitHub Client.
     * @param {module:config~Config} config - Config for the project board.
     * @fires module:board.Board#opened
     */
    constructor(githubClient, config) {
        super({
            columns: fetchColumns,
            columnIds: buildColumnIds
        });

        /**
         * @type {external:GitHub}
         */
        this.githubClient = githubClient;
        /**
         * @type {module:config~Config}
         */
        this.config = config;

        /**
         * All cards accross all columns, indexed by card id.
         *
         * @type {Map<number, odule:card.Card>}
         */
        this.cards = new Map();

        /**
         * @type {Promise}
         * @readonly
         */
        this.ready = this.setup().catch((e) => console.error("Board setup", e));
    }

    /**
     * Gets the ID of the project.
     *
     * @async
     * @returns {number} ID of the project.
     * @throws {module:board~ProjectNotFoundError|module:board~NoProjectsError}
     *         The project could not be found or another API error occured.
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
     * @returns {[string]} Columns that aren't in the project yet but are
     *                           required for the operation based on the config.
     */
    async missingColumns() {
        const missingColumns = new Set();
        const columnIds = await this.columnIds;
        for(const source of this.config.sources) {
            for(const c in source.columns) {
                const columnName = source.columns[c];
                if(!(columnName in columnIds)) {
                    missingColumns.add(columnName);
                }
            }
        }
        return Array.from(missingColumns.values());
    }

    /**
     * Checks if all the configured columns exist on GitHub.
     *
     * @async
     * @returns {boolean} Whether all required columns exist.
     * @throws {module:board~ProjectNotFoundError|module:board~NoProjectsError} API error.
     */
    columnsExist() {
        return this.missingColumns().then((missingColumns) => missingColumns.length === 0);
    }

    /**
     * Creates the project board. Saves the id of the board.
     *
     * @async
     * @returns {undefined}
     * @throws {module:board~ProjectNotFoundError|module:board~NoProjectsError} API error.
     */
    createBoard() {
        return this.githubClient.projects.createRepoProject({
            owner: this.config.owner,
            repo: this.config.repo,
            name: this.config.projectName,
            body: "Content Queue"
        }).then(({ data: res }) => {
            this.id = res.id;
        });
    }

    /**
     * Adds a column to the project and save its ID.
     *
     * @param {string} name - Name of the column to create.
     * @returns {undefined}
     * @throws {module:board~ProjectNotFoundError|module:board~NoProjectsError} API error.
     */
    async createColumn(name) {
        const res = await Column.create(this.githubClient, this.id, name, this.cards);
        const columns = await this.columns;
        columns[res.id] = res;
        const columnIds = await this.columnIds;
        columnIds[name] = res.id;
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

        UpdateManager.register(this);
    }

    /**
     * Adds a card to the incoming column from an existing issue.
     *
     * @param {module:issue.Issue} issue - Issue to add as card.
     * @param {module:column.Column} column - Column to add the card to. Defaults to the
     *                            ideas column.
     * @param {boolean} [localOnly=false] - If the card should only be added
     *                                      on the local column model.
     * @returns {module:card.Card} Card that was added to the column.
     */
    async addCard(issue, column, localOnly = false) {
        const card = await column.addCard(new Card(issue, this.config), localOnly);
        this.cards.set(card.id, card);
        return card;
    }

    /**
     * Moves a card to a different column.
     *
     * @param {module:card.Card} card - Card to move to a different column.
     * @param {module:column.Column} column - Column to move the card to.
     * @param {boolean} [localOnly=false] - If the card should only be moved locally.
     * @param {string} [insertionPoint="bottom"] - Where to insert the card in the
     *                                           column. top, bottom or after.
     * @returns {undefined}
     */
    async moveCardToColumn(card, column, localOnly = false, insertionPoint = "bottom") {
        if(!localOnly) {
            await this.githubClient.projects.moveProjectCard({
                card_id: card.id,
                position: insertionPoint,
                column_id: column.id
            });
        }

        if(card.column) {
            await card.column.removeCard(card, true, true);
        }
        await column.addCard(card, true);
    }
}

module.exports = Board;
