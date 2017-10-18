/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/**
 * @module tweet-card-content
 * @license MPL-2.0
 */
"use strict";

const TwitterAccount = require("./twitter-account");
const ScheduledDate = require("./scheduled-date");
const UpdateManager = require("./update-manager");

/**
 * @param {string} title - Title of the section.
 * @param {string} content - Contents of the section.
 * @returns {string} Markdown formatted section for an issue.
 */
const createSection = (title, content) => `## ${title}
${content}
`;

/**
 * @const {string}
 * @default "_todo_"
 */
const emptyPlaceholder = "_todo_";

/**
 * Abstraction over the cards used on the actual board. Represents a planned
 * tweet. Uses GitHub issues with a specific format to extract the data.
 *
 * @alias module:tweet-card-content.TweetCardContent
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
     * Section title for tweet to reply to.
     *
     * @type {string}
     * @readonly
     */
    static get REPLY_TO() {
        return "Reply to";
    }

    /**
     * Creates the content for an issue that can be used as card.
     *
     * @param {string} meta - The description for what the tweet should be about.
     * @param {boolean} [isRetweet=false] - If the tweet will be a retweet.
     * @param {external:Date} [dueDate] - The date the tweet should be tweeted if any.
     * @param {module:config~Config} [config] - Configuration.
     * @param {string} [replyTo] - Tweet URL this is a reply to.
     * @returns {string} Content for the issue.
     */
    static createCard(meta, isRetweet = false, dueDate, config = {}, replyTo) {
        let card = createSection("Tweet should be about", meta) + "\n";

        if(isRetweet) {
            card += createSection(TweetCardContent.RETWEET, emptyPlaceholder) + "\n";
        }
        else {
            card += createSection(TweetCardContent.TWEET_CONTENT, emptyPlaceholder) + "\n";
        }

        if(dueDate && config) {
            card += createSection(TweetCardContent.SCHEDULED, ScheduledDate.formatDate(dueDate, config.schedulingTime.format, config.schedulingTime.timezone));
        }

        if(replyTo) {
            card += createSection(TweetCardContent.REPLY_TO, replyTo);
        }

        return new TweetCardContent(card, config);
    }

    constructor(issueContent, config) {
        /**
         * @type {string}
         */
        this.raw = issueContent;
        /**
         * @type {module:config~Config}
         */
        this.config = config;
    }

    toString() {
        return this.raw;
    }

    valueOf() {
        return this.raw;
    }

    /**
     * Returns the contents of the section with the given title. Strips the last
     * newline.
     *
     * @param {string} title - Title of the section to return.
     * @returns {string} The contents of the section without trailing newlines.
     */
    getSection(title) {
        return this.raw
            .split("##")
            .find((s) => s.startsWith(" "+title))
            .trim()
            .substr(title.length)
            .trimLeft();
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
            createSection(title, this.getSection(title)).trim(),
            createSection(title, content).trim()
        );
    }

    /**
     * Checks if the card contains a section.
     *
     * @param {string} title - Title of the section to look for.
     * @returns {boolean} Whether the section exists.
     */
    hasSection(title) {
        return this.raw.includes(`## ${title}`);
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
     * @type {boolean}
     * @readonly
     */
    get isReply() {
        return this.hasSection(TweetCardContent.REPLY_TO);
    }

    /**
     * The URL to a tweet that should be retweeted.
     *
     * @type {string}
     * @readonly
     */
    get tweetToRetweet() {
        return this.getSection(TweetCardContent.RETWEET);
    }

    /**
     * The URL to a tweet this is a reply to.
     *
     * @type {string}
     * @readonly
     */
    get replyTo() {
        return this.getSection(TweetCardContent.REPLY_TO);
    }

    /**
     * @type {boolean}
     * @readonly
     */
    get isScheduled() {
        return this.hasSection(TweetCardContent.SCHEDULED);
    }

    /**
     * The planned publish date for the tweet.
     *
     * @type {module:scheduled-date.ScheduledDate}
     * @readonly
     */
    get date() {
        const d = this.getSection(TweetCardContent.SCHEDULED);
        return new ScheduledDate(d, this.config);
    }

    /**
     * Returns an error string if something is wrong with the card, else it's
     * just an empty string.
     *
     * @returns {[string]} Errors with the card. Empty if there are no errors.
     */
    getCardError() {
        const errors = [];
        if(!this.hasSection(TweetCardContent.TWEET_CONTENT) && !this.hasSection(TweetCardContent.RETWEET)) {
            errors.push(`Missing a section containing information on what to tweet. Please either add a "${TweetCardContent.TWEET_CONTENT}" or "${TweetCardContent.RETWEET}" section.`);
        }
        else {
            if(this.isRetweet) {
                const retweetUrl = this.tweetToRetweet;
                if(retweetUrl.length == 0  || TwitterAccount.getTweetIDFromURL(retweetUrl) === null) {
                    errors.push("URL for tweet to retweet is not valid. Please use the tweet permalink.");
                }
                /*else if() {
                    errors.push("Cannot retweet the given tweet because it does not exist or is private.");
                }*/
            }
            else {
                const tweet = this.tweet;
                if(tweet == emptyPlaceholder) {
                    errors.push("Tweet content is just a placeholder. Please replace it with the actual content for the tweet.");
                }

                if(TwitterAccount.tweetTooLong(tweet)) {
                    errors.push(`Tweet is too long by ${-TwitterAccount.getRemainingChars(tweet)}. Please shorten the tweet text to fit into 140 characters.`);
                }

                const result = TwitterAccount.getGetMediaAndContent(tweet);
                if(result[1].length > 4) {
                    errors.push(`Can not attach more than 4 images to a tweet.`);
                }

                if(this.isReply) {
                    const replyTo = this.replyTo;
                    if(replyTo.length == 0 || TwitterAccount.getTweetIDFromURL(replyTo) === null) {
                        errors.push("The URL of tweet this is a response to is invalid. Please use the tweet permalink.");
                    }
                }
            }
        }

        if(this.hasSection(TweetCardContent.SCHEDULED)) {
            const due = this.date;

            if(!due.valid) {
                errors.push("Date can not be parsed. Please follow the format of "+this.config.schedulingTime.format);
            } else if(due.getTime() < Date.now() - UpdateManager.UPDATE_INTERVAL) {
                errors.push("Date is in the past. Please schedule tweet for some point in the future.");
            }
        }

        return errors;
    }

    /**
     * Validates that a card contains all the required info and all info is
     * valid.
     *
     * @type {boolean}
     * @readonly
     */
    get isValid() {
        return this.getCardError().length === 0;
    }
}

module.exports = TweetCardContent;
