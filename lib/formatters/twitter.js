/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

const Formatter = require("./formatter");

class TwitterFormatter extends Formatter {
    /**
     * Section title for the tweet content.
     *
     * @type {string}
     * @readonly
     */
    static get TWEET_CONTENT() {
        return "Tweet Content";
    }

    /**
     * Section title for retweet.
     *
     * @type {string}
     * @readonly
     */
    static get RETWEET() {
        return "Retweet";
    }

    /**
     * Section title for tweet to reply to.
     *
     * @type {string}
     * @readonly
     */
    static get REPLY_TO() {
        return "Reply to";
    }

    static get TYPE() {
        return "Twitter";
    }

    static get CONTENT_SECTIONS() {
        return [
            this.RETWEET,
            this.TWEET_CONTENT
        ].concat(super.CONTENT_SECTIONS);
    }

    static GetTemplateSections(config) {
        const sections = super.GetTemplateSections(config);
        sections[this.TWEET_CONTENT] = this.TODO_PLACEHOLDER;
        sections[this.RETWEET] = "https://twitter.com/username/status/tweetID\n<!-- Replace with full permalink to tweet to retweet in this section. -->";
        sections[this.REPLY_TO] = "https://twitter.com/username/status/tweetID\n<!-- Replace with full permalink to tweet to reply to in this section or remove section. -->";
        return sections;
    }

    static GetTemplates() {
        return {
            Tweet: [
                this.META,
                this.TWEET_CONTENT,
                this.REPLY_TO,
                this.SCHEDULED
            ],
            Retweet: [
                this.META,
                this.RETWEET,
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

        if(options.isRetweet) {
            content += this.CreateSection(this.RETWEET, options.retweet || this.GetTemplateSections(config)[this.RETWEET]) + "\n";
        }
        else {
            content += this.CreateSection(this.TWEET_CONTENT, options.content || this.GetTemplateSections(config)[this.TWEET_CONTENT]) + "\n";
        }

        if(options.replyTo) {
            content += this.CreateSection(this.REPLY_TO, options.replyTo);
        }

        return content;
    }
}

module.exports = TwitterFormatter;
