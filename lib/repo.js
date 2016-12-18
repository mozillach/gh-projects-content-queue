/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

const fs = require("mz/fs");
const TweetCardContent = require("./tweet-card");

class Repository {
    /**
     * @param {PromisifiedGitHub} githubClient - GitHub Client.
     * @param {Object} config - Config for the project board.
     * @constructs
     */
    constructor(githubClient, config) {
        this.githubClient = githubClient;
        this.config = config;
    }

    /**
     * Checks if the given GitHub token has all required permissions.
     *
     * @async
     * @returns {boolean}
     * @todo
     */
    hasRequiredPermissions() {

    }

    /**
     * Checks if a file exists in the repo.
     *
     * @async
     * @returns {boolean}
     */
    hasFile(path) {
        return this.githubClient("repos", "getContent", {
            owner: this.config.owner,
            repo: this.config.repo,
            path
        }).then(() => true, () => false); //TODO check if that's really how that behaves.
    }

    /**
     * Create a file in the repository.
     *
     * @param {string} path - Path of the file.
     * @param {string} content - Content of the file as plain string.
     * @param {string} [commit="Setting up content queue"] - Commit message.
     * @async
     * @returns {undefined}
     */
    addFile(path, content, commit = "Setting up content queue.") {
        return this.githubClient("repos", "createFile", {
            owner: this.config.owner,
            repo: this.config.repo,
            path,
            message: commit,
            content: Buffer.from(content).toString("base64")
        });
    }

    /**
     * Adds the defualt README.md to the repository.
     *
     * @returns {undefined}
     */
    async addReadme() {
        const readme = await fs.readFile("../templates/README.md", "utf8");
        readme.replace(/\{repo\}/g, this.config.owner+"/"+this.config.repo);
        readme.replace(/\{twitterName\}/g, this.config.twitter.user);
        return this.addFile("README.md", readme);
    }

    /**
     * Adds the default issue template to the repository.
     *
     * @returns {undefined}
     */
    async addIssueTemplate() {
        //const issueTemplate = await fs.readFile("../templates/ISSUE_TEMPLATE.md", "utf8");
        //TODO also offer retweet section.
        const issueTemplate = TweetCardContent.createCard("something awesome.", false, "00-00-0000");
        return this.addFile("ISSUE_TEMPLATE.md", issueTemplate);
    }
}
