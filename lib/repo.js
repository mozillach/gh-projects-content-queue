/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

const fs = require("mz/fs");
const TweetCardContent = require("./tweet-card-content");
const path = require("path");
const Issues = require("./issues");
const Board = require("./board");

const LABEL_COLORS = {
    retweet: "37FC00",
    ready: "FFFFFF",
    invalid: "FC4700"
};

const REQUIRED_SCOPES = [
//    "read:repo_hook",
//    "write:repo_hook",
//    "admin:repo_hook"
    "public_repo"
];

class Repository {
    /**
     * @param {PromisifiedGitHub} githubClient - GitHub Client.
     * @param {TwitterAccount} twitterAccount - Twitter account instance.
     * @param {Object} config - Config for the project board.
     * @constructs
     */
    constructor(githubClient, twitterAccount, config) {
        this.githubClient = githubClient;
        this.twitterAccount = twitterAccount;
        this.config = config;

        this.ready = this.hasRequiredPermissions().then(() => {
            this.board = new Board(githubClient, config);
            this.issues = new Issues(githubClient, config);

            return Promise.all([
                this._addFiles(),
                this.ensureLabels(),
                this.board.ready,
                this.issues.ready
            ]);
        }).then(() => {
            this.updateInterval = setInterval(() => {
                this.update().catch(console.error);
            }, 60000);
        }).catch((e) => {
            console.error("Repository ready", e);
            throw e;
        });
    }

    async _addFiles() {
        const readmeExists = await this.hasFile("README.md");
        if(!readmeExists) {
            await this.addReadme();
        }

        const issueTemplateExists = await this.hasFile("ISSUE_TEMPLATE.md");
        const issueTemplateInDirExists = await this.hasFile(".github/ISSUE_TEMPLATE.md");
        if(!issueTemplateExists && !issueTemplateInDirExists) {
            await this.addIssueTemplate();
        }
    }

    /**
     * Checks if the given GitHub token has all required permissions.
     *
     * @async
     * @returns {boolean} Whether the client has the correct permissions.
     */
    hasRequiredPermissions() {
        return this.githubClient("misc", "getRateLimit", {}).then((res) => {
            const scopes = res.meta["x-oauth-scopes"].split(",");
            return REQUIRED_SCOPES.every((s) => scopes.includes(s));
        });
    }

    /**
     * Checks if a file exists in the repo.
     *
     * @param {string} path - Path of the file to get the existance of.
     * @async
     * @returns {boolean} If the file exists in the repository.
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
        let readme = await fs.readFile(path.join(__dirname, "../templates/README.md"), "utf8");
        readme = readme.replace(/\{repo\}/g, this.config.owner+"/"+this.config.repo);
        readme = readme.replace(/\{twitterName\}/g, await this.twitterAccount.username);
        return this.addFile("README.md", readme, "Default content queue README.md");
    }

    /**
     * Adds the default issue template to the repository.
     *
     * @async
     * @returns {undefined}
     */
    addIssueTemplate() {
        //const issueTemplate = await fs.readFile("../templates/ISSUE_TEMPLATE.md", "utf8");
        //TODO also offer retweet section.
        const issueTemplate = TweetCardContent.createCard("something awesome.", false, this.config.schedulingTime.format, true);
        return this.addFile("ISSUE_TEMPLATE.md", issueTemplate.toString(), "Issue template for content queue");
    }

    /**
     * Makes sure the used labels exist for the repository.
     *
     * @async
     * @returns {undefined}
     */
    ensureLabels() {
        return Promise.all(Object.keys(this.config.labels).map((label) => {
            return this.hasLabel(this.config.labels[label]).then((hasLabel) => {
                if(!hasLabel) {
                    return this.addLabel(this.config.labels[label], LABEL_COLORS[label]);
                }
                return;
            });
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
        }).then(() => true, (e) => {
            if(e.code == 404 ) {
                return false;
            }
            throw e;
        });
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

    /**
     * Updates board and issues.
     *
     * @async
     * @returns {undefined}
     */
    update() {
        return Promise.all([
            this.issues.update(),
            this.board.update()
        ]);
    }
}
module.exports = Repository;
