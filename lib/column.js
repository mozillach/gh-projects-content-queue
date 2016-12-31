/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

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
        this.issues = {};

        this.fetchCards().catch(console.error);
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
     * Add a card to the column. Checks if the card is already in the column and
     * adds it remotely if not.
     *
     * @param {TweetCard} card - Card to add.
     * @param {boolean} [localOnly=false] - If the card should only be added
     *                                      on the local column model.
     * @returns {undefined}
     */
    async addCard(card, localOnly = false) {
        if(!this.hasCard(card.issue.id)) {
            if(!(await this.hasIssue(card.issue.number))) {
                if(!localOnly) {
                    const res = await this.githubClient("projects", "createProjectCard", {
                        column_id: this.id,
                        content_id: card.issue.id,
                        content_type: 'Issue'
                    });
                    card.id = res.id;
                    this.cards.add(card);
                    this.issues[card.issue.number] = card;
                }
                else if("id" in card) {
                    this.cards.add(card);
                }
                else {
                    throw "Card must have an ID";
                }
            }
            else {
                card.id = this.issues[card.issue.number].id;
                this.cards.add(card);
            }
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
     * @param {string} position - Can be top, bottom and after:cardId.
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
     * Checks all cards in this column for validity.
     *
     * @returns {undefined}
     */
    checkCards() {
        for(const card of this.cards.values()) {
            card.checkValidity();
        }
    }

    /**
     * Fetches all cards from the remote column.
     *
     * @async
     * @returns {undefined}
     * @todo paginate!
     */
    fetchCards()
    {
        return this.githubClient("projects", "getProjectCards", {
            column_id: this.id
        }).then((response) => {
            const issueRegExp = /\/(?:issue|pull-request)s\/(\d+)$/;
            let buf;
            this.issues = {};
            for(const card in response) {
                if(card != "meta") {
                    buf = issueRegExp.exec(response[card].content_url);
                    if(buf !== null && buf.length > 0) {
                        this.issues[buf[1]] = response[card];
                    }
                }
            }
        });
    }

    /**
     * Checks if an issue is already in this column.
     *
     * @param {number} issueNumber - ID of the issue to check.
     * @returns {boolean} If the issue is found in this column.
     */
    async hasIssue(issueNumber) {
        if(Array.from(Object.keys(this.issues)).length == 0) {
            await this.fetchCards();
        }
        return issueNumber in this.issues;
    }
}

module.exports = Column;
