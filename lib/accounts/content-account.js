/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

const Formatter = require("../formatters/formatter");
const Validator = require("../validators/validator");
const DataStoreHolder = require("../data-store-holder");

class ContentAccount extends DataStoreHolder {
    static get Formatter() {
        return Formatter;
    }

    static get Validator() {
        return Validator;
    }

    static get TYPE() {
        return this.Formatter.TYPE;
    }

    static GetContentSection(card) {
        for(const section of this.Formatter.CONTENT_SECTIONS) {
            if(card.content.hasSection(section)) {
                return card.content.getSection(section);
            }
        }
        throw new Error("Card has no content");
    }

    /**
     * Used to build a list of accounts used in a repository in the readme.
     *
     * @async
     * @return {string} Markdown link to account.
     */
    getAccountLink() {
        return Promise.reject("Account link not implemented for content account");
    }

    /**
     * Called by the publish source when setting up to remove cards that have already
     * been published on this account.
     *
     * @param {Column} column - Source column that potential posts are in.
     * @param {function} markPublished - Callback to mark a card as already published not by the service.
     */
    async checkPosts(column, markPublished) { // eslint-disable-line no-unused-vars
        throw new Error("No posts published by default content account");
    }

    /**
     * Publishing cards happens in two priorities - high and low priority. Scheduled
     * cards have a higher priority by default. High priority cards ignore the scheduling
     * times set for the publish source. By returning true from this methods,
     * other cards can be marked as high priority. High priority cards marked by
     * this method are also not counted toward the post limit per slot.
     *
     * @example Twitter returns true for replies, so they are immediately published.
     * @param {Card} card - Card to evaluate for high priority.
     * @return {boolean} If the card is high priority.
     */
    isCardHighPrio(card) { // eslint-disable-line no-unused-vars
        return false;
    }

    /**
     * Publish a card on the account.
     *
     * @param {Card} card - Card to publish.
     * @return {string} Success message.
     * @throws When something isn't right.
     */
    async publish(card) { // eslint-disable-line no-unused-vars
        throw new Error("Default content account can not publish");
    }
}
module.exports = ContentAccount;
