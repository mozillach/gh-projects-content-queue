/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/**
 * @module sources/feed
 * @license MPL-2.0
 */
"use strict";

const Source = require("./source");
const Feed = require("../feed");
const Formatter = require("../formatters/formatter");
const self = require("../self");

class EventsSource extends Source {
    static getCardContent(item, config) {
        return Formatter.Format({
            meta: `Post "[${item.title}](${item.link})":

> ${item.summary || item.description}`
        }, config);
    }

    static getTitle(item) {
        return `${item.title} (${item.author}) [${item.date}]`;
    }

    static get requiredConfig() {
        return super.requiredConfig.concat([
            'url'
        ]);
    }

    static get requiredColumns() {
        return [
            'target'
        ];
    }

    constructor(...args) {
        super(...args);

        this.feed = new Feed(this._config.url);

        this.feed.on('published', (item) => this.handleItem(item));
    }

    async getItem(item) {
        await this._repo.ready;
        const issues = await this._repo.issues.issues;
        const allIssues = Array.from(issues.values()).concat(Array.from((await this._repo.issues.closedIssues).values()));
        const title = self(this).getTitle(item);
        for(const issue of allIssues) {
            if(issue.title === title) {
                return issue;
            }
        }
        return false;
    }

    async addItem(item) {
        return this._repo.createCard(
            self(this).getTitle(item),
            self(this).getCardContent(item, this._repo.config),
            await this.getColumn('target')
        );
    }

    async handleItem(item) {
        if(!(await this.getItem(item))) {
            await this.addItem(item);
        }
    }
}

module.exports = EventsSource;
