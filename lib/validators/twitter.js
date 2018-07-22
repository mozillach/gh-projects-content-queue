/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

const Validator = require("./validator");
const TwitterFormatter = require("../formatters/twitter");
const TwitterAccount = require("../accounts/twitter");

class TwitterValidator extends Validator {
    constructor(config) {
        super(config);

        this.sections.add(TwitterFormatter.TWEET_CONTENT);
        this.sections.add(TwitterFormatter.RETWEET);
    }

    validate(cardContent) {
        const errors = super.validate(cardContent);
        if(!TwitterFormatter.CONTENT_SECTIONS.some((section) => cardContent.hasSection(section))) {
            errors.push(`Missing a section containing information on what to tweet. Please either add a "${TwitterFormatter.CONTENT}" or "${TwitterFormatter.RETWEET}" section.`);
        }
        else {
            if(cardContent.hasSection(TwitterFormatter.RETWEET)) {
                const retweetUrl = cardContent.getSection(TwitterFormatter.RETWEET);
                if(retweetUrl.length === 0  || TwitterAccount.getTweetIDFromURL(retweetUrl) === null) {
                    errors.push("URL for tweet to retweet is not valid. Please provide only the tweet permalink.");
                }
                /*else if() {
                    errors.push("Cannot retweet the given tweet because it does not exist or is private.");
                }*/
            }
            else {
                if(cardContent.hasSection(TwitterFormatter.CONTENT)) {
                    const tweet = cardContent.getSection(TwitterFormatter.CONTENT);
                    try {
                        if(TwitterAccount.tweetTooLong(tweet)) {
                            errors.push(`Content is too long by ${-TwitterAccount.getRemainingChars(tweet)} for a tweet. Please shorten the text to fit into 280 characters or specify a separate shortened version in a "${TwitterFormatter.TWEET_CONTENT}" section.`);
                        }
                    }
                    catch(e) {
                        errors.push(`Can not attach more than 4 images to a tweet. Remove some images or specify a version with less images in a "${TwitterFormatter.TWEET_CONTENT}" section.`);
                    }
                }
                else {
                    const tweet = cardContent.getSection(TwitterFormatter.TWEET_CONTENT);
                    if(tweet == TwitterFormatter.TODO_PLACEHOLDER) {
                        errors.push("Tweet content is just a placeholder. Please replace it with the actual content for the tweet.");
                    }

                    try {
                        if(TwitterAccount.tweetTooLong(tweet)) {
                            errors.push(`Tweet is too long by ${-TwitterAccount.getRemainingChars(tweet)}. Please shorten the tweet text to fit into 280 characters.`);
                        }
                    }
                    catch(e) {
                        errors.push(`Can not attach more than 4 images to a tweet.`);
                    }
                }

                if(cardContent.hasSection(TwitterFormatter.REPLY_TO)) {
                    const replyTo = cardContent.getSection(TwitterFormatter.REPLY_TO);
                    if(replyTo.length === 0 || TwitterAccount.getTweetIDFromURL(replyTo) === null) {
                        errors.push("The URL of tweet this is a response to is invalid. Please use the tweet permalink.");
                    }
                }
            }
        }
        return errors;
    }
}

module.exports = TwitterValidator;
