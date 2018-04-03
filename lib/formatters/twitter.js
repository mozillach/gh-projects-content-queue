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

    static GetTemplateSections(config) {
        //TODO add sections for Twitter
        return super.GetTemplateSections(config);
    }

    static Format(options, config) {
        let content = super.Format(options.meta, options.dueDate, config);

        if(options.isRetweet) {
            content += this.CreateSection(this.RETWEET, options.retweet || this.TODO_PLACEHOLDER) + "\n";
        }
        else {
            content += this.CreateSection(this.TWEET_CONTENT, options.content || this.TODO_PLACEHOLDER) + "\n";
        }

        if(options.replyTo) {
            content += this.CreateSection(this.REPLY_TO, options.replyTo);
        }

        return content;
    }
}

module.exports = TwitterFormatter;
