/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/**
 * @module issues
 * @license MPL-2.0
 * @todo use webhooks instead of polling for updates.
 */
"use strict";

const Issue = require("./issue");
const DataStoreHolder = require("./data-store-holder");
const GitHubAccount = require("./accounts/github");

/**
 * Loads all closed issues.
 *
 * @this module:issues.Issues
 * @async
 * @param {external:Map} [oldIssues=new Map()] - Previous issues.
 * @returns {external:Map} New issues map.
 * @fires module:issues.Issues#closed
 */
function fetchClosedIssues(oldIssues = new Map()) {
    return this.fetchIssues(oldIssues, "closed").then(async (issues) => {
        for(const issue of issues.values()) {
            if(!oldIssues.has(issue.number)) {
                this.emit("closed", issue);
            }
            else if(issue.justUpdated) {
                delete issue.justUpdated;
            }
        }

        return issues;
    });
}
fetchClosedIssues.emitsEvents = true;


/**
 * Loads all open issues into the issues map, updates changed issues and
 * removes issues that were closed.
 *
 * @this module:issues.Issues
 * @async
 * @param {external:Map} [oldIssues=new Map()] - Previous issues.
 * @returns {external:Map} New Issues map.
 * @fires module:issues.Issues#opened
 * @fires module:issues.Issues#updated
 * @todo avoid discarding Issue instances by moving them between closed & open issues? How does this interact with concurrent updates?
 */
function fetchOpenIssues(oldIssues = new Map()) {
    return this.fetchIssues(oldIssues, "open").then(async (issues) => {
        for(const issue of issues.values()) {
            if(!oldIssues.has(issue.number)) {
                this.emit("opened", issue);
            }
            else if(issue.justUpdated) {
                this.emit("updated", issue);
                delete issue.justUpdated;
            }
        }

        return issues;
    });
}
fetchOpenIssues.emitsEvents = true;

/**
 * An issue was opened.
 *
 * @event module:issues.Issues#opened
 * @type {module:issue.Issue}
 */

/**
 * An issue was changed remotely.
 *
 * @event module:issues.Issues#updated
 * @type {module:issue.Issue}
 */

/**
 * An issue was closed.
 *
 * @event module:issues.Issues#closed
 * @type {module:issue.Issue}
 */

/**
 * Holds a list of all GitHub issues for a repo and emits events when issues are
 * added, closed or edited.
 *
 * @alias module:issues.Issues
 * @extends module:data-store-holder.DataStoreHolder
 */
class Issues extends DataStoreHolder {
    /**
     * @param {external:GitHub} githubClient - GitHub client to use.
     * @param {module:config~Config} config - Repository infromation.
     */
    constructor(githubClient, config) {
        super({
            issues: fetchOpenIssues,
            closedIssues: fetchClosedIssues
        });
        /**
         * @type {module:config~Config}
         */
        this.config = config;
        /**
         * @type {external:GitHub}
         */
        this.githubClient = githubClient;
    }

    /**
     * Creates the issue info object for the Issue class.
     *
     * @param {Object} apiData - The issue info the API returns.
     * @returns {module:issue~IssueData} Object for the Issue class.
     */
    getIssueInfo(apiData) {
        return {
            id: apiData.id,
            number: apiData.number,
            repo: this.config.repo,
            owner: this.config.owner,
            updated_at: apiData.updated_at,
            assignee: apiData.assignee ? apiData.assignee.login : undefined,
            labels: apiData.labels ? apiData.labels.map((l) => l.name): [],
            content: apiData.body,
            title: apiData.title,
            state: apiData.state == "open"
        };
    }

    /**
     * Creates an issue in the repository.
     *
     * @param {string} title - Title for the issue.
     * @param {string} text - Body for the issue to add.
     * @returns {module:issue.Issue} Created issue.
     */
    async createIssue(title, text) {
        const { data: res } = await this.githubClient.issues.create({
            repo: this.config.repo,
            owner: this.config.owner,
            title,
            body: text
        });
        const issue = new Issue(this.githubClient, this.getIssueInfo(res));
        const issues = await this.issues;
        issues.set(issue.number, issue);
        return issue;
    }

    /**
     * Loads issues into a map, updates and removes issues.
     *
     * @param {external:Map} [oldIssues=new Map())] - Previous issues.
     * @param {string} [state="open"] - State of the issues to fetch.
     * @returns {external:Map} Updated map.
     */
    async fetchIssues(oldIssues = new Map(), state = "open") {
        const result = await this.githubClient.issues.getForRepo({
                owner: this.config.owner,
                repo: this.config.repo,
                state,
                per_page: 100
            }),
            allIssues = await GitHubAccount.pagination(this.githubClient, result),
            newIssues = new Map();
        for(const issue of allIssues) {
            if(issue.hasOwnProperty('pull_request')) {
                continue;
            }
            else if(!oldIssues.has(issue.number)) {
                newIssues.set(issue.number, new Issue(this.githubClient, this.getIssueInfo(issue)));
            }
            else {
                const issueModel = oldIssues.get(issue.number);
                newIssues.set(issue.number, issueModel);
                if(Date.parse(issue.updated_at) > issueModel.lastUpdate) {
                    issueModel.update(this.getIssueInfo(issue));
                    issueModel.justUpdated = true;
                }
            }
        }
        return newIssues;
    }

    /**
     * @param {string} number - Issue to fetch.
     * @returns {Issue} The requested issue.
     */
    async getIssue(number) {
        const [
            { data: result },
            openIssues,
            closedIssues
        ] = await Promise.all([
            this.githubClient.issues.get({
                owner: this.config.owner,
                repo: this.config.repo,
                number
            }),
            this.issues,
            this.closedIssues
        ]);
        let issues,
            otherIssues;
        if(result.state === "open") {
            issues = openIssues;
            otherIssues = closedIssues;
        }
        else {
            issues = closedIssues;
            otherIssues = openIssues;
        }
        let issueModel;
        if(issues.has(result.number)) {
            issueModel = issues.get(result.number);
        }
        else if(otherIssues.has(result.number)) {
            issueModel = otherIssues.get(result.number);
            otherIssues.delete(result.number);
            issues.set(result.number, issueModel);
        }
        if(issueModel) {
            issueModel.update(this.getIssueInfo(result));
        }
        else {
            issues.set(result.number, new Issue(this.githubClient, this.getIssueInfo(result)));
        }
        return issues.get(result.number);
    }
}

module.exports = Issues;
