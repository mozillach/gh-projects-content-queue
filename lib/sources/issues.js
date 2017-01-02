/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

const Source = require("./source");

class IssuesSource extends Source {
    static get requiredColumns() {
        return [
            "ideas"
        ];
    }

    constructor(board, twitterAccount) {
        super(board, twitterAccount);

        board.on("opened", (issue) => {
            // If the card is in no other column add it to the backlog.
            return board.addCard(issue);
        });
    }
}
module.exports = IssuesSource;
