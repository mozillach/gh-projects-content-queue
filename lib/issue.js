/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

/**
 * Represent a GitHub issue. Its main purpose is to server as caching layer to
 * GitHub and a nicer interface to modify issues.
 */
class Issue {
    constructor(issueData) {
        this._content = issueData.content;
        this.lastUpdate = Date.parse(issueData.last_update);
        this.id = issueData.id
        this.owner = issueData.owner;
        this.repo = issueData.repo;
        this._githubClient = issueData.githubClient;
        //TODO
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
     * @param {string} content - Content of the comment to post.
     * @async
     * @returns {undefined}
     */
    comment(content) {
    }

    /**
     * The raw content of the issue description.
     * @type {string}
     */
    get content() {
        return this._content;
    }

    set content(val) {
        this._githubClient({
            issue: this.id,
            content: val
        }).then(() => {
            this._content = val
            this._update();
        });
    }

    /**
     * Checks if the issue has a given label
     *
     * @param {string} name - Name of the label to check for.
     * @async
     * @returns {boolean} Whether the issue has the label.
     */
    hasLabel(name) {
    }

    /**
     * Adds a label to the issue.
     *
     * @param {string} name - Name of the label to add.
     * @async
     * @returns {undefined}
     */
    addLabel(name) {
    }

    /**
     * Removes a label from the issue.
     *
     * @param {string} name - Name of the label to remove.
     * @async
     * @returns {undefined}
     */
    removeLabel(name) {
    }

    /**
     * Set the assigne of an issue to the given user.
     *
     * @param {string} user - User to assign.
     * @async
     * @returns {undefined}
     */
    assign(user) {
    }
}

module.exports = Issue;
