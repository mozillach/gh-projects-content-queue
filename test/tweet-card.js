import test from 'ava';
import TweetCard from '../lib/tweet-card';
import { getIssue, getConfig } from './_stubs';
import TweetCardContent from '../lib/tweet-card-content';

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

test.todo('reportErrors');
test.todo('comment');
