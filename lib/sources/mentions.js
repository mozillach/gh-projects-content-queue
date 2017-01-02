/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

const Source = require("./source");
const TweetCardContent = require("../tweet-card-content");

class MentionsSource extends Source {
    constructor(board, twitterAccount) {
        super(board, twitterAccount);

        twitterAccount.on("mention", (tweet) => {
            console.log(tweet);
            //TODO avoid creating mentions that already have an issue.
            //TODO due date
            const issueText = TweetCardContent.createCard(`Prepare a reply for the request by the user ${tweet.user.screen_name}:
> ${tweet.text}`, false, null, null, `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`);

            //TODO somehow this goes to the wrong column
            board.createCard(`Mention by ${tweet.user.screen_name}`, issueText.toString());
            //TODO assign user to returned card
        });
    }
}
module.exports = MentionsSource;
