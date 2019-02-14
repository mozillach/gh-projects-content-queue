/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

const { default: Mastodon } = require("megalodon");
const ContentAccount = require("./content-account");
const self = require("../self");
const FormData = require("form-data");
const fetch = require("node-fetch");
const MastodonFormatter = require("../formatters/mastodon");

//TODO validation
//TODO mention events
//TODO schedule on mastodon :O (scheduled_at)

class MastodonAccount extends ContentAccount {
    static get Formatter() {
        return MastodonFormatter;
    }

    static getMediaAndContent(content) {
        if(content.search(/!\[[^\]]*\]\([^)]+\)/) !== -1) {
            const media = [];
            const pureText = content.replace(/!\[[^\]]*\]\(([^)]+)\)/g, (match, url) => {
                media.push(url);
                return '';
            });
            if(media.length > 4) {
                throw new Error("Can not upload more than 4 images per tweet");
            }
            return [ pureText.trim(), media ];
        }
        return [ content.trim(), [] ];
    }

    static getTootID(url) {
        // https://mastodon.social/@thinkMoult/100245050014943650
        // https://mastodon.social/users/thinkMoult/statuses/100245050014943650
        if(url.endsWith('/')) {
            url = url.substr(0, url.length - 1);
        }
        return url.split('/').pop();
    }

    constructor(config, client) {
        super({});

        this._client = client ? client : new Mastodon(config.accessToken, config.url);
        this._config = config;

        this.ready = this.checkLogin().catch((e) => {
            console.error("MastodonAccount checkLogin", e);
            throw e;
        });
    }

    async checkLogin() {
        const res = await this._client.pget('/accounts/verify_credentials');
        this.username = res.data.username;
        this.url = res.data.url;
    }

    async uploadMedia(url) {
        const data = new FormData();
        const image = await fetch(url);
        data.append('file', image.body);
        const res = await this._client.post('/media', data);
        return res.data.id;
    }

    async separateContentAndMedia(card) {
        const staticRef = self(this);
        const contentSection = staticRef.GetContentSection(card);
        const [ content, media ] = staticRef.getMediaAndContent(contentSection);
        const mediaIds = await Promise.all(media.map((m) => this.uploadMedia(m)));
        return [ content, mediaIds ];
    }

    getAccountLink() {
        return this.url;
    }

    async checkPosts(column, markPublished) {
    }

    isCardHighPrio(card) {
        return card.content.hasSection(self(this).Formatter.REPLY_TO);
    }

    async publish(card) {
        const staticRef = self(this);
        let successMsg;
        if(card.content.hasSection(staticRef.Formatter.REBLOG)) {
            const id = staticRef.getTootID(card.content.getSection(staticRef.Formatter.REBLOG));
            await this._client.post(`/statuses/${id}/reblog`);
            successMsg = "Successfully reblogged.";
        }
        else {
            const [ content, media ] = await this.separateContentAndMedia(card);
            const params = {
                status: content
            };
            if(media.length) {
                params.media_ids = media;
            }
            if(card.content.hasSection(staticRef.Formatter.REPLY_TO)) {
                params.in_reply_to_id = staticRef.getTootID(card.content.getSection(staticRef.Formatter.REPLY_TO));
            }
            if(card.content.hasSection(staticRef.Formatter.SPOILER)) {
                params.spoiler_text = card.content.getSection(staticRef.Formatter.SPOILER);
            }
            const res = await this._client.post('/statuses', params);
            successMsg = "Successfully posted. See " + res.data.url;
        }
        return successMsg;
    }

    async pin(statusUrl) {
        const id = self(this).getTootID(statusUrl);
        await this._client.post(`/statuses/${id}/pin`);
    }
}

module.exports = MastodonAccount;
