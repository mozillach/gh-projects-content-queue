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

        repo.board.on("updated", async () => {
            const [ source, target ] = await Promise.all([
                this.getColumn('source'),
                this.getColumn('target')
            ]);
            const cardsToTweet = source.cards;
            // Not a Promise.all to prevent hitting the project board endpoint concurrently.
            for(const card of cardsToTweet.values()) {
                if(card.canTweet) {
                    try {
                        let url;
                        if(card.content.isRetweet) {
                            url = await twitterAccount.retweet(card.content.tweetToRetweet);
                        }
                        else {
                            let replyTo = null;
                            if(card.content.isReply) {
                                replyTo = card.content.replyTo;
                            }
                            const [ content, media ] = await this.separateContentAndMedia(card);
                            url = await twitterAccount.tweet(content, media, replyTo);
                        }
                        repo.board.cardTweeted(card, url, target);
                    }
                    catch(e) {
                        card.reportError("tweet", e);
                    }
                }
            }
        });

        Promise.all([
            this.getColumn('source'),
            this.getColumn('target')
        ]).then(async ([ column, target ]) => {
            const tweets = await twitterAccount.tweets;

            for(const card of Object.values(column.cards)) {
                const [ content ] = TwitterAccount.getGetMediaAndContent(card);
                const tweet = tweets.find((t) => 'full_text' in t ? t.full_text.includes(content) : t.text.includes(content));
                if(tweet) {
                    repo.board.cardTweeted(card, `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`, target);
                }
            }
        });
    }

    async separateContentAndMedia(card) {
        const [ content, media ] = TwitterAccount.getGetMediaAndContent(card.content.tweet);
        const mediaIds = await Promise.all(media.map((m) => this._twitterAccount.uploadMedia(m)));
        return [ content, mediaIds.join(",") ];
    }
}
module.exports = TweetingSource;
