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
     * @param {string} accountsList - Markdown list of accounts.
     * @paaram {string} boardList - Markdown list of boards.
     */
    constructor(githubClient, config, accountsList, boardList) {
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
        this.ready = this.setup(accountsList, boardList).catch((e) => {
            console.error("Repository ready", e);
            throw e;
        });
    }

    async setup(accountsList, boardList) {
        const hasPermissions = await this.hasRequiredPermissions();
        if(!hasPermissions) {
            throw new Error("Not all required OAuth scopes are granted. Please check your authentication.");
        }
        /**
         * @type {module:issues.Issues}
         */
        this.issues = new Issues(this.githubClient, this.config);

        await this._addFiles(accountsList, boardList);
    }

    /**
     * Add default files to the repository. Adds README.md and ISSUE_TEMPLATE.md.
     *
     * @param {string} accountsList - Markdown list of accounts for this repo.
     * @paaram {string} boardList - Markdown list of boards.
     * @private
     * @returns {undefined}
     */
    async _addFiles(accountsList, boardList) {
        const readmeExists = await this.hasFile("README.md");
        if(!readmeExists) {
            await this.addReadme(accountsList, boardList);
        }
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
     * @param {string} boardList - Markdown list of boards used in this repo.
     * @returns {undefined}
     */
    async addReadme(accountsList, boardList) {
        let readme = await fs.readFile(path.join(__dirname, "../templates/README.md"), "utf8");
        readme = Repository.replace(readme, "repo", this.config.owner+"/"+this.config.repo);
        readme = Repository.replace(readme, "accounts", accountsList);
        readme = Repository.replace(readme, "board", boardList);
        return this.addFile("README.md", readme, "Default content queue README.md");
    }

    /**
     * Adds the default issue template to the repository.
     *
     * @param {object} boardConfig - Config of the board that the template should
     *                               be added for.
     * @returns {undefined}
     */
    async addIssueTemplates(boardConfig) {
        const validators = [];
        for(const source of boardConfig.sources) {
            if(source.type === 'validator' && !validators.includes(source.validator)) {
                await this.addTemplatesFromFormatter(source.validator, boardConfig);
                validators.push(source.validator);
            }
        }
        // Add generic template if there are multiple validator types for a generic post.
        if(validators.length > 1) {
            await this.addTemplatesFromFormatter('formatter', boardConfig);
        }
    }

    async addTemplatesFromFormatter(formatter, boardConfig) {
        const Formatter = require(`./formatters/${formatter}`);
        const templates = Formatter.GetTemplates();
        const sections = Formatter.GetTemplateSections(boardConfig);
        for(const template in templates) {
            if(templates.hasOwnProperty(template)) {
                await this.addIssueTemplate(template, templates[template].map((t) => `## ${t}
${sections[t]}`), formatter);
            }
        }
    }

    async addIssueTemplate(title, sections, type) {
        const path = `.github/ISSUE_TEMPLATE/${title.toLowerCase()}.md`;
        const hasTemplate = await this.hasFile(path);
        if(!hasTemplate) {
            if(type === 'formatter') {
                type = 'all services';
            }
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
     * @param {object} labels - Labels that the board wants.
     * @async
     * @returns {undefined}
     */
    ensureLabels(labels) {
        return Promise.all(Object.keys(labels).map((label) => {
            return this.hasLabel(labels[label]).then((hasLabel) => {
                if(!hasLabel) {
                    return this.addLabel(labels[label], LABEL_COLORS[label]);
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
        const opts = this.githubClient.orgs.getTeams.endpoint.merge({
            org: this.config.owner
        });
        const teams = await this.githubClient.paginate(opts);
        for(const t of teams) {
            if(t.name === team) {
                const memberOpts = this.githubClient.orgs.getTeamMembers.endpoint.merge({
                    team_id: t.id
                });
                const members = await this.githubClient.parginate(memberOpts);
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
