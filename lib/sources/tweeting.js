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

/**
 * @alias module:sources/tweeting.TweetingSource
 * @extends module:sources/source.Source
 */
class TweetingSource extends Source {
    /**
     * @inheritdoc
     */
    constructor(repo, twitterAccount) {
        super(repo, twitterAccount);

        repo.board.on("updated", async () => {
            const [ columns, columnIds ] = await Promise.all([
                repo.board.columns,
                repo.board.columnIds
            ]);
            const cardsToTweet = columns[columnIds.toTweet].cards;
            // Not a Promise.all to prevent hitting the project board endpoint concurrently.
            for(const card of cardsToTweet.values()) {
                if(card.canTweet) {
                    let url;
                    if(card.content.isRetweet) {
                        url = await twitterAccount.retweet(card.content.tweetToRetweet);
                    }
                    else {
                        let replyTo = null;
                        if(card.content.isReply) {
                            replyTo = card.content.replyTo;
                        }
                        url = await twitterAccount.tweet(card.content.tweet, replyTo);
                    }
                    repo.board.cardTweeted(card, url);
                }
            }
        });
    }
}
module.exports = TweetingSource;
