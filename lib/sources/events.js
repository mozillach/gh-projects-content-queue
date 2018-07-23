/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/**
 * @module sources/events
 * @license MPL-2.0
 * @todo queue reweet of event once tweet has been posted?
 * @todo pinning
 */
"use strict";

const Source = require("./source");
const Events = require("../events");
const ScheduledDate = require("../scheduled-date");
const Formatter = require("../formatters/formatter");
const self = require("../self");

class EventsSource extends Source {
    static getEventCardContent(event, config) {
        return Formatter.Format({
            meta: `Event "[${event.summary}](${event.url})":

> ${event.description}`,
            dueDate: event.start
        }, config);
    }

    static getTitle(event, config) {
        return `${event.summary} (${ScheduledDate.formatDate(event.start, config.schedulingTime.format)})`;
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

        this.events = new Events(this._config.url);

        this.events.on('created', (event) => this.handleEvent(event));
    }

    async getEvent(event) {
        await this._repo.ready;
        const issues = await this._repo.issues.issues;
        const allIssues = Array.from(issues.values()).concat(Array.from((await this._repo.issues.closedIssues).values()));
        const title = self(this).getTitle(event, this._repo.config);
        for(const issue of allIssues) {
            if(issue.title === title) {
                return issue;
            }
        }
        return false;
    }

    async addEvent(event) {
        return this._repo.createCard(
            self(this).getTitle(event, this._repo.config),
            self(this).getEventCardContent(event, this._repo.config),
            await this.getColumn('target')
        );
    }

    async handleEvent(event) {
        if(!(await this.getEvent(event))) {
            await this.addEvent(event);
        }
    }
}

module.exports = EventsSource;
