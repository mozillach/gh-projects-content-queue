/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

class Column {
    /**
     * Creates the column in the project.
     *
     * @async
     * @param {PromisifiedGitHub} client - Promisified GitHub client.
     * @param {Object} config - Project owner, repo and number.
     * @param {string} name - Name for the column.
     * @returns {Column} Created column instance.
     */
    static create(client, config, name) {
        return client("createProjectColumn", {
            owner: config.owner,
            repo: config.repo,
            number: config.id,
            name: name
        }).then((res) => {
            return new Column(client, res.id, config);
        });
    }

    /**
     * @param {PromisifiedGitHub} githubClient - Client to use.
     * @param {number} id - ID of the column.
     * @param {Object} config - Owner, repo and number of the project.
     * @constructs
     */
    constructor(githubClient, id, config) {
        this.githubClient = githubClient;
        this.id = id;
        this.config = config;
    }

    /**
     * Moves the column.
     *
     * @async
     * @param {string} position - The position to move the column to.
     * @returns {undefined}
     */
    move(position) {
        this.githubClient("moveProjectColumn", {
            owner: this.projectInfo.owner,
            repo: this.projectInfo.repo,
            id: this.id,
            position
        });
    }
}

module.exports = Column;
