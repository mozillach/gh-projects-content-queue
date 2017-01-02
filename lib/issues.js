/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

const EventEmitter = require("events");
const Issue = require("./issue");

//TODO use webhooks instead of polling for updates.

/**
 * An issue was opened.
 *
 * @event opened
 * @type {Issue}
 */

/**
 * An issue was changed remotely.
 *
 * @event updated
 * @type {Issue}
 */

/**
 * An issue was closed.
 *
 * @event closed
 * @type {Issue}
 */

/**
 * Holds a list of all GitHub issues for a repo and emits events when issues are
 * added, closed or edited.
 */
class Issues extends EventEmitter {
    /**
     * @param {PromisifiedGitHub} githubClient - GitHub client to use.
     * @param {Object} config - Repository infromation.
     */
    constructor(githubClient, config) {
        super();
        // ID - Issue map
        this.issues = new Map();
        this.config = config;
        this.githubClient = githubClient;

        this.fetchOpenIssues().catch((e) => console.error(e));
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
     * Loads all open issues into the issues map, updates changed issues and
     * removes issues that were closed.
     *
     * @todo pagination
     * @async
     * @returns {undefined}
     * @fires opened
     * @fires updated
     * @fires closed
     */
    fetchOpenIssues() {
        return this.githubClient("issues", "getForRepo", {
            owner: this.config.owner,
            repo: this.config.repo,
            state: "open",
            per_page: 100
        }).then((issues) => {
            const visitedIds = [];
            for(const i in issues) {
                // Skips the request meta info
                if(i == "meta") {
                    continue;
                }
                const issue = issues[i];
                visitedIds.push(issue.number);
                if(!this.issues.has(issue.number)) {
                    this.issues.set(issue.number, new Issue(this.githubClient, this.getIssueInfo(issue)));
                    this.emit("opened", this.issues.get(issue.number));
                }
                else if(Date.parse(issue.updated_at) > this.issues.get(issue.number).lastUpdate) {
                    const issueModel = this.issues.get(issue.number);
                    issueModel.update(this.getIssueInfo(issue));
                    this.emit("updated", issueModel);
                }
            }

            const closedIssues = Array.from(this.issues.keys()).filter((id) => !visitedIds.includes(id));
            for(const closed of closedIssues) {
                this.emit("closed", this.issues.get(closed));
                this.issues.delete(closed);
            }
        });
    }

    /**
     * Creates an issue in the repository.
     *
     * @param {string} title - Title for the issue.
     * @param {string} text - Body for the issue to add.
     * @async
     * @returns {Issue} Created issue.
     */
    createIssue(title, text) {
        return this.githubClient("issues", "create", {
            repo: this.config.repo,
            owner: this.config.owner,
            title,
            body: text
        }).then((res) => {
            return new Issue(this.githubClient, this.getIssueInfo(res));
        });
    }
}

module.exports = Issues;
