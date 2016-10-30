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
        this.checkValidity();
    }

    /**
     * Checks the card for its validity and sets the relevant labels.
     *
     * @returns {undefined}
     */
    checkValidity() {
        const contentErrors = this.content.getCardError();
        if(contentError) {
            this.reportErrors(contentErrors);

            this.issue.addLabel(this.config.labels.invalid);
            this.issue.removeIssue(this.config.labels.ready);
        }
        if(this.content.isRetweet &&
           !this.issue.hasLabel(this.config.labels.retweet)) {
            this.issue.addLabel(this.config.labels.retweet);
        }
    }

    /**
     * Post a comment to remind the assignee to work on the card.
     *
     * @async
     * @returns {undefined}
     */
    remindAssignee() {
        const left = "2 days";
        return this.comment(`:bell: Hey @${this.issue.assignee}, there's only ${left} until this tweet will be tweeted`);
    }

    /**
     * Assign a user to be responsible for this card.
     *
     * @param {string} user - User to assign.
     * @async
     * @returns {undefined}
     */
    assign(user) {
        this.issue.assign(user);
    }

    /**
     * Report an error that happened with this card. Posts a comment on the
     * issue.
     *
     * @async
     * @param {Array.<string>} errors - Errors to report.
     * @returns {undefined}
     */
    reportErrors(errors) {
        //TODO add some error info test and emoji stuff
        return this.comment(`:warn: Some actions have to be taken before this tweet is ready:

${errors.map((e) => " - "+e+"\n"}`);
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
