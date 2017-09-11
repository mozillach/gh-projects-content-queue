import test from 'ava';
import TweetCard from '../lib/tweet-card';
import { getIssue, getConfig } from './_stubs';
import TweetCardContent from '../lib/tweet-card-content';

test('checkValidity', (t) => {
    const issue = getIssue();
    const config = getConfig();
    const card = new TweetCard(issue, config);

    card.checkValidity();

    t.true(issue.addLabel.calledTwice);
    t.true(issue.comment.calledTwice);
});

test('updateContent', (t) => {
    const issue = getIssue(TweetCardContent.createCard('bugs').toString());
    const config = getConfig();
    const card = new TweetCard(issue, config);

    t.is(card.content.tweet, '_todo_');

    issue.content = issue.content.replace('_todo_', 'test');

    card.updateContent();

    t.is(card.content.tweet, 'test');
});

test('checkValidity updates content', (t) => {
    const issue = getIssue();
    const config = getConfig();
    const card = new TweetCard(issue, config);

    issue.content = TweetCardContent.createCard('bugs').toString();

    card.checkValidity();

    t.true(issue.addLabel.calledTwice);
    t.true(issue.comment.calledTwice);
    t.true(issue.removeLabel.calledTwice);
});

test.todo('reportErrors');
test.todo('comment');
