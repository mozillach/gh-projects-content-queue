import test from 'ava';
import TweetCardContent from '../lib/tweet-card-content';
import { getConfig } from './_stubs';

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
    t.false(card.isValid);
});

test("Retweet", (t) => {
    const meta = "test";
    const card = TweetCardContent.createCard(meta, true);
    t.true(card instanceof TweetCardContent);

    t.is(meta, card.getSection(META_SECTION));
    t.true(card.isRetweet);
    t.true(card.hasSection(TweetCardContent.RETWEET));
    t.false(card.isValid);
});

test("Create due date", (t) => {
    const meta = "test";
    const dueDate = new Date(1503707700000);
    const card = TweetCardContent.createCard(meta, false, dueDate, getConfig());
    t.true(card instanceof TweetCardContent);

    t.is(meta, card.getSection(META_SECTION));
    t.true(card.isScheduled);
    t.is(card.date.getTime(), dueDate.getTime());
    t.false(card.isValid);
});

test("Create reply", (t) => {
    const meta = "test";
    const replyTo = "lorem";
    const card = TweetCardContent.createCard(meta, false, undefined, getConfig(), replyTo);
    t.true(card instanceof TweetCardContent);

    t.is(meta, card.getSection(META_SECTION));
    t.true(card.isReply);
    t.is(card.replyTo, replyTo);
    t.false(card.isValid);
});

test("toString is value", (t) => {
    const card = TweetCardContent.createCard('test');

    t.is(card.toString(), card.valueOf());
});

test('get section strips trailing newlines', (t) => {
    const card = new TweetCardContent(`## test
content

`);

    t.is(card.getSection('test'), 'content');
});


test('set section replaces content', (t) => {
    const card = new TweetCardContent(`## test
asdf

## foo
bar`);

    card.setSection('foo', 'baz');

    t.is(card.toString(), `## test
asdf

## foo
baz`);
});

test('has section', (t) => {
    const card = new TweetCardContent(`## test
lorem ipsum`);
    t.true(card.hasSection('test'));
    t.false(card.hasSection('foo'));
});

test('Tweet content', (t) => {
    const card = TweetCardContent.createCard('test');
    t.is(card.tweet, '_todo_');
})

test.todo("Test with valid RT url");
test.todo("Test error messages");
