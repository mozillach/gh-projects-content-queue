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
        this.sources = [];

        this.repo = new Repository(githubClient, this.twitterAccount, config);

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

            if(typeof config.sources == "object" && config.sources != null) {
                for(const s in config.sources) {
                    const Source = require(`./sources/${s}`);
                    this.sources.push(new Source(this.board, this.TwitterAccount));
                }
            }
        }).catch((e) => console.error(e));

        //TODO Do things with twitter and github and all that.
    }

    onUpdate() {
        const cardsToTweet = this.board.columns[this.board.columnIds.toTweet].cards;
        Promise.all(Array.from(cardsToTweet.values()).map((card) => {
            if(card.canTweet) {
                let p;
                if(card.content.isRetweet) {
                    p = this.twitterAccount.retweet(card.content.tweetToRetweet);
                }
                else {
                    p = this.twitterAccount.tweet(card.content.tweet);
                }
                return p.then((url) => this.board.cardTweeted(card, url));
            }
        })).catch(console.error);
    }
}

module.exports = ContentQueue;
