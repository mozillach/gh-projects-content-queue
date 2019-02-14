/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

const Formatter = require("./formatter");

class MastodonFormatter extends Formatter {
    /**
     * Section title for the toot content.
     *
     * @type {string}
     * @readonly
     */
    static get TOOT_CONTENT() {
        return "Toot Content";
    }

    /**
     * Section title for reblog.
     *
     * @type {string}
     * @readonly
     */
    static get REBLOG() {
        return "Reblog";
    }

    /**
     * Section title for toot to reply to.
     *
     * @type {string}
     * @readonly
     */
    static get REPLY_TO() {
        return "Reply to";
    }

    /**
     * Section title for toot spoiler warning.
     *
     * @type {string}
     * @readonly
     */
    static get SPOILER() {
        return "Spoiler warning";
    }

    static get TYPE() {
        return "Mastodon";
    }

    static get CONTENT_SECTIONS() {
        return [
            this.REBLOG,
            this.TOOT_CONTENT
        ].concat(super.CONTENT_SECTIONS);
    }

    static GetTemplateSections(config) {
        const sections = super.GetTemplateSections(config);
        sections[this.TOOT_CONTENT] = this.TODO_PLACEHOLDER;
        sections[this.REBLOG] = "https://mastodon.social/username/status/tootID\n<!-- Replace with full permalink to toot to reblog in this section. -->";
        sections[this.REPLY_TO] = "https://mastodon.social/username/status/tootID\n<!-- Replace with full permalink to toot to reply to in this section or remove section. -->";
        sections[this.SPOILER] = "<!-- Replace with spoiler warning or remove this section. -->"
        return sections;
    }

    static GetTemplates() {
        return {
            Tweet: [
                this.META,
                this.TOOT_CONTENT,
                this.REPLY_TO,
                this.SPOILER,
                this.SCHEDULED
            ],
            Retweet: [
                this.META,
                this.REBLOG,
                this.SCHEDULED
            ]
        };
    }

    static Format(options, config) {
        let content = super.Format({
            meta: options.meta,
            dueDate: options.dueDate,
            noContent: true
        }, config);

        if(options.isReblog) {
            content += this.CreateSection(this.RETWEET, options.reblog || this.GetTemplateSections(config)[this.REBLOG]) + "\n";
        }
        else {
            content += this.CreateSection(this.TOOT_CONTENT, options.content || this.GetTemplateSections(config)[this.TOOT_CONTENT]) + "\n";
        }

        if(options.replyTo) {
            content += this.CreateSection(this.REPLY_TO, options.replyTo);
        }

        return content;
    }
}

module.exports = MastodonFormatter;
