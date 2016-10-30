import test from 'ava';
import TweetCardContent from '../lib/tweet-card-content';

const META_SECTION = "Tweet should be about";

test("Test static exports", (t) => {
    t.true("TWEET_CONTENT" in TweetCardContent);
    t.true("RETWEET" in TweetCardContent);
    t.true("SCHEDULED" in TweetCardContent);
});

test("Create card", (t) => {
    const meta = "test";
    const card = TweetCardContent.createCard(meta);
    t.true(card instanceof TweetCardContent);

    t.is(meta, card.getSection(META_SECTION));
    t.false(card.isRetweet);
    t.true(card.hasSection(TweetCardContent.TWEET_CONTENT));
    t.true(card.isValid());
});

test("Retweet", (t) => {
    const meta = "test";
    const card = TweetCardContent.createCard(meta, true);
    t.true(card instanceof TweetCardContent);

    t.is(meta, card.getSection(META_SECTION));
    t.true(card.isRetweet);
    t.true(card.hasSection(TweetCardContent.RETWEET));
    t.true(card.isValid());
});

test.todo("Test setSection");
test.todo("Test tweet length");
test.todo("Test with valid RT url");
test.todo("Test due date/SCHEDULED");
test.todo("Test error messages");
