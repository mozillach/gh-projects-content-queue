/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

const TweetCard = require("./tweet-card");

//TODO some way of getting ordered cards, or the topmost etc. (to tweet the one first in queue)

/**
 * Manages the cards within one column in a board. Does not handle added issues
 * itself, as it assumes all issues will be added to a column by this program,
 * except for moved cards which have to be handled at a higher level.
 */
class Column {
    /**
     * Creates the column in the project.
     *
     * @async
     * @param {PromisifiedGitHub} client - Promisified GitHub client.
     * @param {number} projectId - ID of the project to add the column to.
     * @param {string} name - Name for the column.
     * @returns {Column} Created column instance.
     */
    static create(client, projectId, name) {
        return client("projects", "createProjectColumn", {
            project_id: projectId,
            name: name
        }).then((res) => {
            return new Column(client, res.id);
        });
    }

    /**
     * @param {PromisifiedGitHub} githubClient - Client to use.
     * @param {number} id - ID of the column.
     * @constructs
     */
    constructor(githubClient, id) {
        this.githubClient = githubClient;
        this.id = id;
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
        return this.githubClient("projects", "moveProjectColumn", {
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

    /**
     * Moves the card within the column.
     *
     * @param {TweetCard} card - Card to move.
     * @param {string} position - Can be first, last and after:cardId.
     * @async
     * @returns {undefined}
     */
    moveCard(card, position) {
        return this.githubClient("projects", "moveProjectCard", {
            id: card.id,
            position
        });
    }

    /**
     * Add all existing cards.
     *
     * @param {Issues} issues - Issues list to create cards with.
     * @param {Object} config - Config to create cards with.
     * @async
     * @returns {undefined}
     */
    loadCards(issues, config) {
        return this.githubClient("projects", "getColumnCards", {
            column_id: this.id
        }).then((cards) => {
            for(const c in cards) {
                // Skip request info
                if(c == "meta") {
                    continue;
                }

                console.log(cards[c]);
                const issueNo = parseInt(cards[c].content_url.split("/").pop(), 10);
                const card = new TweetCard(issues.issues.get(issueNo), config);
                card.id = cards[c].id;
                this.addCard(card);
            }
        });
    }

    /**
     * Checks all cards in this column for validity.
     *
     * @returns {undefined}
     */
    checkCards() {
        for(const card of this.cards.entries()) {
            card.checkValidity();
        }
    }
}

module.exports = Column;
