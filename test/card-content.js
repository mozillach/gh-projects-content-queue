import test from 'ava';
import CardContent from '../lib/card-content';
import { getConfig } from './_stubs';
import Formatter from '../lib/formatters/formatter';
import TwitterFormatter from '../lib/formatters/twitter';

test("Test static exports", (t) => {
    t.true("TWEET_CONTENT" in TwitterFormatter);
    t.true("RETWEET" in TwitterFormatter);
    t.true("SCHEDULED" in Formatter);
    t.true("META" in Formatter);
    t.true("TODO_PLACEHOLDER" in Formatter);
});

test("Create card", (t) => {
    const meta = "test";
    const card = new CardContent(Formatter.Format(meta));

    t.is(meta, card.getSection(Formatter.META));
    t.false(card.isRetweet);
    t.true(card.hasSection(TwitterFormatter.TWEET_CONTENT));
    t.false(card.isValid);
});

test("Retweet", (t) => {
    const meta = "test";
    const card = new CardContent(TwitterFormatter.Format(meta, true));

    t.is(meta, card.getSection(Formatter.META));
    t.true(card.isRetweet);
    t.true(card.hasSection(TwitterFormatter.RETWEET));
    t.false(card.isValid);
});

test("Create due date", (t) => {
    const meta = "test";
    const dueDate = new Date(1503707700000);
    const card = new CardContent(Formatter.Format(meta, dueDate, getConfig()), getConfig());

    t.is(meta, card.getSection(Formatter.META));
    t.true(card.isScheduled);
    t.is(card.date.getTime(), dueDate.getTime());
    t.false(card.isValid);
});

test("Create reply", (t) => {
    const meta = "test";
    const replyTo = "lorem";
    const card = new CardContent(TwitterFormatter.Format(meta, false, undefined, getConfig(), replyTo), getConfig());

    t.is(meta, card.getSection(Formatter.META));
    t.true(card.isReply);
    t.is(card.replyTo, replyTo);
    t.false(card.isValid);
});

test("toString is value", (t) => {
    const card = new CardContent('test');

    t.is(card.toString(), card.valueOf());
});

test('get section strips trailing newlines', (t) => {
    const card = new CardContent(`## test
content

`);

    t.is(card.getSection('test'), 'content');
});


test('set section replaces content', (t) => {
    const card = new CardContent(`## test
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
    const card = new CardContent(`## test
lorem ipsum`);
    t.true(card.hasSection('test'));
    t.false(card.hasSection('foo'));
});

test('Tweet content', (t) => {
    const card = new CardContent(TwitterFormatter.Format('test'), getConfig());
    t.is(card.getSection(TwitterFormatter.TWEET_CONTENT), Formatter.META);
});

test('Working retweet', (t) =>  {
    const card = new CardContent(TwitterFormatter.Format('foo bar', true), getConfig());
    card.setSection(TwitterFormatter.RETWEET, 'https://twitter.com/mozillach/status/1234');

    t.true(card.isRetweet);
    t.true(card.isValid);
});

test.todo("Test error messages");
