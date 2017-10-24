/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/**
 * @module twitter-account
 * @license MPL-2.0
 */
"use strict";

const twitter = require("twitter-text");
const DataStoreHolder = require("./data-store-holder");
const fetch = require("fetch-base64");
const pagination = require("./pagination");

/**
 * @fires module:twitter-account.TwitterAccount#mention
 * @this module:twitter-account.TwitterAccount
 * @param {string?} lastMention - ID of the latest mention.
 * @returns {string} ID of the latest mention.
 */
async function getMentions(lastMention) {
    const args = {
        count: 200
    };
    if(lastMention !== undefined) {
        args.since_id = lastMention;
    }
    const tweets = await this.tweets;
    const res = await pagination.twitter((params) => this._twitterClient.get('statuses/mentions_timeline', params), args);
    if(res.length > 0) {
        for(const tweet of res) {
            //TODO filter replies to other replies?
            if(!tweets.some((t) => t.in_reply_to_status_id_str !== tweet.id_str)) {
                await this.emit("mention", tweet);
            }
        }
        return res[0].id_str;
    }
    return lastMention;
}
getMentions.emitsEvents = true;

/**
 * @this module:twitter-account.TwitterAccount
 * @param {[Object]} [tweets=[]] - Previous tweets.
 * @returns {[Object]} Updated list of tweets.
 */
async function getTweets(tweets = []) {
    const args = {
        user_id: await this.getID(),
        exclude_replies: false,
        include_rts: true,
        count: 200
    };
    if(tweets.length) {
        args.since_id = tweets[0].id_str;
    }
    const result = await pagination.twitter((params) => this._twitterClient.get('statuses/user_timeline', params), args);
    if(result.length) {
        return result.concat(tweets);
    }
    return tweets;
}

/**
 * A new mention of the twitter account was found. Holds the raw tweet from the API.
 *
 * @event module:twitter-account.TwitterAccount#mention
 * @type {Object}
 */

/**
 * @alias module:twitter-account.TwitterAccount
 * @extends module:data-store-holder.DataStoreHolder
 */
class TwitterAccount extends DataStoreHolder {
    /**
     * @param {external:Twitter} twitterClient - Twitter client to use.
     */
    constructor(twitterClient) {
        super({
            lastMention: getMentions,
            tweets: getTweets
        });
        /**
         * @type {external:Twitter}
         * @private
         */
        this._twitterClient = twitterClient;
        /**
         * @type {Promise}
         */
        this.ready = this.checkLogin().catch((e) => {
            console.error("TwitterAccount checkLogin", e);
            throw e;
        });
    }

    /**
     * Extract the Tweet id from the url if it's a valid tweet URL.
     *
     * @param {string} tweetUrl - URL to the tweet.
     * @returns {string?} If possible the ID of the tweet is returned.
     */
    static getTweetIDFromURL(tweetUrl) {
        const matches = tweetUrl.match(/^https?:\/\/(?:www\.)?twitter.com\/[^/]+\/status\/([0-9]+)\/?$/);
        return (matches && matches.length > 1) ? matches[1]: null;
    }

    /**
     * @param {string} content - Content of the tweet to get the count for.
     * @returns {number} Amount of remaining characters for the tweet.
     * @throws {Error} When the tweet contains too many images.
     */
    static getRemainingChars(content) {
        const [ pureTweet ] = TwitterAccount.getMediaAndContent(content);
        return 140 - twitter.getTweetLength(pureTweet);
    }

    /**
     * Checks if the content of a tweet is too long.
     *
     * @param {string} content - Content of the tweet to check.
     * @returns {boolean} Whether the tweet content is too long.
     * @throws {Error} When the tweet contains too many images.
     */
    static tweetTooLong(content) {
        const charCount = TwitterAccount.getRemainingChars(content);
        return charCount < 0;
    }

    /**
     * Separate media and text content of a tweet authored in GitHub Flavoured
     * Markdown.
     *
     * @param {string} tweet - Content of the tweet.
     * @returns {[string, [string]]} An array with the first item being the
     *          cleaned up text content and the second item being an array of
     *          media item URLs.
     * @throws {Error} When more than 4 images are given, as Twitter only
     *         supports up to 4 images.
     */
    static getMediaAndContent(tweet) {
        if(tweet.search(/!\[[^\]]*\]\([^)]+\)/) !== -1) {
            const media = [];
            const pureTweet = tweet.replace(/!\[[^\]]*\]\(([^)]+)\)/g, (match, url) => {
                media.push(url);
                return '';
            });
            if(media.length > 4) {
                throw new Error("Can not upload more than 4 images per tweet");
            }
            return [ pureTweet.trim(), media ];
        }
        return [ tweet.trim(), [] ];
    }

    /**
     * Upload an image to Twitter and get its media id.
     *
     * @param {string} mediaUrl - URL of the image to upload.
     * @returns {string} Media ID of the image on Twitter.
     */
    async uploadMedia(mediaUrl) {
        const [ media_data ] = await fetch.remote(mediaUrl);
        const args = {
            media_data
        };
        const response = await this._twitterClient.post('media/upload', args);
        return response.media_id_string;
    }

    /**
     * Sends a tweet with the given content to the authenticated account.
     *
     * @param {string} content - Tweet content. Should not be over 140 chars.
     * @param {string} [media=''] - List of media ids to associate with the tweet.
     * @param {string} [inReplyTo] - Tweet this is a reply to.
     * @returns {string} URL of the tweet.
     */
    async tweet(content, media = '', inReplyTo = null) {
        if(TwitterAccount.tweetTooLong(content)) {
            return Promise.reject("Tweet content too long");
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
        if(media.length) {
            args.media_ids = media;
        }
        await this.ready;

        const [
            res,
            username
        ] = await Promise.all([
            this._twitterClient.post('statuses/update', args),
            this.getUsername()
        ]);
        return `https://twitter.com/${username}/status/${res.id_str}`;
    }

    /**
     * Retweet a tweet based on its URL.
     *
     * @async
     * @param {string} url - URL to the tweet to retweet.
     * @returns {string} URL to the retweet.
     */
    async retweet(url) {
        const tweetId = TwitterAccount.getTweetIDFromURL(url);
        await this.ready;

        return this._twitterClient.post(`statuses/retweet/${tweetId}`, {})
            .then(() => url);
    }

    /**
     * Verifies the login credentials and stores the screenname if successful.
     *
     * @async
     * @returns {undefined}
     */
    checkLogin() {
        return this._twitterClient.get('account/verify_credentials', {}).then((res) => {
            this.username = res.screen_name;
            this.id = res.id_str;
        });
    }

    /**
     * Returns the username when available.
     *
     * @returns {string} Authenticated username.
     */
    async getUsername() {
        await this.ready;
        return this.username;
    }

    /**
     * Returns the Twitter ID of the current account when available.
     *
     * @returns {string} Authenticated user ID.
     */
    async getID() {
        await this.ready;
        return this.id;
    }
}

module.exports = TwitterAccount;
