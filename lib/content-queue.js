/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

//TODO ensure repo exists.
//TODO ensure necessary rights are granted -> repo?

const Board = require("./board");
const Repository = require("./repo");
const TwitterAccount = require("./twitter-account");

const DEFAULT_LABELS = {
    retweet: "Retweet",
    ready: "ready",
    invalid: "invalid"
};

/**
 * Basic class that manages the events for a single repo.
 */
class ContentQueue {
    /**
     * @param {PromisifiedGitHub} githubClient - GitHub client from GitHub
     *                                           authenticated for a user.
     * @param {external:Twitter} twitterClient - Authenticated for a user.
     * @param {Object} config - Config for this project
     * @constructs
     */
    constructor(githubClient, twitterClient, config) {
        const [ owner, repo ] = config.repo.split("/");
        config.owner = owner;
        config.repo = repo;

        config.labels = Object.assign(Object.assign({}, DEFAULT_LABELS), config.labels);

        this.config = config;
        this.githubClient = githubClient;
        this.twitterClient = twitterClient;
        this.twitterAccount = new TwitterAccount(twitterClient);

        this.repo = new Repository(githubClient, config);

        this.repo.hasRequiredPermissions().then((hasPermissions) => {
            if(!hasPermissions) {
                console.error("Not all required OAuth scopes are granted. Please check your authentication.");
                process.exit(1);
            }
            else {
                return this.repo.ready;
            }
        }).then(() => {
            this.board = new Board(githubClient, config);
            this.board.on("updated", this.onUpdate.bind(this));
        }).catch((e) => console.error(e));

        //TODO Do things with twitter and github and all that.
    }

    onUpdate() {
        const cardsToTweet = this.board.columns[this.columnIds.toTweet].cards;
        for(const card of cardsToTweet.entries()) {
            if(card.canTweet) {
                if(card.isRetweet) {
                    this.twitterAccount.retweet(card.content.tweetToRetweet);
                }
                else {
                    this.twitterAccount.tweet(card.content.tweet);
                }
                this.board.cardTweeted(card);
            }
        }
    }
}

module.exports = ContentQueue;
