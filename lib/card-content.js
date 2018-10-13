/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/**
 * @module card-content
 * @license MPL-2.0
 */
"use strict";

const ScheduledDate = require("./scheduled-date");
const Formatter = require("./formatters/formatter");

/**
 * Abstraction over the cards used on the actual board. Represents a planned
 * tweet. Uses GitHub issues with a specific format to extract the data.
 *
 * @alias module:card-content.CardContent
 */
class CardContent {
    constructor(issueContent, config) {
        /**
         * Card content with normalized newlines.
         *
         * @type {string}
         */
        this.raw = issueContent.replace(/\r(?:\n)?/g, '\n');
        /**
         * @type {module:config~Config}
         */
        this.config = config;
    }

    toString() {
        return this.raw;
    }

    valueOf() {
        return this.raw;
    }

    /**
     * Returns the contents of the section with the given title. Strips the last
     * newline.
     *
     * @param {string} title - Title of the section to return.
     * @returns {string} The contents of the section without trailing newlines.
     */
    getSection(title) {
        return this.raw
            .split("##")
            .find((s) => s.startsWith(" "+title+"\n"))
            .trim()
            .substr(title.length)
            .trimLeft();
    }

    /**
     * Replaces the content of a section. Does not do anything if a section does
     * not exist.
     *
     * @param {string} title - Title of the section to update.
     * @param {string} content - Content of the section to set.
     * @returns {undefined}
     */
    setSection(title, content) {
        this.raw = this.raw.replace(
            Formatter.CreateSection(title, this.getSection(title)).trim(),
            Formatter.CreateSection(title, content).trim()
        );
    }

    /**
     * Checks if the card contains a section.
     *
     * @param {string} title - Title of the section to look for.
     * @returns {boolean} Whether the section exists.
     */
    hasSection(title) {
        return this.raw.includes(`## ${title}
`);
    }

    /**
     * @type {boolean}
     * @readonly
     */
    get isScheduled() {
        return this.hasSection(Formatter.SCHEDULED);
    }

    /**
     * The planned publish date for the tweet.
     *
     * @type {module:scheduled-date.ScheduledDate}
     * @readonly
     */
    get date() {
        const d = this.getSection(Formatter.SCHEDULED);
        return new ScheduledDate(d, this.config);
    }
}

module.exports = CardContent;
