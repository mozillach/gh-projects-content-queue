/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

//TODO fill up cards -> make sure to get the issue from Issues so the data gets updated by memory magic.

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
        return client("projects", "createProjectColumn", {
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
        this.cards = new Set();
    }

    /**
     * Moves the column.
     *
     * @async
     * @param {string} position - The position to move the column to.
     * @returns {undefined}
     */
    move(position) {
        this.githubClient("projects", "moveProjectColumn", {
            owner: this.projectInfo.owner,
            repo: this.projectInfo.repo,
            id: this.id,
            position
        });
    }

    /**
     * Add a card to the column.
     *
     * @param {TweetCard} card - Card to add.
     * @param {boolean} [localOnly=false] - If the card should only be added
     *                                      on the local column model. Useful
     *                                      when filling in column content from
     *                                      other API endpoints.
     * @async
     * @returns {undefined}
     */
    addCard(card, localOnly = false) {
        if(!localOnly) {
            return this.githubClient("projects", "createProjectCard", {
                column_id: this.id,
                content_id: card.issue.id,
                content_type: 'Issue'
            }).then((res) => {
                card.id = res.id;
                this.cards.add(card);
            });
        }
        else if("id" in card) {
            this.cards.add(card);
            return Promise.resolve();
        }
        else {
            return Promise.reject("Card must have an ID");
        }
    }

    /**
     * Remove a card from the column.
     *
     * @param {TweetCard} card - Card to remove.
     * @param {boolean} [localOnly=false] - If the card should only be removed
     *                                     from the local column model. Useful
     *                                     when moving cards.
     * @async
     * @returns {undefined}
     */
    removeCard(card, localOnly = false) {
        if(!localOnly) {
            return this.githubClient("projects", "deleteProjectCard", {
                id: card.id
            }).then(() => {
                this.cards.delete(card);
            });
        }
        else {
            this.cards.delete(card);
            return Promise.resolve();
        }
    }

    /**
     * Checks if a card with the given issue ID is currently in the column.
     *
     * @param {number} issueId - Issue to check if it is in the column.
     * @returns {boolean} Whether the card is in the column.
     */
    hasCard(issueId) {
        return Array.from(this.cards.values()).some((card) => card.issue.id == issueId);
    }

    /**
     * Gets the card for the issue.
     *
     * @param {number} issueId - Issue to get the card for.
     * @returns {TweetCard} The card for the given issue.
     */
    getCard(issueId) {
        return Array.from(this.cards.values()).find((card) => card.issue.id == issueId);
    }
}

module.exports = Column;
