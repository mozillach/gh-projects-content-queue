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

    static get CONTENT() {
        return "Content";
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

    static get CONTENT_SECTIONS() {
        return [
            this.CONTENT
        ];
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
            [this.CONTENT]: this.TODO_PLACEHOLDER,
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

    static Format(options, config) {
        let content = this.CreateSection(this.META, options.meta || this.TODO_PLACEHOLDER) + "\n";

        if(options.content) {
            content += this.CreateSection(this.CONTENT, options.content);
        }
        else if(!options.noContent) {
            content += this.CreateSection(this.CONTENT, this.TODO_PLACEHOLDER);
        }

        if(options.dueDate && config) {
            content += this.CreateSection(this.SCHEDULED, ScheduledDate.formatDate(options.dueDate, config.schedulingTime.format, config.schedulingTime.timezone));
        }

        return content;
    }
}

module.exports = Formatter;
