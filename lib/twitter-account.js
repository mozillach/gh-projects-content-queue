/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

const twitter = require("twitter-text");

//TODO pull in mentions and emit an events upon new threads (i.e. ignore replies to replies).

class TwitterAccount {
    constructor(twitterClient) {
        this._twitterClient = twitterClient;
    }

    /**
     * Extract the Tweet id from the url if it's a valid tweet URL.
     *
     * @param {string} tweetUrl - URL to the tweet.
     * @returns {string?} If possible the ID of the tweet is returned.
     */
    static getTweetIDFromURL(tweetUrl) {
        const matches = tweetUrl.match(/^https?:\/\/(?:www\.)?twitter.com\/[^\/]+\/status\/([0-9]+)\/?$/);
        return (matches && matches.length > 1) ? matches[1]: null;
    }

    /**
     * Checks if the content of a tweet is too long.
     *
     * @param {string} content - Content of the tweet to check.
     * @returns {boolean} Whether the tweet content is too long.
     */
    static tweetTooLong(content) {
        const charCount = twitter.getTweetLength(content);
        return charCount > 140;
    }

    /**
     * Sends a tweet with the given content to the authenticated account.
     *
     * @async
     * @param {string} content - Tweet content. Should not be over 140 chars.
     * @param {string} [inReplyTo] - Tweet this is a reply to.
     * @returns {undefined}
     */
    tweet(content, inReplyTo = null) {
        if(TwitterAccount.tweetTooLong(content)) {
            throw "Tweet content too long";
        }

        const args = {
            status: content
        };

        if(inReplyTo) {
            const tweetId = TwitterAccount.getTweetIDFromURL(inReplyTo);
            if(tweetId) {
                args.in_reply_to_status_id = tweetId;
            }
        }

        return this._twitterClient.post('statuses/update', args);
    }

    /**
     * Retweet a tweet based on its URL.
     *
     * @async
     * @param {string} url - URL to the tweet to retweet.
     * @returns {undefined}
     */
    retweet(url) {
        const tweetId = TwitterAccount.getTweetIDFromURL(url);
        return this._twitterClient.post(`statuses/retweet/${tweetId}`)
    }
}

module.exports = TwitterAccount;
