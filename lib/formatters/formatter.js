/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

const ScheduledDate = require("../scheduled-date");

class Formatter {
    /**
     * Section title for schdeuled date.
     *
     * @type {string}
     * @readonly
     */
    static get SCHEDULED() {
        return "Scheduled for";
    }

    static get META() {
        return "Content description";
    }

    static get TODO_PLACEHOLDER() {
        return "_todo_";
    }

    /**
     * Nice name of the service this formatter is for.
     *
     * @type {string}
     * @readonly
     */
    static get TYPE() {
        throw new Error("Cannot get type of default formatter");
    }

    /**
     * @param {string} title - Title of the section.
     * @param {string} content - Contents of the section.
     * @returns {string} Markdown formatted section for an issue.
     */
    static CreateSection(title, content) {
        return `## ${title}
${content}
`;
    }

    /**
     * @param {module:config~Config} config - Configuration.
     * @return {string} Keys are section titles, value is the default section content.
     */
    static GetTemplateSections(config) {
        return {
            [this.META]: "_Description of the content and reasoning for posting it_",
            [this.SCHEDULED]: ScheduledDate.formatDate(new Date(0), config.schedulingTime.format, config.schedulingTime.timezone) + "\n<!-- Remove this section if you don't want to schedule this content. -->"
        };
    }

    static GetTemplates() {
        return {
            Card: [
                this.META,
                this.SCHEDULED
            ]
        };
    }

    /**
     * @param {string} [meta] - Meta description for the card content.
     * @param {external:Date} [date] - Optional date the card is scheduled for.
     * @param {module:config~Config} [config] - Configuration, required when
     *                                          specifying a scheduled date.
     * @return {string} Card content.
     */
    static Format(meta, date, config) {
        let content = this.CreateSection(this.META, meta || this.TODO_PLACEHOLDER) + "\n";

        if(date && config) {
            content += this.CreateSection(this.SCHEDULED, ScheduledDate.formatDate(date, config.schedulingTime.format, config.schedulingTime.timezone));
        }

        return content;
    }
}

module.exports = Formatter;
