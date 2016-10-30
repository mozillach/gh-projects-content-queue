/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

const twitter = require("twitter-text");

const createSection = (title, content) => `## ${title}
${content}
`;

const emptyPlaceholder = "_todo_";
const retweetURLPattern = /https:\/\/(?:www\.)?twitter\.com\/[^\/]+\/status\/(\d+)\/?/;

/**
 * Abstraction over the cards used on the actual board. Represents a planned
 * tweet. Uses GitHub issues with a specific format to extract the data.
 */
class TweetCardContent {
    /**
     * Section title for the tweet content.
     *
     * @type {string}
     * @readonly
     */
    static get TWEET_CONTENT() {
        return "Tweet Content";
    }

    /**
     * Section title for retweet.
     *
     * @type {string}
     * @readonly
     */
    static get RETWEET() {
        return "Retweet";
    }

    /**
     * Section title for schdeuled date.
     *
     * @type {string}
     * @readonly
     */
    static get SCHEDULED() {
        return "Scheduled for";
    }

    /**
     * Creates the content for an issue that can be used as card.
     *
     * @param {string} meta - The description for what the tweet should be about.
     * @param {boolean} [isRetweet=false] - If the tweet will be a retweet.
     * @param {Date} [dueDate] - The date the tweet should be tweeted if any.
     * @returns {string} Content for the issue.
     */
    static createCard(meta, isRetweet = false, dueDate) {
        let card = createSection("Tweet should be about", meta) + "\n";

        if(isRetweet) {
            card += createSection(TweetCardContent.RETWEET, emptyPlaceholder) + "\n";
        }
        else {
            card += createSection(TweetCardContent.TWEET_CONTENT, emptyPlaceholder) + "\n";
        }

        if(dueDate) {
            card += createSection(TweetCardContent.SCHEDULED, dueDate.toString());
        }

        return new TweetCardContent(card);
    }

    constructor(issueContent) {
        this.raw = issueContent;
    }

    /**
     * Returns the contents of the section with the given title. Strips the last
     * newline.
     *
     * @param {string} title - Title of the section to return.
     * @returns {string} The contents of the section without trailing newlines.
     */
    getSection(title) {
        let rawSection = this.raw.split("##").find((s) => s.startsWith(" "+title)).substr(title.length + 2);
        while(rawSection.endsWith("\n")) {
            rawSection = rawSection.substring(0, rawSection.length - 1);
        }
        return rawSection;
    }

    /**
     * Replaces the content of a section. Does not do anything if a section does
     * not exist.
     *
     * @param {string} title - Title of the section to update.
     * @param {string} content - Content of the section to set.
     * @returns {undefined}
     */
    setSection(title, content) {
        this.raw = this.raw.replace(
            new RegExp(createSection(title, "[^#]+")),
            createSection(title, content)
        );
    }

    /**
     * Checks if the card contains a section.
     *
     * @param {string} title - Title of the section to look for.
     * @returns {boolean} Whether the section exists.
     */
    hasSection(title) {
        return this.raw.includes(`## ${title}
`);
    }

    /**
     * The content of the planned tweet.
     *
     * @type {string}
     * @readonly
     */
    get tweet() {
        return this.getSection(TweetCardContent.TWEET_CONTENT);
    }

    /**
     * @type {boolean}
     * @readonly
     */
    get isRetweet() {
        return this.hasSection(TweetCardContent.RETWEET);
    }

    /**
     * A unique handle to a tweet that should be retweeted.
     *
     * @todo Extract Tweet ID
     * @type {string}
     * @readonly
     */
    get tweetToRetweet() {
        return this.getSection(TweetCardContent.RETWEET);
    }

    /**
     * The planned publish date for the tweet.
     *
     * @type {Date}
     * @readonly
     */
    get date() {
        return new Date(this.getSection(TweetCardContent.SCHEDULED));
    }

    /**
     * Returns an error string if something is wrong with the card, else it's
     * just an empty string.
     *
     * @returns {Array.<string>} Errors with the card. Empty if there are no errors.
     */
    getCardError() {
        const errors = [];
        if(!this.hasSection(TweetCardContent.TWEET_CONTENT) && !this.hasSection(TweetCardContent.RETWEET)) {
            errors.push(`Missing a section containing information on what to tweet. Please either add a "${TweetCardContent.TWEET_CONTENT}" or "${TweetCardContent.RETWEET}" section.`);
        }

        if(this.isRetweet) {
            const retweetUrl = this.getSection(TweetCardContent.RETWEET);
            if(retweetUrl.length > 0 && !retweetURLPattern.test(retweetUrl)) {
                errors.push("URL for tweet to retweet is not valid. Please use the tweet permalink.");
            }
            /*else if() {
                errors.push("Cannot retweet the given tweet because it does not exist or is private.");
            }*/
        }
        else {
            const charCount = twitter.getTweetLength(this.tweet);
            if(charCount > 140) {
                errors.push(`Tweet is too long with a character count of ${charCount}. Please shorten the tweet text to fit into 140 characters.`);
            }
        }

        if(this.hasSection(TweetCardContent.SCHEDULED)) {
            let due;
            try {
                due = Date.parse(this.getSection(TweetCardContent.SCHEDULED));
            }
            catch(e) {
                errors.push("Date can not be parsed");
            }

            if(Number.isNaN(due)) {
                errors.push("Date can not be parsed");
            }

            if(due < Date.now()) {
                errors.push("Date is in the past. Please schedule tweet for some point in the future.");
            }
        }

        return errors;
    }

    /**
     * Validates that a card contains all the required info and all info is
     * valid.
     *
     * @returns {boolean} Whether the card content is valid.
     */
    isValid() {
        return this.getCardError().length === 0;
    }
}

module.exports = TweetCardContent;
