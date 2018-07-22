/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/**
 * @module repo
 * @license MPL-2.0
 */
"use strict";

const fs = require("mz/fs");
const path = require("path");
const Issues = require("./issues");
const Board = require("./board");
const GitHubAccount = require("./accounts/github");

/**
 * Default label colors.
 *
 * @const
 * @enum {string}
 */
const LABEL_COLORS = {
    retweet: "37FC00",
    ready: "FFFFFF",
    invalid: "FC4700"
};

/**
 * Required GitHub OAuth scopes.
 *
 * @const {[string]}
 */
const REQUIRED_SCOPES = [
//    "read:repo_hook",
//    "write:repo_hook",
//    "admin:repo_hook"
    "public_repo"
];

const REQUIRED_ORG_SCOPES = [
    'read:org'
];

/**
 * @alias module:repo.Repository
 */
class Repository {
    /**
     * Replaces a placeholder of the form {placeholder} in a string.
     *
     * @param {string} subject - String to replace the placeholder in.
     * @param {string} placeholderName - Name of the placeholder to replace.
     * @param {string} value - Value to replace the placeholder with.
     * @returns {string} String with all instances of the placeholder replaced
     *          with the given value.
     */
    static replace(subject, placeholderName, value) {
        const pattern = new RegExp(`{${placeholderName}}`, 'g');
        return subject.replace(pattern, value);
    }

    /**
     * @param {external:GitHub} githubClient - GitHub Client.
     * @param {module:config~Config} config - Config for the project board.
     */
    constructor(githubClient, config, accountsList) {
        /**
         * @type {external:GitHub}
         */
        this.githubClient = githubClient;
        /**
         * @type {module:config~Config}
         */
        this.config = config;

        /**
         * @type {Promise}
         */
        this.ready = this.setup(accountsList).catch((e) => {
            console.error("Repository ready", e);
            throw e;
        });
        this.ready.then(() => {
            this.board.cards.ready = (async () => {
                const columns = Object.values(await this.board.columns);
                const addIssues = (issues) => this.addIssuesToBoard(issues, columns);

                await Promise.all([
                    this.issues.issues.then(addIssues),
                    this.issues.closedIssues.then(addIssues)
                ]);
                this.board.cards.isReady = true;
            })();
        }).catch((e) => {
            console.error("Syncing cards", e);
        });
    }

    async addIssuesToBoard(issues, columns) {
        if(issues.size) {
            for(const issue of issues.values()) {
                for(const column of columns) {
                    if(column && (await column.hasIssue(issue.number))) {
                        await this.board.addCard(issue, column, true);
                    }
                }
            }
        }
    }

    async setup(accountsList) {
        const hasPermissions = await this.hasRequiredPermissions();
        if(!hasPermissions) {
            throw new Error("Not all required OAuth scopes are granted. Please check your authentication.");
        }

        /**
         * @type {module:board.Board}
         */
        this.board = new Board(this.githubClient, this.config);
        /**
         * @type {module:issues.Issues}
         */
        this.issues = new Issues(this.githubClient, this.config);

        await Promise.all([
            this._addFiles(accountsList),
            this.ensureLabels(),
            this.board.ready
        ]);
    }

    /**
     * Add default files to the repository. Adds README.md and ISSUE_TEMPLATE.md.
     *
     * @param {string} accountsList - Markdown list of accounts for this repo.
     * @private
     * @returns {undefined}
     */
    async _addFiles(accountsList) {
        const readmeExists = await this.hasFile("README.md");
        if(!readmeExists) {
            await this.addReadme(accountsList);
        }

        await this.addIssueTemplates();
    }

    /**
     * Checks if the given GitHub token has all required permissions.
     *
     * @returns {boolean} Whether the client has the correct permissions.
     */
    async hasRequiredPermissions() {
        const [
            { headers },
            isUser
        ] = await Promise.all([
            this.githubClient.misc.getRateLimit({}),
            this.belongsToUser()
        ]);
        const scopes = headers["x-oauth-scopes"].split(",").map((s) => s.trim());
        let requiredScopes = REQUIRED_SCOPES;
        if(!isUser) {
            requiredScopes = requiredScopes.concat(REQUIRED_ORG_SCOPES);
        }
        return requiredScopes.every((s) => scopes.includes(s));
    }

    /**
     * Checks if a file exists in the repo.
     *
     * @param {string} path - Path of the file to get the existance of.
     * @async
     * @returns {boolean} If the file exists in the repository.
     */
    hasFile(path) {
        return this.githubClient.repos.getContent({
            owner: this.config.owner,
            repo: this.config.repo,
            path
        }).then(() => true).catch(() => false);
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
        return this.githubClient.repos.createFile({
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
     * @param {string} accountsList - Markdown list of accounts for this repo.
     * @returns {undefined}
     */
    async addReadme(accountsList) {
        let readme = await fs.readFile(path.join(__dirname, "../templates/README.md"), "utf8");
        readme = Repository.replace(readme, "repo", this.config.owner+"/"+this.config.repo);
        readme = Repository.replace(readme, "accounts", accountsList);
        readme = Repository.replace(readme, "board", this.config.projectName);
        return this.addFile("README.md", readme, "Default content queue README.md");
    }

    /**
     * Adds the default issue template to the repository.
     *
     * @returns {undefined}
     */
    async addIssueTemplates() {
        for(const source of this.config.sources) {
            if(source.type === 'validator') {
                const Formatter = require(`./formatters/${source.validator}`);
                const templates = Formatter.GetTemplates();
                const sections = Formatter.GetTemplateSections(this.config);
                for(const template in templates) {
                    if(templates.hasOwnProperty(template)) {
                        await this.addIssueTemplate(template, templates[template].map((t) => `## ${t}
${sections[t]}`), source.validator);
                    }
                }
            }
        }
    }

    async addIssueTemplate(title, sections, type) {
        const path = `.github/ISSUE_TEMPLATE/${title.toLowerCase()}.md`;
        const hasTemplate = await this.hasFile(path);
        if(!hasTemplate) {
            const template = `---
name: ${title}
about: New ${title} for ${type}

---

${sections.join("\n\n")}`;
            return this.addFile(path, template, title + " issue template for content queue");
        }
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
        return this.githubClient.issues.getLabel({
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
        return this.githubClient.issues.createLabel({
            owner: this.config.owner,
            repo: this.config.repo,
            name,
            color
        });
    }

    /**
     * Creates a card in a column.
     *
     * @param {string} title - Title for the card.
     * @param {string} text - Text for a card to add.
     * @param {module:column.Column} column - Column to add the card to.
     * @param {string} [position] - Where to insert the card in the column.
     * @returns {module:tweet-card.TweetCard} Created card.
     */
    async createCard(title, text, column, position) {
        const issue = await this.issues.createIssue(title, text);
        const card = await this.board.addCard(issue, column);
        if(position) {
            await column.moveCard(card, position);
        }
        return card;
    }

    /**
     * @returns {boolean} Whether this repo belongs to a user or an organization.
     */
    async belongsToUser() {
        return this.githubClient.repos.get({
            owner: this.config.owner,
            repo: this.config.repo
        }).then(({ data: repo }) => repo.owner.type === "User");
    }

    /**
     * @param {string} team - Name of the team to get users from.
     * @returns {[string]} Usernames that are in the given team.
     * @throws If there is no team matching the given name.
     * @throws If the repository belongs to a user.
     */
    async getUsersInTeam(team) {
        const isUser = await this.belongsToUser();
        if(isUser) {
            throw new Error("Belongs to user");
        }
        const teamsResult = await this.githubClient.orgs.getTeams({
            org: this.config.owner
        });
        const teams = await GitHubAccount.pagination(this.githubClient, teamsResult);
        for(const t of teams) {
            if(t.name === team) {
                const result = await this.githubClient.orgs.getTeamMembers({
                    id: t.id
                });
                const members = await GitHubAccount.pagination(this.githubClient, result);
                return members.map((member) => member.login);
            }
        }
        throw new Error("Team doesn't exist");
    }

    /**
     * Forces an update on a card and revalidates it.
     *
     * @param {TweetCard} card - Card to update and revalidate.
     * @returns {undefined}
     */
    async updateCard(card) {
        await this.ready;
        await this.issues.getIssue(card.issue.number);
    }
}
module.exports = Repository;
