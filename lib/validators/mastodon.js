/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

const Validator = require("./validator");
const MastodonFormatter = require("../formatters/mastodon");
const MastodonAccount = require("../accounts/mastodon");

const TOOT_LENGTH = 500;

class MastodonValidator extends Validator {
    static get TITLE() {
        return MastodonAccount.TYPE;
    }

    constructor(config) {
        super(config);

        this.sections.add(MastodonFormatter.TOOT_CONTENT);
        this.sections.add(MastodonFormatter.REBLOG);
    }

    validate(cardContent) {
        const errors = super.validate(cardContent);
        if(!MastodonFormatter.CONTENT_SECTIONS.some((section) => cardContent.hasSection(section))) {
            errors.push(`Missing a section containing information on what to toot. Please either add a "${MastodonFormatter.CONTENT}" or "${MastodonFormatter.REBLOG}" section.`);
        }
        else {
            if(cardContent.hasSection(MastodonFormatter.REBLOG)) {
                const reblogUrl = cardContent.getSection(MastodonFormatter.REBLOG);
                if(reblogUrl.length === 0  || MastodonAccount.getTootID(reblogUrl) === null) {
                    errors.push("URL for toot to reblog is not valid. Please provide only the toot permalink.");
                }
                /*else if() {
                    errors.push("Cannot reblog the given toot because it does not exist or is private.");
                }*/
            }
            else {
                if(cardContent.hasSection(MastodonFormatter.CONTENT)) {
                    const toot = cardContent.getSection(MastodonFormatter.CONTENT);
                    try {
                        const [ content ] = MastodonAccount.getMediaAndContent(toot);
                        if(content.length > TOOT_LENGTH) {
                            errors.push(`Content is too long by ${TOOT_LENGTH - content.length} for a toot. Please shorten the text to fit into ${TOOT_LENGTH} characters or specify a separate shortened version in a "${MastodonFormatter.TOOT_CONTENT}" section.`);
                        }
                    }
                    catch(e) {
                        console.error(e);
                        errors.push(`Can not attach more than 4 images to a toot. Remove some images or specify a version with less images in a "${MastodonAccount.TOOT_CONTENT}" section.`);
                    }
                }
                else {
                    const toot = cardContent.getSection(MastodonFormatter.TOOT_CONTENT);
                    if(toot.trim() == MastodonFormatter.TODO_PLACEHOLDER) {
                        errors.push("Toot content is just a placeholder. Please replace it with the actual content for the toot.");
                    }

                    try {
                        const [ content ] = MastodonAccount.getMediaAndContent(toot);
                        if(content.length > TOOT_LENGTH) {
                            errors.push(`Content is too long by ${TOOT_LENGTH - content.length} for a toot. Please shorten the text to fit into ${TOOT_LENGTH} characters.`);
                        }
                    }
                    catch(e) {
                        console.error(e);
                        errors.push(`Can not attach more than 4 images to a toot.`);
                    }
                }

                if(cardContent.hasSection(MastodonFormatter.REPLY_TO)) {
                    const replyTo = cardContent.getSection(MastodonFormatter.REPLY_TO);
                    if(replyTo.length === 0 || MastodonAccount.getTootID(replyTo) === null) {
                        errors.push("The URL of toot this is a response to is invalid. Please use the toot permalink.");
                    }
                }
            }
        }
        return errors;
    }
}

module.exports = MastodonValidator;
