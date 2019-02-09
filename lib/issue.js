/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/**
 * @module issue
 * @license MPL-2.0
 */
"use strict";

/**
 * @typedef {Object} IssueData
 * @property {number} id - The issue id.
 * @property {number} number - The issue number.
 * @property {string} owner - The owner of the repo the issue is in.
 * @property {string} repo - Repo the issue is in.
 * @property {string} content - Content of the issue description.
 * @property {string} updated_at - Time the issue was last updated at.
 * @property {string} assignee - Assigned username.
 * @property {[string]} labels - Labels on the issue.
 * @property {string} title - Title of the issue.
 * @property {string} state - "open" or "closed".
 */

/**
 * Represent a GitHub issue. Its main purpose is to server as caching layer to
 * GitHub and a nicer interface to modify issues.
 *
 * @alias module:issue.Issue
 */
class Issue {
    /**
     * @param {external:GitHub} githubClient - GitHub client to use.
     * @param {module:issue~IssueData} issueData - Issue data.
     */
    constructor(githubClient, issueData) {
        this.update(issueData);
        this._githubClient = githubClient;
    }

    /**
     * Update the data of the issue from GitHub.
     *
     * @param {module:issue~IssueData} issueData - Data from the API.
     * @returns {undefined}
     */
    update(issueData) {
        /**
         * @type {string}
         */
        this._content = issueData.content;
        /**
         * @type {string}
         */
        this.title = issueData.title;
        /**
         * @type {number}
         */
        this.lastUpdate = Date.parse(issueData.updated_at);
        /**
         * @type {number}
         */
        this.id = issueData.id;
        /**
         * @type {number}
         */
        this.number = issueData.number;
        /**
         * @type {string}
         */
        this.owner = issueData.owner;
        /**
         * @type {module:repo.Repository}
         */
        this.repo = issueData.repo;
        /**
         * @type {string}
         */
        this._assignee = issueData.assignee;
        /**
         * @type {[string]}
         */
        this.labels = issueData.labels;
        /**
         * @type {boolean}
         */
        this.state = issueData.state;
    }

    /**
     * Updates the last updated timestamp.
     *
     * @returns {undefined}
     */
    _update() {
        this.lastUpdate = Date.now();
    }

    /**
     * Posts a comment on the issue.
     *
     * @param {string} body - Content of the comment to post.
     * @async
     * @returns {undefined}
     */
    comment(body) {
        return this._githubClient.issues.createComment({
            owner: this.owner,
            repo: this.repo,
            number: this.number,
            body
        });
    }

    /**
     * The raw content of the issue description.
     *
     * @type {string}
     */
    get content() {
        return this._content;
    }

    set content(val) {
        this._githubClient.issues.update({
            owner: this.owner,
            repo: this.repo,
            number: this.number,
            body: val
        }).then(() => {
            this._content = val;
            this._update();
        });
    }

    /**
     * Checks if the issue has a given label.
     *
     * @param {string} name - Name of the label to check for.
     * @returns {boolean} Whether the issue has the label.
     */
    hasLabel(name) {
        return this.labels.includes(name);
    }

    /**
     * Adds a label to the issue.
     *
     * @param {string} name - Name of the label to add.
     * @async
     * @returns {undefined}
     */
    addLabel(name) {
        if(!this.hasLabel(name)) {
            return this._githubClient.issues.addLabels({
                owner: this.owner,
                repo: this.repo,
                number: this.number,
                labels: [ name ]
            }).then(() => {
                this.labels.push(name);
            });
        }
        else {
            return Promise.resolve();
        }
    }

    /**
     * Removes a label from the issue.
     *
     * @param {string} name - Name of the label to remove.
     * @async
     * @returns {undefined}
     */
    removeLabel(name) {
        if(this.hasLabel(name)) {
            return this._githubClient.issues.removeLabel({
                owner: this.owner,
                repo: this.repo,
                number: this.number,
                name
            }).then(() => {
                this.labels = this.labels.filter((l) => l != name);
            });
        }
        else {
            return Promise.resolve();
        }
    }

    /**
     * Set the assigne of an issue to the given user.
     *
     * @param {string} user - User to assign.
     * @async
     * @returns {undefined}
     */
    assign(user) {
        if(user != this._assignee) {
            return this._githubClient.issues.addAssignees({
                owner: this.owner,
                repo: this.repo,
                number: this.number,
                assignees: [ user ]
            }).then(() => {
                this._assignee = user;
            });
        }
        else {
            return Promise.resolve();
        }
    }

    /**
     * User assigned to the issue if any.
     *
     * @returns {string?} Username of the assigned user or null.
     */
    get assignee() {
        return this._assignee;
    }

    /**
     * @returns {Object} An issue object ready for the GitHub API.
     */
    toAPIObject() {
        const obj = {
            title: this.title
        };

        obj.body = this.content;
        if(this.assignee) {
            obj.assignee = this.assignee;
        }
        if(this.labels.length) {
            obj.labels = this.labels;
        }

        return obj;
    }

    /**
     * Closes the issue.
     *
     * @async
     * @returns {?} Result of the request.
     */
    close() {
        if(this.state) {
            return this._githubClient.issues.update({
                owner: this.owner,
                repo: this.repo,
                number: this.number,
                state: "closed"
            }).then(({ data: res }) => {
                this.state = false;
                return res;
            });
        }
        return  Promise.resolve();
    }
}

module.exports = Issue;
