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
     * @async
     * @return {string} Markdown link to account
     */
    getAccountLink() {
        return Promise.reject("Account link not implemented for content account");
    }

    async checkPosts(column, markPublished) {
        throw new Error("No posts published by default content account");
    }

    isCardHighPrio(card) {
        return false;
    }

    /**
     * @param {Card} card - Card to publish.
     * @return {string} Success message.
     * @throws When something isn't right.
     */
    async publish(card) {
        throw new Error("Default content account can not publish");
    }
}
module.exports = ContentAccount;
