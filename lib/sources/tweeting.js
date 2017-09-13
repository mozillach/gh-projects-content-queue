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
const TwitterAccount = require("../twitter-account");

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

    /**
     * @inheritdoc
     */
    constructor(repo, twitterAccount, config) {
        super(repo, twitterAccount, config);

        this.lastUpdate = Date.now();

        repo.board.on("updated", async () => {
            const [ source, target ] = await Promise.all([
                this.getColumn('source'),
                this.getColumn('target')
            ]);
            const cardsToTweet = await source.cards;
            if(cardsToTweet.length == 0) {
                return;
            }
            let scheduledTweetCount = this.getCurrentQuota();
            if(scheduledTweetCount === 0) {
                return;
            }
            const highPriority = [],
                lowPriority = [];
            for(const card of cardsToTweet.values()) {
                if(card.canTweet) {
                    if(card.content.isScheduled || card.content.isReply) {
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
                    if(!card.content.isReply) {
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
        });

        Promise.all([
            this.getColumn('source'),
            this.getColumn('target'),
            twitterAccount.tweets
        ]).then(async ([ column, target, tweets ]) => {
            const cards = await column.cards;

            for(const card of Object.values(cards)) {
                const [ content ] = TwitterAccount.getGetMediaAndContent(card);
                const tweet = tweets.find((t) => 'full_text' in t ? t.full_text.includes(content) : t.text.includes(content));
                if(tweet) {
                    repo.board.cardTweeted(card, `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`, target);
                }
            }
        });
    }

    async tweet(card, target) {
        try {
            let url;
            if(card.content.isRetweet) {
                url = await this._twitterAccount.retweet(card.content.tweetToRetweet);
            }
            else {
                let replyTo = null;
                if(card.content.isReply) {
                    replyTo = card.content.replyTo;
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
        const [ content, media ] = TwitterAccount.getGetMediaAndContent(card.content.tweet);
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

            for(const s of this._config.schedule) {
                const time = s.split(":").map((t) => parseInt(t, 10));
                let dayDiff = 0;
                if(time[0] > now.getUTCHours() || (time[0] == now.getUTCHours() && time[1] > now.getUTCMinutes())) {
                    dayDiff = -1;
                }
                const date = TweetingSource.getUTCHourMinuteDate(time[0], time[1], dayDiff);
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
