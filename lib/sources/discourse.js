/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/**
 * @module sources/discourse
 * @license MPL-2.0
 */
"use strict";

const Source = require("./source");
const DiscourseThreads = require("../discourse-threads");
const TweetCardContent = require("../tweet-card-content");

class DiscourseSource extends Source {
    static getDiscourseCardContent(thread, config) {
        return TweetCardContent.createCard(`[__${thread.title}__](${thread.slug})

> ${thread.excerpt}`, false, undefined, config);
    }

    static getTitle(thread, config) {
        return `${thread.title} (${config.forum})`;
    }

    static get requiredConfig() {
        return Source.requiredConfig.concat([
            'forum',
            'apiUrl',
            'apiKey',
            'username'
        ]);
    }

    static get requiredColumns() {
        return [
            'target'
        ];
    }

    constructor(...args) {
        super(...args);

        this.discourse = new DiscourseThreads(this._config.apiUrl, this._config.apiKey, this._config.username, this._config.forum);

        this.discourse.on('created', (thread) => this.handleThread(thread));

        //TODO misses some cards because they are being filled at startup.
        this.discourse.threads.then(async (threads) => {
            for(const thread of threads) {
                await this.handleThread(thread);
            }
            const column = await this.getColumn('target');
            const cards = await column.cards;
            for(const card of cards.values()) {
                if(threads.every((e) => DiscourseSource.getTitle(e, this._config) !== card.issue.title)) {
                    await card.issue.close();
                }
            }
        }).catch(console.error);
    }

    async getThread(thread) {
        const issues = await this._repo.issues.issues;
        const allIssues = Array.from(issues.values()).concat(Array.from((await this._repo.issues.closedIssues).values()));
        const title = DiscourseSource.getTitle(thread, this._config);
        for(const issue of allIssues) {
            if(issue.title === title) {
                return issue;
            }
        }
        return false;
    }

    async addThread(thread) {
        return this._repo.createCard(
            DiscourseSource.getTitle(thread, this._config),
            DiscourseSource.getEventCardContent(thread, this._repo.config).toString(),
            await this.getColumn('target')
        );
    }

    async handleThread(thread) {
        if(!(await this.getThread(thread))) {
            await this.addThread(thread);
        }
    }
}

module.exports = DiscourseSource;
