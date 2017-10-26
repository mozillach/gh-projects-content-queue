/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/**
 * @module column
 * @license MPL-2.0
 * @todo some way of getting ordered cards, or the topmost etc. (to tweet the one first in queue)
 */
"use strict";

const DataStoreHolder = require("./data-store-holder");
const pagination = require("./pagination");


/**
 * Fetches all cards from the remote column.
 *
 * @this module:column.Column
 * @returns {Object<Object>} New issues.
 */
async function fetchCards() {
    const res = await this.githubClient.projects.getProjectCards({
        column_id: this.id
    });
    const response = await pagination.github(this.githubClient, res);
    const issueRegExp = /\/(?:issue|pull-request)s\/(\d+)$/;
    let buf;
    const issues = {};
    for(const card in response) {
        buf = issueRegExp.exec(response[card].content_url);
        if(buf !== null && buf.length > 0) {
            issues[buf[1]] = response[card];
        }
    }
    return issues;
}

/**
 * @this module:column.Column
 * @param {Set<module:tweet-card.TweetCard>} [cards=new Set()] - Cards that are alread in the column.
 * @returns {Set<module:tweet-card.TweetCard>} Cards currently in the column.
 */
async function syncCards(cards = new Set()) {
    const issues = await this.issues;
    await Promise.all(Array.from(cards.values(), async (card) => {
        if(!(await this.hasIssue(card.issue.number))) {
            cards.delete(card);
            if(card.column === this) {
                card.column = undefined;
                //TODO this leaks cards that were manually removed from the board.
            }
        }
    }));

    await this.allCards.ready;

    const cardArray = Array.from(cards.values(), (card) => card.id);
    for(const i in issues) {
        const card = issues[i];
        if(!this.hasGithubCardId(card.id) || !cardArray.includes(card.id)) {
            const cardInstance = this.allCards.get(card.id);
            if(cardInstance) {
                cardInstance.column = this;
                cards.add(cardInstance);
            }
        }
    }

    return cards;
}

/**
 * Manages the cards within one column in a board. Does not handle added issues
 * itself, as it assumes all issues will be added to a column by this program,
 * except for moved cards which have to be handled at a higher level.
 *
 * @alias module:column.Column
 * @extends module:data-store-holder.DataStoreHolder
 */
class Column extends DataStoreHolder {
    /**
     * Creates the column in the project.
     *
     * @async
     * @param {external:GitHub} client - Promisified GitHub client.
     * @param {number} projectId - ID of the project to add the column to.
     * @param {string} name - Name for the column.
     * @param {Map<number, module:tweet-card.TweetCard>} cards - All cards on the board.
     * @returns {module:column.Column} Created column instance.
     */
    static create(client, projectId, name, cards) {
        return client.projects.createProjectColumn({
            project_id: projectId,
            name
        }).then(({ data: res }) => {
            return new Column(client, res.id, name, cards);
        });
    }

    /**
     * @param {external:GitHub} githubClient - Client to use.
     * @param {number} id - ID of the column.
     * @param {string} name - Name of the column.
     * @param {Map<number, module:tweet-card.TweetCard>} cards - All cards on the board.
     */
    constructor(githubClient, id, name, cards) {
        super({
            issues: fetchCards,
            cards: syncCards
        });
        /**
         * @type {external:GitHub}
         */
        this.githubClient = githubClient;
        /**
         * @type {number}
         */
        this.id = id;
        /**
         * @type {string}
         */
        this.name = name;
        /**
         * @type {Map<number, module:tweet-card.TweetCard>}
         */
        this.allCards = cards;
    }

    /**
     * Moves the column.
     *
     * @async
     * @param {string} position - The position to move the column to.
     * @returns {undefined}
     */
    move(position) {
        return this.githubClient.projects.moveProjectColumn({
            id: this.id,
            position
        });
    }

    /**
     * Add a card to the column. Checks if the card is already in the column and
     * adds it remotely if not.
     *
     * @param {module:tweet-card.TweetCard} card - Card to add.
     * @param {boolean} [localOnly=false] - If the card should only be added
     *                                      on the local column model.
     * @returns {module:tweet-card.TweetCard} Instance of the added card.
     */
    async addCard(card, localOnly = false) {
        if(card.column !== this) {
            if(!(await this.hasIssue(card.issue.number))) {
                if(!localOnly) {
                    const { data: res } = await this.githubClient.projects.createProjectCard({
                        column_id: this.id,
                        content_id: card.issue.id,
                        content_type: 'Issue'
                    });
                    card.id = res.id;
                    const issues = await this.issues;
                    issues[card.issue.number] = res;
                }
                else if(!("id" in card)){
                    throw new Error("Card must have an ID");
                }
                // Not adding the card to the issue number map, as that map is based on the remote state, while cards is based on the local state.
            }
            else {
                const issues = await this.issues;
                card.id = issues[card.issue.number].id;
            }
            card.column = this;
            if(this.allCards.isReady) {
                const cards = await this.cards;
                cards.add(card);
            }
        }
        return card;
    }

    /**
     * Remove a card from the column.
     *
     * @param {module:tweet-card.TweetCard} card - Card to remove.
     * @param {boolean} [localOnly=false] - If the card should only be removed
     *                                     from the local column model. Useful
     *                                     when moving cards.
     * @param {boolean} [keepCard=false] - If a reference to the card should be
     *                                     kept. i.e if the card will be used in
     *                                     another column.
     * @returns {undefined}
     */
    async removeCard(card, localOnly = false, keepCard = false) {
        if(!localOnly) {
            await this.githubClient.projects.deleteProjectCard({
                id: card.id
            });
        }
        const cards = await this.cards;
        cards.delete(card);
        if(!keepCard) {
            this.allCards.delete(card.id);
        }
        else if(card.column === this) {
            card.column = undefined;
        }
    }

    /**
     * Gets the card for the issue.
     *
     * @param {number} issueId - Issue to get the card for.
     * @returns {module:tweet-card.TweetCard} The card for the given issue.
     */
    async getCard(issueId) {
        const cards = await this.cards;
        return Array.from(cards.values()).find((card) => card.issue.id == issueId);
    }

    /**
     * Moves the card within the column.
     *
     * @param {module:tweet-card.TweetCard} card - Card to move.
     * @param {string} position - Can be top, bottom and after:cardId.
     * @async
     * @returns {undefined}
     */
    moveCard(card, position) {
        return this.githubClient.projects.moveProjectCard({
            id: card.id,
            position
        });
    }

    /**
     * Checks all cards in this column for validity.
     *
     * @returns {undefined}
     */
    async checkCards() {
        const cards = await this.cards;
        for(const card of cards.values()) {
            card.checkValidity();
        }
    }

    /**
     * Checks if an issue is already in this column.
     *
     * @param {number} issueNumber - ID of the issue to check.
     * @returns {boolean} If the issue is found in this column.
     */
    async hasIssue(issueNumber) {
        return issueNumber in (await this.issues);
    }

    /**
     * @param {number} cardId - ID of the card to search.
     * @returns {boolean} If the card is in this column.
     */
    hasGithubCardId(cardId) {
        return this.allCards.has(cardId) && this.allCards.get(cardId).column === this;
    }

    /**
     * @param {number} cardId - ID of the card to return.
     * @returns {module:tweet-card.TweetCard?} If a card is found it is returned.
     */
    getCardById(cardId) {
        const card = this.allCards.get(cardId);
        if(card && card.column === this) {
            return card;
        }
        return null;
    }
}

module.exports = Column;
