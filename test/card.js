import test from 'ava';
import Card from '../lib/card';
import { getIssue, getConfig } from './_stubs';
import CardContent from '../lib/card-content';
import Formatter from '../lib/formatters/formatter';
import TwitterFormatter from '../lib/formatters/twitter';
import sinon from 'sinon';

test('updateContent', (t) => {
    const issue = getIssue(Formatter.Format(Formatter.TODO_PLACEHOLDER));
    const config = getConfig();
    const card = new Card(issue, config);

    t.is(card.content.getSection(Formatter.META), Formatter.TODO_PLACEHOLDER);
    t.true(issue.hasLabel(config.labels.invalid));
    t.false(issue.hasLabel(config.labels.ready));

    issue.content = issue.content.replace(Formatter.TODO_PLACEHOLDER, 'test');

    card.updateContent();

    t.is(card.content.getSection(Formatter.META), 'test');
});

test('setValidity marks as invalid label', (t) => {
    const issue = getIssue(TwitterFormatter.Format('bugs'));
    const config = getConfig();
    const card = new Card(issue, config);

    card.setValidity([ 'some error' ]);

    //t.true(issue.hasLabel(config.labels.retweet));
    t.true(issue.hasLabel(config.labels.invalid));
    t.false(issue.hasLabel(config.labels.ready));
});

test('setValidity immediately adds ready', (t) => {
    const issue = getIssue(Formatter.Format('bugs').replace(Formatter.META_PLACEHOLDER, 'ready'));
    const config = getConfig();
    const card = new Card(issue, config);

    card.setValidity([]);

    t.true(issue.hasLabel(config.labels.ready));
    t.false(issue.hasLabel(config.labels.invalid));
});

test('to string', (t) => {
    const content = Formatter.Format('test');
    const issue = getIssue(content);
    const card = new Card(issue, getConfig());

    t.is(card.toString(), content);
});

test('remind', async (t) => {
    const issue = getIssue();
    const card = new Card(issue, getConfig());

    issue.comment.resetHistory();
    issue.comment.resolves();
    const msg = 'foo';
    await card.remind(msg);

    t.true(issue.comment.calledOnce);
    t.true(issue.comment.lastCall.args[0].endsWith(msg));
});

test('comment', async (t) => {
    const issue = getIssue();
    const card = new Card(issue, getConfig());

    issue.comment.resetHistory();
    issue.comment.resolves();
    const msg = 'foo';
    await card.comment(msg);

    t.true(issue.comment.calledOnce);
    t.is(issue.comment.lastCall.args[0], msg);
});

test('assign', async (t) => {
    const issue = getIssue();
    const card = new Card(issue, getConfig());

    const user = 'foo';
    issue.assign.resolves();
    await card.assign(user);

    t.true(issue.assign.calledOnce);
    t.is(issue.assign.lastCall.args[0], user);
});

test('flush content', (t) => {
    const content = Formatter.Format('test');
    const issue = getIssue(content);
    const card = new Card(issue, getConfig());

    card._content.setSection(TwitterFormatter.TWEET_CONTENT, 'bar');

    card.flushContent();

    t.is(issue.content, card._content.toString());
});

test("can't tweet", (t) => {
    const card = new Card(getIssue(Formatter.Format('test')), getConfig());

    t.false(card.ready);
});

test("can't tweet due to scheduling", (t) => {
    const date = new Date(Date.now() + 6000000);
    const content = new CardContent(Formatter.Format('test', date, getConfig()), getConfig());
    content.setSection(TwitterFormatter.TWEET_CONTENT, 'bar');
    const card = new Card(getIssue(content.toString()), getConfig());

    t.false(card.ready);
});

test("can tweet", (t) => {
    const content = new CardContent(Formatter.Format('test'), getConfig());
    content.setSection(TwitterFormatter.TWEET_CONTENT, 'bar');
    const card = new Card(getIssue(content.toString()), getConfig());

    t.true(card.ready);
});

test.serial("can tweet with scheduling", (t) => {
    const clock = sinon.useFakeTimers();

    const date = new Date(Date.now() - 60);
    const content = new CardContent(Formatter.Format('test', date, getConfig()), getConfig());
    content.setSection(TwitterFormatter.TWEET_CONTENT, 'bar');
    const card = new Card(getIssue(content.toString()), getConfig());

    t.true(card.ready);

    clock.restore();
});

test('report errors', async (t) => {
    const issue = getIssue();
    const card = new Card(issue, getConfig());

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
    const card = new Card(issue, getConfig());

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
    const card = new Card(issue, getConfig());

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
    const card = new Card(issue, getConfig());

    const action = 'foo';
    const error = 'test';
    issue.comment.resetHistory();
    issue.comment.resolves();

    await card.reportError(action, error);

    t.true(issue.comment.calledOnce);
    t.true(issue.comment.lastCall.args[0].includes(action));
    t.true(issue.comment.lastCall.args[0].includes(error));
});
