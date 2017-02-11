/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

const Issue = require("./issue");
const DataStoreHolder = require("./data-store-holder");

//TODO use webhooks instead of polling for updates.

/**
 * Loads all open issues into the issues map, updates changed issues and
 * removes issues that were closed.
 *
 * @todo pagination
 * @this Issues
 * @async
 * @param {Map} [oldIssues=new Map()] - Previous issues.
 * @returns {Map} New Issues map.
 * @fires Issues#opened
 * @fires Issues#updated
 * @fires Issues#closed
 */
function fetchOpenIssues(oldIssues = new Map()) {
    return this.githubClient("issues", "getForRepo", {
        owner: this.config.owner,
        repo: this.config.repo,
        state: "open",
        per_page: 100
    }).then((issues) => {
        const visitedIds = [];
        const newIssues = new Map();
        for(const i in issues) {
            // Skips the request meta info
            if(i == "meta") {
                continue;
            }
            const issue = issues[i];
            visitedIds.push(issue.number);
            if(oldIssues === null || !oldIssues.has(issue.number)) {
                newIssues.set(issue.number, new Issue(this.githubClient, this.getIssueInfo(issue)));
                this.emit("opened", newIssues.get(issue.number));
            }
            else {
                const issueModel = oldIssues.get(issue.number);
                newIssues.set(issue.number, issueModel);
                if(Date.parse(issue.updated_at) > issueModel.lastUpdate) {
                    issueModel.update(this.getIssueInfo(issue));
                    this.emit("updated", issueModel);
                }
            }
        }

        if(oldIssues !== null) {
            const closedIssues = Array.from(oldIssues.keys()).filter((id) => !visitedIds.includes(id));
            for(const closed of closedIssues) {
                this.emit("closed", oldIssues.get(closed));
            }
        }

        return newIssues;
    });
}

/**
 * An issue was opened.
 *
 * @event Issues#opened
 * @type {Issue}
 */

/**
 * An issue was changed remotely.
 *
 * @event Issues#updated
 * @type {Issue}
 */

/**
 * An issue was closed.
 *
 * @event Issues#closed
 * @type {Issue}
 */

/**
 * Holds a list of all GitHub issues for a repo and emits events when issues are
 * added, closed or edited.
 */
class Issues extends DataStoreHolder {
    /**
     * @param {PromisifiedGitHub} githubClient - GitHub client to use.
     * @param {Object} config - Repository infromation.
     */
    constructor(githubClient, config) {
        super({
            issues: fetchOpenIssues
        });
        this.config = config;
        this.githubClient = githubClient;

        this.firstRun = true;
        this.ready = this.issues.then(() => {
            this.firstRun = false;
        }).catch((e) => {
            console.error("Issues ready", e);
            throw e;
        });
    }

    /**
     * Creates the issue info object for the Issue class.
     *
     * @param {Object} apiData - The issue info the API returns.
     * @returns {Object} Object for the Issue class.
     */
    getIssueInfo(apiData) {
        return {
            id: apiData.id,
            number: apiData.number,
            repo: this.config.repo,
            owner: this.config.owner,
            updated_at: apiData.updated_at,
            asignee: apiData.assignee ? apiData.assignee.login : undefined,
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
     * @returns {Issue} Created issue.
     */
    async createIssue(title, text) {
        const res = await this.githubClient("issues", "create", {
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
}

module.exports = Issues;
