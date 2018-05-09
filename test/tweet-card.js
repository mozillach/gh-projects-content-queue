import test from 'ava';
import TweetCard from '../lib/tweet-card';
import { getIssue, getConfig } from './_stubs';
import TweetCardContent from '../lib/tweet-card-content';
import sinon from 'sinon';

test('checkValidity', (t) => {
    const issue = getIssue();
    const config = getConfig();
    const card = new TweetCard(issue, config);

    t.true(issue.hasLabel(config.labels.invalid));
    t.false(issue.hasLabel(config.labels.ready));
    t.false(issue.hasLabel(config.labels.retweet));

    card.checkValidity();

    t.true(issue.comment.calledOnce);
});

test('updateContent', (t) => {
    const issue = getIssue(TweetCardContent.createCard('bugs').toString());
    const config = getConfig();
    const card = new TweetCard(issue, config);

    t.is(card.content.tweet, '_todo_');
    t.true(issue.hasLabel(config.labels.invalid));
    t.false(issue.hasLabel(config.labels.ready));

    issue.content = issue.content.replace('_todo_', 'test');

    card.updateContent();

    t.is(card.content.tweet, 'test');
});

test('checkValidity updates content', (t) => {
    const issue = getIssue();
    const config = getConfig();
    const card = new TweetCard(issue, config);

    t.true(issue.hasLabel(config.labels.invalid));
    t.false(issue.hasLabel(config.labels.ready));
    t.false(issue.hasLabel(config.labels.retweet));

    issue.content = TweetCardContent.createCard('bugs').toString().replace('_todo_', 'foo bar');

    card.checkValidity();

    t.true(issue.addLabel.calledTwice);
    t.true(issue.comment.calledOnce);
    t.true(issue.removeLabel.calledTwice);
    t.false(issue.hasLabel(config.labels.invalid));
    t.true(issue.hasLabel(config.labels.ready));
});

test('checkValidity adds retweet label', (t) => {
    const issue = getIssue(TweetCardContent.createCard('bugs', true).toString());
    const config = getConfig();
    const card = new TweetCard(issue, config);

    // card calls checkValidity in constructor, but let's make it obvious:
    card.checkValidity();

    t.true(issue.hasLabel(config.labels.retweet));
    t.true(issue.hasLabel(config.labels.invalid));
    t.false(issue.hasLabel(config.labels.ready));
});

test('checkValidity removes retweet label', (t) => {
    const issue = getIssue(TweetCardContent.createCard('bugs', true).toString());
    const config = getConfig();
    const card = new TweetCard(issue, config);

    t.true(issue.hasLabel(config.labels.retweet));

    issue.content = TweetCardContent.createCard('bugs').toString();
    card.checkValidity();

    t.false(issue.hasLabel(config.labels.retweet));
});

test('checkValidty immediately adds ready', (t) => {
    const issue = getIssue(TweetCardContent.createCard('bugs').toString().replace('_todo_', 'ready'));
    const config = getConfig();
    const card = new TweetCard(issue, config);

    card.checkValidity();

    t.true(issue.hasLabel(config.labels.ready));
    t.false(issue.hasLabel(config.labels.invalid));
});

test('to string', (t) => {
    const content = TweetCardContent.createCard('test');
    const issue = getIssue(content.toString());
    const card = new TweetCard(issue, getConfig());

    t.is(card.toString(), content.toString());
});

test('remind', async (t) => {
    const issue = getIssue();
    const card = new TweetCard(issue, getConfig());

    issue.comment.resetHistory();
    issue.comment.resolves();
    const msg = 'foo';
    await card.remind(msg);

    t.true(issue.comment.calledOnce);
    t.true(issue.comment.lastCall.args[0].endsWith(msg));
});

test('comment', async (t) => {
    const issue = getIssue();
    const card = new TweetCard(issue, getConfig());

    issue.comment.resetHistory();
    issue.comment.resolves();
    const msg = 'foo';
    await card.comment(msg);

    t.true(issue.comment.calledOnce);
    t.is(issue.comment.lastCall.args[0], msg);
});

test('assign', async (t) => {
    const issue = getIssue();
    const card = new TweetCard(issue, getConfig());

    const user = 'foo';
    issue.assign.resolves();
    await card.assign(user);

    t.true(issue.assign.calledOnce);
    t.is(issue.assign.lastCall.args[0], user);
});

test('flush content', (t) => {
    const content = TweetCardContent.createCard('test');
    const issue = getIssue(content.toString());
    const card = new TweetCard(issue, getConfig());

    card._content.setSection(TweetCardContent.TWEET_CONTENT, 'bar');

    card.flushContent();

    t.is(issue.content, card._content.toString());
});

test("can't tweet", (t) => {
    const card = new TweetCard(getIssue(TweetCardContent.createCard('test').toString()), getConfig());

    t.false(card.canTweet);
});

test("can't tweet due to scheduling", (t) => {
    const date = new Date(Date.now() + 6000000);
    const content = TweetCardContent.createCard('test', false, date, getConfig());
    content.setSection(TweetCardContent.TWEET_CONTENT, 'bar');
    const card = new TweetCard(getIssue(content.toString()), getConfig());

    t.false(card.canTweet);
});

test("can tweet", (t) => {
    const content = TweetCardContent.createCard('test');
    content.setSection(TweetCardContent.TWEET_CONTENT, 'bar');
    const card = new TweetCard(getIssue(content.toString()), getConfig());

    t.true(card.canTweet);
});

test.serial("can tweet with scheduling", (t) => {
    const clock = sinon.useFakeTimers();

    const date = new Date(Date.now() - 60);
    const content = TweetCardContent.createCard('test', false, date, getConfig());
    content.setSection(TweetCardContent.TWEET_CONTENT, 'bar');
    const card = new TweetCard(getIssue(content.toString()), getConfig());

    t.true(card.canTweet);

    clock.restore();
});

test('report errors', async (t) => {
    const issue = getIssue();
    const card = new TweetCard(issue, getConfig());

    const errors = [
        'foo',
        'bar',
        'baz'
    ];
    issue.comment.resetHistory();
    issue.comment.resolves();

    await card.reportErrors(errors);

    t.true(issue.comment.calledOnce);
    for(const error of errors) {
        t.true(issue.comment.lastCall.args[0].includes(error));
    }
});

test('report error Error instance', async (t) => {
    const issue = getIssue();
    const card = new TweetCard(issue, getConfig());

    const action = 'foo';
    const error = new Error('test');
    issue.comment.resetHistory();
    issue.comment.resolves();

    await card.reportError(action, error);

    t.true(issue.comment.calledOnce);
    t.true(issue.comment.lastCall.args[0].includes(action));
    t.true(issue.comment.lastCall.args[0].includes(error.toString()));
});

test('report error Object instance', async (t) => {
    const issue = getIssue();
    const card = new TweetCard(issue, getConfig());

    const action = 'foo';
    const error = {
        test: 'lorem ipsum'
    };
    issue.comment.resetHistory();
    issue.comment.resolves();

    await card.reportError(action, error);

    t.true(issue.comment.calledOnce);
    t.true(issue.comment.lastCall.args[0].includes(action));
    t.true(issue.comment.lastCall.args[0].includes(JSON.stringify(error, null, 2)));
});

test('report error String instance', async (t) => {
    const issue = getIssue();
    const card = new TweetCard(issue, getConfig());

    const action = 'foo';
    const error = 'test';
    issue.comment.resetHistory();
    issue.comment.resolves();

    await card.reportError(action, error);

    t.true(issue.comment.calledOnce);
    t.true(issue.comment.lastCall.args[0].includes(action));
    t.true(issue.comment.lastCall.args[0].includes(error));
});
