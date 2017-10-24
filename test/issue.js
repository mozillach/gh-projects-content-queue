import test from 'ava';
import { getGithubClient, getIssueData } from './_stubs';
import Issue from '../lib/issue';

test.beforeEach((t) => {
    t.context.gh = getGithubClient();
    t.context.data = getIssueData();
    t.context.issue = new Issue(t.context.gh, t.context.data);
});

test.afterEach((t) => {
    t.context.gh.argumentsValid((assertion, message) => t.true(assertion, message));
});

test('constructor and update', (t) => {
    const issue = t.context.issue;
    const data = t.context.data;

    t.is(issue.assignee, null);
    t.is(issue.content, data.content);
    t.is(issue.title, data.title);
    t.is(issue.lastUpdate, Date.parse(data.updated_at));
    t.is(issue.id, data.id);
    t.is(issue.number, data.number);
    t.is(issue.owner, data.owner);
    t.is(issue.repo, data.repo);
    t.is(issue.labels, data.labels);
    t.is(issue.state, data.state);
});

test('comment', (t) => {
    const commentContent = 'foo bar';
    t.context.issue.comment(commentContent);

    t.true(t.context.gh.issues.createComment.calledOnce);
    t.deepEqual(t.context.gh.issues.createComment.lastCall.args[0], {
        owner: t.context.data.owner,
        repo: t.context.data.repo,
        number: t.context.data.number,
        body: commentContent
    });
});

test('set content', async (t) => {
    const newContent = 'foo bar';
    const lastUpdate = t.context.issue.lastUpdate;

    t.context.gh.issues.edit.resolves();
    t.context.issue.content = newContent;

    t.true(t.context.gh.issues.edit.calledOnce);
    t.deepEqual(t.context.gh.issues.edit.lastCall.args[0], {
        owner: t.context.data.owner,
        repo: t.context.data.repo,
        number: t.context.data.number,
        body: newContent
    });

    await t.context.gh.issues.edit({
        owner: t.context.data.owner,
        repo: t.context.data.repo,
        number: t.context.data.number
    });

    t.is(t.context.issue.content, newContent);
    t.true(t.context.issue.lastUpdate > lastUpdate);
});

test('has label', (t) => {
    t.context.issue.labels = [
        'test'
    ];

    t.false(t.context.issue.hasLabel('foo'));
    t.true(t.context.issue.hasLabel('test'));
});

test('add label', async (t) => {
    t.context.gh.issues.addLabels.resolves();
    await t.context.issue.addLabel('test');

    t.true(t.context.gh.issues.addLabels.calledOnce);
    t.deepEqual(t.context.gh.issues.addLabels.lastCall.args[0], {
        owner: t.context.data.owner,
        repo: t.context.data.repo,
        number: t.context.data.number,
        labels: [ 'test' ]
    });
    t.true(t.context.issue.hasLabel('test'));

    await t.context.issue.addLabel('test');
    t.true(t.context.gh.issues.addLabels.calledOnce);
});

test('remove label', async (t) => {
    t.context.gh.issues.removeLabel.resolves();
    t.context.issue.labels = [
        'test',
        'foo'
    ];

    await t.context.issue.removeLabel('test');

    t.true(t.context.gh.issues.removeLabel.calledOnce);
    t.deepEqual(t.context.gh.issues.removeLabel.lastCall.args[0], {
        owner: t.context.data.owner,
        repo: t.context.data.repo,
        number: t.context.data.number,
        name: 'test'
    });
    t.false(t.context.issue.hasLabel('test'));
    t.true(t.context.issue.hasLabel('foo'));

    await t.context.issue.removeLabel('test');
    t.true(t.context.gh.issues.removeLabel.calledOnce);
});

test('assign user', async (t) => {
    t.context.gh.issues.addAssigneesToIssue.resolves();

    await t.context.issue.assign('baz');

    t.true(t.context.gh.issues.addAssigneesToIssue.calledOnce);
    t.deepEqual(t.context.gh.issues.addAssigneesToIssue.lastCall.args[0], {
        owner: t.context.data.owner,
        repo: t.context.data.repo,
        number: t.context.data.number,
        assignees: [ 'baz' ]
    });
    t.is(t.context.issue.assignee, 'baz');

    await t.context.issue.assign('baz');
    t.true(t.context.gh.issues.addAssigneesToIssue.calledOnce);
});

test('api object', (t) => {
    const apiObject = t.context.issue.toAPIObject();

    t.deepEqual(apiObject, {
        title: t.context.data.title,
        body: t.context.data.content
    });
});

test('test optional api object props', async (t) => {
    t.context.gh.issues.addAssigneesToIssue.resolves();
    t.context.gh.issues.addLabels.resolves();

    const expected = {
        title: t.context.data.title,
        body: t.context.data.content,
        labels: [
            'foo',
            'bar'
        ],
        assignee: 'test'
    };

    for(const label of expected.labels) {
        await t.context.issue.addLabel(label);
    }
    await t.context.issue.assign(expected.assignee);

    const apiObject = t.context.issue.toAPIObject();

    t.deepEqual(apiObject, expected);
});

test('close', async (t) => {
    t.context.gh.issues.edit.resolves({
        data: 'asdf'
    });

    t.true(t.context.issue.state);

    const ret = await t.context.issue.close();

    t.true(t.context.gh.issues.edit.calledOnce);
    t.deepEqual(t.context.gh.issues.edit.lastCall.args[0], {
        owner: t.context.data.owner,
        repo: t.context.data.repo,
        number: t.context.data.number,
        state: 'closed'
    });
    t.false(t.context.issue.state);
    t.is(ret, 'asdf');

    await t.context.issue.close();
    t.true(t.context.gh.issues.edit.calledOnce);
});
