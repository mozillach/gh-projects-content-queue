/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

calss TweetCard {
    constructor() {
        this.content = content;
    }

    checkValidity() {
        const contentError = this.content.getCardError();
        if(contentError) {
            this.reportError(contentError);
        }

        //TODO set ready/invalid labels
    }

    remindAssignee() {
        this.comment();
    }

    assign(user) {
    }

    reportError(error) {
        //TODO add some error info test and emoji stuff
        this.comment(error);
    }

    comment(msg) {
    }

    get content() {
    }

    flushContent() {
    }
}
