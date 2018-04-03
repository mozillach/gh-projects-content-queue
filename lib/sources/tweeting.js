/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/**
 * @module sources/tweeting
 * @license MPL-2.0
 */
"use strict";

const Source = require("./source");
const TwitterAccount = require("../accounts/twitter");
const TwitterFormatter = require("../formatters/twitter");
const self = require("../self");

/**
 * @alias module:sources/tweeting.TweetingSource
 * @extends module:sources/source.Source
 */
class TweetingSource extends Source {
    static get requiredColumns() {
        return [
            "source",
            "target"
        ];
    }

    static get managedColumns() {
        return [
            "target"
        ];
    }

    static get requiredConfig() {
        return super.requiredConfig.concat([
            'twitterAccount'
        ]);
    }

    /**
     * @inheritdoc
     */
    constructor(...args) {
        super(...args);

        this.lastUpdate = Date.now();
        this._twitterAccount = this._accountManager.getAccount('twitter', this._config.twitterAccount);

        this._repo.ready.then(() => {
            this._repo.board.on("storesupdated", () => this.onUpdated());
        });

        Promise.all([
            this.getColumn('source'),
            this.getColumn('target'),
            this._twitterAccount.tweets
        ]).then(async ([ column, target, tweets ]) => {
            const cards = await column.cards;

            for(const card of Object.values(cards)) {
                if(!card.content.hasSection(TwitterFormatter.RETWEET)) {
                    const [ content ] = TwitterAccount.getMediaAndContent(card.content.getSection(TwitterFormatter.TWEET_CONTENT));
                    const tweet = tweets.find((t) => 'full_text' in t ? t.full_text.includes(content) : t.text.includes(content));
                    if(tweet) {
                        this._repo.board.cardTweeted(card, `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`, target);
                    }
                }
                else {
                    const retweetID = TwitterAccount.getTweetIDFromURL(card.content.getSection(TwitterFormatter.RETWEET));
                    const didRetweet = tweets.some((t) => t.retweeted_status && t.retweeted_status.id_str === retweetID);
                    if(didRetweet) {
                        this._repo.board.cardTweeted(card, undefined, target);
                    }
                }
            }
        });
    }

    async onUpdated() {
        const [ source, target ] = await Promise.all([
            this.getColumn('source'),
            this.getColumn('target')
        ]);
        const cardsToTweet = await source.cards;
        if(cardsToTweet.size == 0) {
            return;
        }
        let scheduledTweetCount = this.getCurrentQuota();
        const highPriority = [],
            lowPriority = [];
        for(const card of cardsToTweet.values()) {
            // There is no guarantee that issue content is current here (due to
            // caching) thus we force update the card content.
            await this._repo.updateCard(card);
            if(card.canTweet) {
                if(card.content.isScheduled || card.content.hasSection(TwitterFormatter.REPLY_TO)) {
                    highPriority.push(card);
                }
                else {
                    lowPriority.push(card);
                }
            }
        }

        // Not a Promise.all to prevent hitting the project board endpoint concurrently.
        if(highPriority.length) {
            for(const card of highPriority) {
                await this.tweet(card, target);
                if(!card.content.hasSection(TwitterFormatter.REPLY_TO)) {
                    --scheduledTweetCount;
                }
            }
        }
        if(lowPriority.length && scheduledTweetCount > 0) {
            for(const card of lowPriority) {
                await this.tweet(card, target);
                if(--scheduledTweetCount <= 0) {
                    break;
                }
            }
        }
    }

    async tweet(card, target) {
        try {
            let url;
            if(card.content.hasSection(TwitterFormatter.RETWEET)) {
                url = await this._twitterAccount.retweet(card.content.getSection(TwitterFormatter.RETWEET));
            }
            else {
                let replyTo = null;
                if(card.content.hasSection(TwitterFormatter.REPLY_TO)) {
                    replyTo = card.content.getSection(TwitterFormatter.REPLY_TO);
                }
                const [ content, media ] = await this.separateContentAndMedia(card);
                url = await this._twitterAccount.tweet(content, media, replyTo);
            }
            this._repo.board.cardTweeted(card, url, target);
        }
        catch(e) {
            card.reportError("tweet", e);
        }
    }

    async separateContentAndMedia(card) {
        const [ content, media ] = TwitterAccount.getMediaAndContent(card.content.getSection(TwitterFormatter.TWEET_CONTENT));
        const mediaIds = await Promise.all(media.map((m) => this._twitterAccount.uploadMedia(m)));
        return [ content, mediaIds.join(",") ];
    }

    static getUTCHourMinuteDate(hour, minute, dayDiff = 0) {
        const now = new Date();
        return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dayDiff, hour, minute);
    }

    getCurrentQuota() {
        if(this._config.schedule && this._config.schedule.length) {
            const now = new Date();
            const interval = now.getTime() - this.lastUpdate;
            let scheduledTweetCount = 0;
            const intervalHours = Math.floor(interval / 3600000);
            const intervalMinutes = interval - (intervalHours * 3600000) / 60000;

            for(const s of this._config.schedule) {
                const time = s.split(":").map((t) => parseInt(t, 10));
                let dayDiff = 0;
                if(time[0] < now.getUTCHours() - intervalHours || (time[0] == now.getUTCHours() && time[1]  < now.getUTCMinutes() - intervalMinutes)) {
                    dayDiff = -1;
                }
                const date = self(this).getUTCHourMinuteDate(time[0], time[1], dayDiff);
                const difference = now.getTime() - date;
                if(difference >= 0 && difference < interval) {
                    ++scheduledTweetCount;
                }
            }

            this.lastUpdate = now.getTime();
            return scheduledTweetCount;
        }
        return Infinity;
    }
}
module.exports = TweetingSource;
