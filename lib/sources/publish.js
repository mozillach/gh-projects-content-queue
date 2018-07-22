/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/**
 * @module sources/publish
 * @license MPL-2.0
 */
"use strict";

const Source = require("./source");
const self = require("../self");
const ContentAccount = require("../accounts/content-account");

/**
 * @alias module:sources/publish.PublishSource
 * @extends module:sources/source.Source
 */
class PublishSource extends Source {
    static get requiredColumns() {
        return [
            "source",
            "target"
        ];
    }

    static get managedColumns() {
        return [
            "target"
        ];
    }

    static get requiredConfig() {
        return super.requiredConfig.concat([
            'accountType',
            'accountName'
        ]);
    }

    /**
     * @inheritdoc
     */
    constructor(...args) {
        super(...args);

        this.lastUpdate = Date.now();
        this._account = this._accountManager.getAccount(this._config.accountType, this._config.accountName);
        if(!(this._account instanceof ContentAccount)) {
            throw new Error(`Account of type ${this._config.accountType} can not publish content.`);
        }

        this._repo.ready.then(() => {
            this._repo.board.on("storesupdated", () => this.onUpdated());
        });

        Promise.all([
            this.getColumn('source'),
            this.getColumn('target')
        ]).then(async ([ column, target ]) => {
            return this._account.checkPosts(column, (card, msg) => this.cardPublished(card, msg, target));
        }).catch(console.error);
    }

    /**
     * Moves a card to the published column and closes the issue.
     *
     * @async
     * @param {module:card.Card} card - Card to mark as published.
     * @param {string} successMsg - Success message by account from publish.
     * @param {string} column - Column to move to.
     * @returns {undefined}
     */
    cardPublished(card, successMsg, column) {
        return Promise.all([
            card.issue.close(),
            this._repo.board.moveCardToColumn(card, column, false, "top"),
            card.comment(successMsg)
        ]);
    }

    async onUpdated() {
        const [ source, target ] = await Promise.all([
            this.getColumn('source'),
            this.getColumn('target')
        ]);
        const cardsToPublish = await source.cards;
        if(cardsToPublish.size == 0) {
            return;
        }
        let scheduledPostsCount = this.getCurrentQuota();
        const highPriority = [],
            lowPriority = [];
        for(const card of cardsToPublish.values()) {
            // There is no guarantee that issue content is current here (due to
            // caching) thus we force update the card content.
            await this._repo.updateCard(card);
            if(card.ready) {
                if(card.content.isScheduled || this._account.isCardHighPrio(card)) {
                    highPriority.push(card);
                }
                else {
                    lowPriority.push(card);
                }
            }
        }

        // Not a Promise.all to prevent hitting the project board endpoint concurrently.
        if(highPriority.length) {
            for(const card of highPriority) {
                await this.publish(card, target);
                if(!this._account.isCardHighPrio(card)) {
                    --scheduledPostsCount;
                }
            }
        }
        if(lowPriority.length && scheduledPostsCount > 0) {
            for(const card of lowPriority) {
                await this.publish(card, target);
                if(--scheduledPostsCount <= 0) {
                    break;
                }
            }
        }
    }

    async publish(card, target) {
        try {
            const result = await this._acccount.publish(card);
            this.cardPublished(card, result, target);
        }
        catch(e) {
            card.reportError("publish", e);
        }
    }

    static getUTCHourMinuteDate(hour, minute, dayDiff = 0) {
        const now = new Date();
        return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dayDiff, hour, minute);
    }

    getCurrentQuota() {
        if(this._config.schedule && this._config.schedule.length) {
            const now = new Date();
            const interval = now.getTime() - this.lastUpdate;
            let scheduledPostsCount = 0;
            const intervalHours = Math.floor(interval / 3600000);
            const intervalMinutes = interval - (intervalHours * 3600000) / 60000;

            for(const s of this._config.schedule) {
                const time = s.split(":").map((t) => parseInt(t, 10));
                let dayDiff = 0;
                if(time[0] < now.getUTCHours() - intervalHours || (time[0] == now.getUTCHours() && time[1]  < now.getUTCMinutes() - intervalMinutes)) {
                    dayDiff = -1;
                }
                const date = self(this).getUTCHourMinuteDate(time[0], time[1], dayDiff);
                const difference = now.getTime() - date;
                if(difference >= 0 && difference < interval) {
                    ++scheduledPostsCount;
                }
            }

            this.lastUpdate = now.getTime();
            return scheduledPostsCount;
        }
        return Infinity;
    }
}
module.exports = PublishSource;
