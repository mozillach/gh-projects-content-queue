/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

class Issue {
    constructor(issueData) {
        this._content = issueData.content;
        this.lastUpdate = issueData.last_update;
        this.id = issueData.id
        this.owner = issueData.owner;
        this.repo = issueData.repo;
        this._githubClient = issueData.githubClient;
        //TODO
    }

    comment(content) {
    }

    get content() {
        return this._content;
    }

    set content(val) {
        this._githubClient.issue.set({
            id: this.id,
            body: val
        }, (err, res) => {
            if(!err) {
                this._content = val;
            }
        });
    }

    hasLabel() {
    }

    addLabel() {
    }

    removeLabel() {
    }

    flushContent() {
    }

    assign(user) {
    }
}

module.exports = Issue;
