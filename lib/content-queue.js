/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

//TODO ensure repo exists.
//TODO ensure necessary rights are granted -> repo?

const Board = require("./board");

const DEFAULT_LABELS = {
    retweet: "Retweet",
    ready: "ready",
    invalid: "invalid"
};

const LABEL_COLORS = {
    retweet: "37FC00",
    ready: "FFFFFF",
    invalid: "FC4700"
};

/**
 * Basic class that manages the events for a single repo.
 */
class ContentQueue {
    /**
     * @param {PromisifiedGitHub} githubClient - GitHub client from github
     *                                               authenticated for a user.
     * @param {external:TwitterClient} twitterClient - Authenticated for a user.
     * @param {Object} config - Config for this project
     * @constructs
     */
    constructor(githubClient, twitterClient, config) {
        const [ owner, repo ] = config.repo.split("/");
        config.owner = owner;
        config.repo = repo;

        config.labels = Object.assign(Object.assign({}, DEFAULT_LABELS), config.lables);

        this.config = config;
        this.githubClient = githubClient;
        this.ensureLabels();

        this.board = new Board(githubClient, config);
    }

    /**
     * Makes sure the used labels exist for the repository.
     *
     * @async
     * @returns {undefined}
     */
    ensureLabels() {
        return Promise.all(Object.values(this.config.lables).map((label) => {
            if(!this.hasLabel(label)) {
                return this.addLabel(label, LABEL_COLORS[label]);
            }
            return Promise.resolve();
        }));
    }

    /**
     * Checks if a label exists for the repository.
     *
     * @param {string} name - Name of the label.
     * @async
     * @returns {boolean} Whether the label exists.
     */
    hasLabel(name) {
        return this.githubClient("issues", "getLabel", {
            owner: this.config.owner,
            repo: this.config.repo,
            name
        }).then(() => true, () => false);
    }

    /**
     * Add a label to the repository.
     *
     * @param {string} name - Name of the label.
     * @param {string} color - Hex color of the label without leading #.
     * @async
     * @returns {undefined}
     */
    addLabel(name, color) {
        return this.githubClient("issues", "createLabel", {
            owner: this.config.owner,
            repo: this.config.repo,
            name,
            color
        });
    }
}

module.exports = ContentQueue;
