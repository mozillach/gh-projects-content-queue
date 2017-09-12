/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/**
 * @module sources/mentions
 * @license MPL-2.0
 */
"use strict";

const Source = require("./source");
const TweetCardContent = require("../tweet-card-content");
const renderTweet = require("tweet.md");
const TwitterAccount = require("../twitter-account");

/**
 * @alias module:sources/mentions.MentionsSource
 * @extends module:sources/source.Source
 */
class MentionsSource extends Source {
    static get requiredColumns() {
        return [
            'target'
        ];
    }

    /**
     * @param {Object} tweet - Twitter API Tweet JSON object.
     * @returns {string} URL to the tweet.
     */
    static getTweetPermalink(tweet) {
        return `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`;
    }

    /**
     * @param {Object} tweet - Twitter API Tweet JSON object.
     * @returns {string} Tweet rendered in Markdown.
     */
    static formatTweet(tweet) {
        return renderTweet(tweet).split("\n").map((l) => "> " + l).join("\n");
    }

    /**
     * @inheritdoc
     */
    constructor(repo, twitterAccount, config) {
        super(repo, twitterAccount, config);

        twitterAccount.on("mention", async (tweet) => {
            const [ columns, reactionColumn ] = await Promise.all([
                this._repo.board.columns,
                this.getColumn('target')
            ]);

            const tweetPermalink = MentionsSource.getTweetPermalink(tweet);
            // Don't create an issue if there's already one for the tweet
            const openIssues = await repo.issues.issues;
            for(const issue of openIssues.values()) {
                if(this.checkIssue(issue, tweetPermalink)) {
                    const hasIssues = await Promise.all(Array.from(Object.values(columns)).map((c) => c.hasIssue(issue.number)));
                    if(hasIssues.every((hasIssue) => !hasIssue)) {
                        await repo.board.addCard(issue, reactionColumn);
                    }
                    return;
                }
            }
            // Don't add a new issue if it already exists and is closed.
            const closedIssues = await repo.issues.closedIssues;
            for(const issue of closedIssues.values()) {
                if(this.checkIssue(issue, tweetPermalink)) {
                    return;
                }
            }
            //TODO due date
            const issueText = TweetCardContent.createCard(`Prepare a reply for the request by the user ${tweet.user.screen_name}:
${MentionsSource.formatTweet(tweet)}`, false, null, null, tweetPermalink);

            await repo.createCard(`Mention by ${tweet.user.screen_name}`, issueText.toString(), reactionColumn, "top").catch(console.error);
            //TODO assign user to returned card
        });

        this.getColumn('target').then(async (column) => {
            const [ cards, tweets ] = await Promise.all([
                column.cards,
                twitterAccount.tweets
            ]);
            for(const card of cards.values()) {
                const cardTweetId = TwitterAccount.getTweetIDFromURL(card.content.replyTo);
                const tweet = tweets.find((t) => t.in_reply_to_status_id_str === cardTweetId);
                if(tweet) {
                    try {
                        await card.issue.close();
                        await card.comment("Manually tweeted a reply to this");
                        await column.removeCard(card);
                    }
                    catch(e) {
                        await card.reportError('removing handled mention', e);
                    }
                }
            }
        });
    }

    /**
     * @param {module:issue.Issues} issue - Issue to check if it's a reply to the tweet.
     * @param {string} tweetPermalink - Permalink to the tweet.
     * @returns {boolean} If the issue is indeed for that tweet.
     */
    checkIssue(issue, tweetPermalink) {
        if(issue.content.includes(TweetCardContent.REPLY_TO)) {
            const content = new TweetCardContent(issue.content, {});
            return content.isReply && content.replyTo == tweetPermalink;
        }
        return false;
    }
}
module.exports = MentionsSource;
