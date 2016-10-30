/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

//TODO moving cards and pulling in moved card
//TODO ability to dynamically add required columns from plugins

const co = require("co");
const Column = require("./column");
const Issues = require("./issues");
const TweetCard = require("./tweet-card");

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
class Board {
    /**
     * @param {PromisifiedGitHub} githubClient - GitHub Client.
     * @param {Object} config - Config for the project board.
     * @constructs
     */
    constructor(githubClient, config) {
        this.githubClient = githubClient;
        this.config = config;
        this.columns = Object.assign(Object.assign({}, defaultColumnNames), config.columns);

        this.columnInstances = {};
        for(const column in this.columns) {
            this.columnInstances[column] = null;
        }

        this.setup().then(() => {
            this.issues = new Issues(githubClient, config);

            this.issues.on("opened", (issue) => {
                if(this.columnInstances.ideas) {
                    this.columnInstances.ideas.addCard(new TweetCard(issue, config));
                }
            });

            this.issues.on("updated", (issue) => {
                for(const column of this.columnInstances) {
                    if(column && column.hasCard(issue.id)) {
                        this.columnInstances.getCard(issue.id).checkValidity();
                    }
                }
            });

            this.issues.on("closed", (issue) => {
                for(const column of this.columnInstances) {
                    if(column && column.hasCard(issue.id)) {
                        this.columnInstances.removeCard(this.columnInstances.getCard(issue.id));
                        break;
                    }
                }
            });

            return this.initializeColumns(this.issues, config);
        }).catch((e) => console.error(e));
    }

    /**
     * Gets the ID of the project.
     *
     * @async
     * @returns {number} ID of the project.
     * @thows The project could not be found or another API error occured.
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
     * Gets missing columns for the project.
     *
     * @async
     * @returns {Array.<string>} Columns that aren't in the project yet but are
     *                           required for the operation based on the config.
     * @throws API error.
     */
    missingColumns() {
        let missingColumnsCount = 0;
        for(const column of Object.values(this.columnInstances)) {
            if(column === null) {
                ++missingColumnsCount;
            }
        }

        if(missingColumnsCount === 0) {
            return Promise.resolve([]);
        }
        else {
            return this.getBoardID().then((id) => {
                return this.githubClient("projects", "getProjectColumns", {
                    owner: this.config.owner,
                    repo: this.config.repo,
                    project_id: id
                });
            }).then((res) => {
                const columnNames = res.map((column) => column.name);
                const missingColumns = [];

                for(const c in this.columns) {
                    // Skip request info.
                    if(c == "meta") {
                        continue;
                    }
                    const column = this.columns[c];
                    if(!columnNames.includes(column)) {
                        missingColumns.push(column);
                    }
                    else {
                        this.columnInstances[c] = new Column(this.githubClient, res[columnNames.indexOf(column)].id);
                    }
                }

                return missingColumns;
            });
        }
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
            for(const gn in this.columns) {
                if(this.columns[gn] === name) {
                    this.columnInstances[gn] = res;
                    break;
                }
            }
        });
    }

    /**
     * Arranges the columns in a sensible order. Moves the input columns to the
     * left and the output columns to the right.
     *
     * @todo Fix after:id placement
     * @todo Last seems broken on GitHub's side.
     * @async
     * @returns {undefined}
     * @throws API error.
     */
    arrangeColumns() {
        return co(function* () {
            for(const column in columnOrder) {
                if(column in this.columnInstances && this.columnInstances[column] !== null) {
                    let position = columnOrder[column];
                    if(position != "first" && position != "last") {
                        position = `after:${this.columnInstances[position].id}`;
                    }
                    yield this.columnInstances[column].move(position);
                }
            }
        }.bind(this));
    }

    /**
     * Creates a project and the required columns.
     *
     * @async
     * @returns {undefined}
     */
    setup() {
        return co(function*() {
            if(!(yield this.boardExists())) {
                yield this.createBoard();
            }

            const missingColumns = yield this.missingColumns();

            yield Promise.all(missingColumns.map((column) => {
                return this.createColumn(column);
            }));

            if(missingColumns.length > 0) {
                yield this.arrangeColumns();
            }
        }.bind(this));
    }

    /**
     * Loads all the cards into the columns and makes sure they're linked up
     * with their issue representation.
     *
     * @param {Issues} issues - Issues list to create the cards with.
     * @async
     * @returns {undefined}
     */
    initializeColumns(issues) {
        return Promise.all(this.columnInstances.map((column) => {
            return column.loadCards(issues);
        }));
    }
}

module.exports = Board;
