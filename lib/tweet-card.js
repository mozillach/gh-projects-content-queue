/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

const TweetCardContent = require("./tweet-card-content");

class TweetCard {
    /**
     * @param {Issue} issue - GitHub issue.
     * @param {Object} config - Project configuration.
     */
    constructor(issue, config) {
        this.issue = issue;
        this.config = config;
        this._content = new TweetCardContent(issue.content);
    }

    /**
     * Unique ID of the card on GitHub.
     *
     * @type {number}
     */
    get id() {
        return this.issue.id;
    }

    /**
     * Checks the card for its validity and sets the relevant labels.
     *
     * @async
     * @returns {undefined}
     */
    checkValidity() {
        const contentError = this.content.getCardError();
        if(contentError) {
            this.reportError(contentError);
        }

        //TODO set ready/invalid labels
        //TODO set retweet label
    }

    /**
     * Post a comment to remind the assignee to work on the card.
     *
     * @async
     * @returns {undefined}
     */
    remindAssignee() {
        return this.comment();
    }

    /**
     * Assign a user to be responsible for this card.
     *
     * @param {string} user - User to assign.
     * @async
     * @returns {undefined}
     */
    assign(user) {
    }

    /**
     * Report an error that happened with this card. Posts a comment on the
     * issue.
     *
     * @async
     * @param {string} error - Error to report.
     * @returns {undefined}
     */
    reportError(error) {
        //TODO add some error info test and emoji stuff
        return this.comment(error);
    }

    /**
     * Posts a comment on the issue.
     *
     * @param {string} msg - Comment to post.
     * @async
     * @returns {undefined}
     */
    comment(msg) {
        return this.issue.comment(msg);
    }

    /**
     * @type {TweetCardContent}
     */
    get content() {
        return this._content;
    }

    /**
     * Saves the content from the TweetCardContent to GitHub.
     *
     * @returns {undefined}
     */
    flushContent() {
        this.issue.content = this._content.raw;
    }
}

module.exports = TweetCard;
