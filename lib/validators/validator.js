/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

const ScheduledDate = require("../scheduled-date");
const UpdateManager = require("../update-manager");
const Formatter = require("../formatters/formatter");

class Validator {
    static get TITLE() {
        return "General";
    }

    constructor(config) {
        this.config = config;
        /**
         * Content section titles (at least one of them must be set)
         */
        this.sections = new Set();
    }

    validateScheduled(scheduledSection, errors) {
        const due = new ScheduledDate(scheduledSection, this.config);

        if(!due.valid) {
            errors.push("Date can not be parsed. Please follow the format of "+this.config.schedulingTime.format);
        } else if(due.getTime() < Date.now() - UpdateManager.UPDATE_INTERVAL) {
            errors.push("Date is in the past. Please schedule tweet for some point in the future.");
        }
    }

    /**
     * Returns an error string if something is wrong with the card, else it's
     * just an empty string.
     *
     * @param {CardContent} cardContent - Content of the card to validate.
     * @returns {[string]} Errors with the card. Empty if there are no errors.
     */
    validate(cardContent) {
        const errors = [];

        if(!Array.from(this.sections.values()).some((s) => cardContent.hasSection(s))) {
            errors.push("Must have at least one content section per card.");
        }

        if(cardContent.hasSection(Formatter.CONTENT)) {
            const content = cardContent.getSection(Formatter.CONTENT);
            if(content == Formatter.TODO_PLACEHOLDER) {
                errors.push("Content is just a placeholder. Please replace it with the actual content to publish.");
            }
        }

        if(cardContent.hasSection(Formatter.SCHEDULED)) {
            this.validateScheduled(cardContent.getSection(Formatter.SCHEDULED), errors);
        }

        return errors;
    }
}

module.exports = Validator;
