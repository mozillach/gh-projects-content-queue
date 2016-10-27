/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

const co = require("co");

const identity = (i) => i;
//TODO move this to the config, resp make columns optional etc.?
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

const ghClientPromise = (client, method, params) => {
    return new Promise((resolve, reject) => {
        client.repos[method](params, (err, res) => {
            if(err) {
                reject(err);
            }
            else {
                resolve(res);
            }
        });
    });
};

/**
 * Abstraction over the GitHub project.
 */
class Board {
    /**
     * @param {external:GitHubClient} githubClient - GitHub Client.
     * @param {Object} config - Config for the project board.
     * @constructs
     */
    constructor(githubClient, config) {
        this.githubClient = githubClient;
        this.config = config;
        this.columns = Object.assign(Object.assign({}, defaultColumnNames), config.columns);

        this.columnIds = {};
        for(const column in this.columns) {
            this.columnIds[column] = 0;
        }

        this.setup().catch((e) => console.error(e));
    }

    /**
     * Gets the ID of the project.
     *
     * @async
     * @returns {number}
     * @thows The project could not be found or another API error occured.
     */
    getBoardID() {
        if(!this.id) {
            return ghClientPromise(this.githubClient, "getProjects", {
                owner: this.config.owner,
                repo: this.config.repo
            }).then((res) => {
                const project = res.find((p) => p.name === this.config.projectName);
                if(project) {
                    this.id = project.number;
                    return project.number;
                }
                else {
                    throw "Project not found";
                }
            });
        }
        return Promise.resolve(this.id);
    }

    /**
     * Checks if the project exists.
     *
     * @async
     * @returns {boolean}
     */
    boardExists() {
        return this.getBoardID().then(() => true, () => false);
    }

    /**
     * Gets missing columns for the project.
     *
     * @async
     * @returns {Array.<string>}
     * @throws API error.
     */
    missingColumns() {
        let missingColumnsCount = 0;
        for(const columnId of Object.values(this.columnIds)) {
            if(columnId == 0) {
                ++missingColumnsCount;
            }
        }

        if(missingColumnsCount === 0) {
            return Promise.resolve([]);
        }
        else {
            return this.getBoardID().then((id) => {
                return ghClientPromise(this.githubClient, "getProjectColumns", {
                    owner: this.config.owner,
                    repo: this.config.repo,
                    number: id
                });
            }).then((res) => {
                const columnNames = res.map((column) => column.name);
                const missingColumns = [];

                for(const c in this.columns) {
                    const column = this.columns[c];
                    if(!columnNames.includes(column)) {
                        missingColumns.push(column);
                    }
                    else {
                        this.columnIds[c] = res[columnNames.indexOf(column)].id;
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
     * @returns {boolean}
     * @throws API error.
     */
    columnsExist() {
        this.missingColumns().then((missingColumns) => missingColumns.length === 0);
    }

    /**
     * Checks if the project is already setup.
     *
     * @async
     * @returns {boolean}
     */
    ready() {
        return Promise.all([
            this.boardExists(),
            this.columnsExist()
        ]).then((r) => r.every(identity));
    }

    /**
     * Creates the project board. Saves the id of the board.
     *
     * @async
     * @returns {undefined}
     * @throws API error.
     */
    createBoard() {
        return ghClientPromise(this.githubClient, "createProject", {
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
        return ghClientPromise(this.githubClient, "createProjectColumn", {
            owner: this.config.owner,
            repo: this.config.repo,
            number: this.id,
            name: name
        }).then((res) => {
            for(const gn in this.columns) {
                if(this.columns[gn] === name) {
                    this.columnIds[gn] = res.id;
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
                if(column in this.columnIds && this.columnIds[column] !== 0) {
                    let position = columnOrder[column];
                    if(position != "first" && position != "last") {
                        position = `after:${this.columnIds[position]}`;
                    }
                    yield ghClientPromise(this.githubClient, "moveProjectColumn", {
                        owner: this.config.owner,
                        repo: this.config.repo,
                        id: this.columnIds[column],
                        position
                    });
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
}

module.exports = Board;
