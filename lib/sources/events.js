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
const RepsEvents = require("../reps-events");
const TweetCardContent = require("../tweet-card-content");

class EventsSource extends Source {
    static getEventCardContent(event, config) {
        return TweetCardContent.createCard(`Event "[${event.summary}](${event.url})":

> ${event.description}`, false, event.start, config);
    }

    static getTitle(event) {
        return `${event.summary} (${event.start.toLocaleString()})`;
    }

    constructor(...args) {
        super(...args);

        this.events = new RepsEvents(this._config.query);

        this.events.on('created', (event) => this.handleEvent(event));

        this.events.events.then(async (events) => {
            for(const event of events) {
                await this.handleEvent(event);
            }
            const column = await this.getColumn('target');
            const cards = await column.cards;
            for(const card of cards.values()) {
                if(events.every((e) => EventsSource.getTitle(e) !== card.issue.title)) {
                    await card.issue.close();
                }
            }
        }).catch(console.error);
    }

    async getEvent(event) {
        const issues = await this._repo.issues.issues;
        const allIssues = Array.from(issues.values()).concat(Array.from((await this._repo.issues.closedIssues).values()));
        const title = EventsSource.getTitle(event);
        for(const issue of allIssues) {
            if(issue.title === title) {
                return issue;
            }
        }
        return false;
    }

    async addEvent(event) {
        return this._repo.createCard(
            EventsSource.getTitle(event),
            EventsSource.getEventCardContent(event, this._repo.config).toString(),
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
