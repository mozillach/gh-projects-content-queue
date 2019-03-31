import test from 'ava';
import { getGithubClient, getIssueData } from './_stubs';
import Issue from '../lib/issue';

test.beforeEach((t) => {
    t.context.gh = getGithubClient();
    t.context.data = getIssueData();
    t.context.issue = new Issue(t.context.gh, t.context.data);
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

test('comment', async  (t) => {
    const commentContent = 'foo bar';
    await t.context.issue.comment(commentContent);

    const opts = t.context.gh.options.pop();
    t.is(opts.url, '/repos/:owner/:repo/issues/:number/comments');
    t.is(t.context.gh.options.length, 0);
    t.is(opts.owner, t.context.data.owner);
    t.is(opts.repo, t.context.data.repo);
    t.is(opts.number, t.context.data.number);
    t.is(opts.body, commentContent);
});

test('set content', async (t) => {
    const newContent = 'foo bar';
    const lastUpdate = t.context.issue.lastUpdate;

    t.context.issue.content = newContent;
    await Promise.resolve(); // wait for promise loop

    t.is(t.context.gh.options.length, 1);
    const opts = t.context.gh.options.pop();
    t.is(opts.owner, t.context.data.owner);
    t.is(opts.repo, t.context.data.repo);
    t.is(opts.number, t.context.data.number);
    t.is(opts.body, newContent);

    await t.context.gh.issues.update({
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
    await t.context.issue.addLabel('test');

    t.is(t.context.gh.options.length, 1);
    const opts = t.context.gh.options.pop();
    t.is(opts.owner, t.context.data.owner);
    t.is(opts.repo, t.context.data.repo);
    t.is(opts.number, t.context.data.number);
    t.deepEqual(opts.labels, [ 'test' ]);
    t.true(t.context.issue.hasLabel('test'));

    await t.context.issue.addLabel('test');
    t.is(t.context.gh.options.length, 0);
});

test('remove label', async (t) => {
    t.context.issue.labels = [
        'test',
        'foo'
    ];

    await t.context.issue.removeLabel('test');

    t.is(t.context.gh.options.length, 1);
    const opts = t.context.gh.options.pop();
    t.is(opts.owner, t.context.data.owner);
    t.is(opts.repo, t.context.data.repo);
    t.is(opts.number, t.context.data.number);
    t.is(opts.name, 'test');
    t.false(t.context.issue.hasLabel('test'));
    t.true(t.context.issue.hasLabel('foo'));

    await t.context.issue.removeLabel('test');
    t.is(t.context.gh.options.length, 0);
});

test('assign user', async (t) => {
    await t.context.issue.assign('baz');

    t.is(t.context.gh.options.length, 1);
    const opts = t.context.gh.options.pop();
    t.is(opts.owner, t.context.data.owner);
    t.is(opts.repo, t.context.data.repo);
    t.is(opts.number, t.context.data.number);
    t.deepEqual(opts.assignees, [ 'baz' ]);
    t.is(t.context.issue.assignee, 'baz');

    await t.context.issue.assign('baz');
    t.is(t.context.gh.options.length, 0);
});

test('api object', (t) => {
    const apiObject = t.context.issue.toAPIObject();

    t.deepEqual(apiObject, {
        title: t.context.data.title,
        body: t.context.data.content
    });
});

test('test optional api object props', async (t) => {
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
    t.context.gh.queueResponse({
        data: 'asdf'
    });

    t.true(t.context.issue.state);

    const ret = await t.context.issue.close();

    t.is(t.context.gh.options.length, 1);
    const opts = t.context.gh.options.pop();
    t.is(opts.owner, t.context.data.owner);
    t.is(opts.repo, t.context.data.repo);
    t.is(opts.number, t.context.data.number);
    t.is(opts.state, 'closed');
    t.false(t.context.issue.state);
    t.is(ret, 'asdf');

    await t.context.issue.close();
    t.is(t.context.gh.options.length, 0);
});
