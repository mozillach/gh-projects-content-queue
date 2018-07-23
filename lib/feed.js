/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/**
 * @module feed
 * @license MPL-2.0
 */
"use strict";

const DataStoreHolder = require("./data-store-holder");
const FeedParser = require("feedparser");
const fetch = require("node-fetch");
const getStream = require("get-stream");

async function getFeed(items = []) {
    const res = await fetch(this.url);
    if(res.ok && res.status === 200) {
        const feedParser = new FeedParser({
            feedurl: this.url
        });
        res.body.pipe(feedParser);
        const newItems = await getStream.array(feedParser);
        for(const item of newItems) {
            if(!items.some((i) => i.link == item.link)) {
                this.emit('published', item);
            }
        }
        return newItems;
    }
    return items;
};
getFeed.emitsEvents = true;


class Feed extends DataStoreHolder {
    connstructor(url) {
        super({
            items: getFeed
        });

        this.url = url;
    }
}
module.exports = Feed;
