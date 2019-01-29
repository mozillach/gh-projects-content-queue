import test from 'ava';
import Issues from '../lib/issues';
import { getGithubClient, getConfig } from './_stubs';
import sinon from 'sinon';
import UpdateManager from '../lib/update-manager';

// Ensure update manager never calls update during tests unless we explicitly want it to.
let clock;
test.before(() => {
    clock = sinon.useFakeTimers();
});

test.afterEach(() => {
    clearInterval(UpdateManager.interval);
    UpdateManager.targets.clear();
});

test.after(() => {
    clock.restore();
});

test('constructor', (t) => {
    const client = getGithubClient();
    client.issues.getForRepo.resolves({
        data: []
    });
    const issues = new Issues(client, getConfig());

    t.true("issues" in issues);
    t.true("closedIssues" in issues);
    t.true("config" in issues);
    t.true("githubClient" in issues);

    t.true("then" in issues.issues);
    t.true("then" in issues.closedIssues);

    t.is(issues.githubClient, client);
    t.is(issues.config, getConfig());
});

test('getIssueInfo', (t) => {
    const config = getConfig();
    const input = {
        id: 'foo',
        number: 1,
        updated_at: new Date().toString(),
        body: 'lorem ipsum',
        title: 'test',
        state: 'open'
    };
    const output = {
        id: input.id,
        number: input.number,
        repo: config.repo,
        owner: config.owner,
        updated_at: input.updated_at,
        assignee: undefined,
        labels: [],
        content: input.body,
        title: input.title,
        state: true
    };

    const client = getGithubClient();
    client.issues.getForRepo.resolves({
        data: []
    });

    const issues = new Issues(client, config);

    const info = issues.getIssueInfo(input);
    t.deepEqual(info, output);
});

test('getIssueInfo with assignee and labels', (t) => {
    const config = getConfig();
    const input = {
        id: 'foo',
        number: 1,
        updated_at: new Date().toString(),
        body: 'lorem ipsum',
        title: 'test',
        state: 'open',
        assignee: {
            login: 'bar'
        },
        labels: [
            {
                name: 'baz'
            }
        ]
    };
    const output = {
        id: input.id,
        number: input.number,
        repo: config.repo,
        owner: config.owner,
        updated_at: input.updated_at,
        assignee: 'bar',
        labels: [
            'baz'
        ],
        content: input.body,
        title: input.title,
        state: true
    };

    const client = getGithubClient();
    client.issues.getForRepo.resolves({
        data: []
    });

    const issues = new Issues(client, config);

    const info = issues.getIssueInfo(input);
    t.deepEqual(info, output);
});

test('create issue', async (t) => {
    const client = getGithubClient();
    client.issues.getForRepo.resolves({
        data: []
    });
    const issues = new Issues(client, getConfig());

    const title = 'test';
    const content = 'foo bar';
    const issueData = {
        id: 123,
        number: 1,
        updated_at: new Date.toString(),
        body: content,
        title,
        state: 'open'
    };
    client.issues.create.resolves({
        data: issueData
    });
    const newIssue = await issues.createIssue(title, content);

    t.is(newIssue.id, issueData.id);
    t.is(newIssue.title, title);
    t.is(newIssue.content, content);
    const allIssues = await issues.issues;
    t.true(allIssues.has(issueData.number));
    t.is(allIssues.get(issueData.number), newIssue);
});

test('fetch issues', async (t) => {
    const client = getGithubClient();
    client.issues.getForRepo.resolves({
        data: []
    });
    const issues = new Issues(client, getConfig());

    client.issues.getForRepo.resetHistory();
    const issueData = [
        {
            id: 123,
            number: 1,
            updated_at: new Date().toString(),
            body: 'foo bar',
            title: 'test',
            state: 'open'
        }
    ];
    client.issues.getForRepo.resolves({
        data: issueData
    });

    const allIssues = await issues.fetchIssues();

    t.true(allIssues instanceof Map);
    t.is(allIssues.size, 1);
    t.true(allIssues.has(1));
});

test('fetch issues with old issues', async (t) => {
    const client = getGithubClient();
    client.issues.getForRepo.resolves({
        data: []
    });
    const issues = new Issues(client, getConfig());

    client.issues.getForRepo.resetHistory();
    const issueData = [
        {
            id: 123,
            number: 1,
            updated_at: new Date().toString(),
            body: 'foo bar',
            title: 'test',
            state: 'open'
        },
        {
            id: 1234,
            number: 2,
            updated_at: new Date().toString(),
            body: 'lorem ipsum',
            title: 'lorem',
            state: 'open'
        }
    ];
    client.issues.getForRepo.resolves({
        data: issueData
    });

    const oldIssue = {
        lastUpdate: Date.now() - 1000,
        update: sinon.spy()
    };
    const oldIssues = new Map();
    oldIssues.set(1, oldIssue);

    const allIssues = await issues.fetchIssues(oldIssues);

    t.true(allIssues instanceof Map);
    t.is(allIssues.size, 2);
    t.true(allIssues.has(2));

    const newIssue = allIssues.get(1);
    t.deepEqual(newIssue, oldIssue);

    t.true(oldIssue.update.calledOnce);
    t.true(oldIssue.update.calledWith(sinon.match(issues.getIssueInfo(issueData[0]))));
});

test('fetch issues with old issue that is not updated', async (t) => {
    const client = getGithubClient();
    client.issues.getForRepo.resolves({
        data: []
    });
    const issues = new Issues(client, getConfig());

    client.issues.getForRepo.resetHistory();
    const issueData = [
        {
            id: 123,
            number: 1,
            updated_at: new Date().toString(),
            body: 'foo bar',
            title: 'test',
            state: 'open'
        },
        {
            id: 1234,
            number: 2,
            updated_at: new Date().toString(),
            body: 'lorem ipsum',
            title: 'lorem',
            state: 'open'
        }
    ];
    client.issues.getForRepo.resolves({
        data: issueData
    });

    const oldIssue = {
        lastUpdate: Date.parse(issueData[0]),
        update: sinon.spy()
    };
    const oldIssues = new Map();
    oldIssues.set(1, oldIssue);

    const allIssues = await issues.fetchIssues(oldIssues);

    t.true(allIssues instanceof Map);
    t.is(allIssues.size, 2);
    t.true(allIssues.has(2));

    const newIssue = allIssues.get(1);
    t.deepEqual(newIssue, oldIssue);

    t.true(oldIssue.update.notCalled);
});

test('get new issue', async (t) => {
    const client = getGithubClient();
    client.queueResponse({
        data: []
    });
    const issues = new Issues(client, getConfig());
    await Promise.all([
        issues.issues,
        issues.closedIssues
    ]);

    client.queueResponse({
        data: {
            id: 'foo',
            number: 1,
            updated_at: new Date().toString(),
            body: 'lorem ipsum',
            title: 'test',
            state: 'open',
            assignee: {
                login: 'bar'
            },
            labels: [
                {
                    name: 'baz'
                }
            ]
        }
    });
    const issue = await issues.getIssue(1);
    t.is(issue.number, 1);
    t.is(issue.id, 'foo');

    const openIssues = await issues.issues;
    t.true(openIssues.has(issue.number));
    t.is(openIssues.get(issue.number), issue);
});

test('get existing issue', async (t) => {
    const client = getGithubClient();
    const issueData = {
        id: 'foo',
        number: 1,
        updated_at: new Date().toString(),
        body: 'lorem ipsum',
        title: 'test',
        state: 'open',
        assignee: {
            login: 'bar'
        },
        labels: [
            {
                name: 'baz'
            }
        ]
    };
    client.queueResponse({
        data: [
            issueData
        ]
    });
    const issues = new Issues(client, getConfig());
    await Promise.all([
        issues.issues,
        issues.closedIssues
    ]);

    issueData.body = 'foo bar';
    client.queueResponse({
        data: issueData
    });
    const issue = await issues.getIssue(issueData.number);
    t.is(issue.number, issueData.number);
    t.is(issue.id, issueData.id);
    t.is(issue.content, issueData.body);

    const openIssues = await issues.issues;
    t.true(openIssues.has(issue.number));
    t.is(openIssues.get(issue.number), issue);
});

test('get new closed issue', async (t) => {
    const client = getGithubClient();
    client.queueResponse({
        data: []
    });
    const issues = new Issues(client, getConfig());
    await Promise.all([
        issues.issues,
        issues.closedIssues
    ]);

    client.queueResponse({
        data: {
            id: 'foo',
            number: 1,
            updated_at: new Date().toString(),
            body: 'lorem ipsum',
            title: 'test',
            state: 'closed',
            assignee: {
                login: 'bar'
            },
            labels: [
                {
                    name: 'baz'
                }
            ]
        }
    });
    const issue = await issues.getIssue(1);
    t.is(issue.number, 1);
    t.is(issue.id, 'foo');

    const closedIssues = await issues.closedIssues;
    t.true(closedIssues.has(issue.number));
    t.is(closedIssues.get(issue.number), issue);
});

test('get existing closed issue', async (t) => {
    const client = getGithubClient();
    const issueData = {
        id: 'foo',
        number: 1,
        updated_at: new Date().toString(),
        body: 'lorem ipsum',
        title: 'test',
        state: 'closed',
        assignee: {
            login: 'bar'
        },
        labels: [
            {
                name: 'baz'
            }
        ]
    };
    client.queueResponse({
        data: [
            issueData
        ]
    });
    const issues = new Issues(client, getConfig());
    await Promise.all([
        issues.issues,
        issues.closedIssues
    ]);

    issueData.body = 'foo bar';
    client.queueResponse({
        data: issueData
    });
    const issue = await issues.getIssue(issueData.number);
    t.is(issue.number, issueData.number);
    t.is(issue.id, issueData.id);
    t.is(issue.content, issueData.body);

    const closedIssues = await issues.closedIssues;
    t.true(closedIssues.has(issue.number));
    t.is(closedIssues.get(issue.number), issue);
});

test('get existing issue that changed state', async (t) => {
    const client = getGithubClient();
    const issueData = {
        id: 'foo',
        number: 1,
        updated_at: new Date().toString(),
        body: 'lorem ipsum',
        title: 'test',
        state: 'open',
        assignee: {
            login: 'bar'
        },
        labels: [
            {
                name: 'baz'
            }
        ]
    };
    client.queueResponse({
        data: [
            issueData
        ]
    });
    client.queueResponse({
        data: []
    });
    const issues = new Issues(client, getConfig());

    await Promise.all([
        issues.issues,
        issues.closedIssues
    ]);

    issueData.body = 'foo bar';
    issueData.state = 'closed';
    client.queueResponse({
        data: issueData
    });
    const issue = await issues.getIssue(issueData.number);
    t.is(issue.number, issueData.number);
    t.is(issue.id, issueData.id);
    t.is(issue.content, issueData.body);

    const closedIssues = await issues.closedIssues;
    t.true(closedIssues.has(issue.number));
    t.is(closedIssues.get(issue.number), issue);

    const openIssues = await issues.issues;
    t.false(openIssues.has(issue.number));
});

test.todo('open issues');
test.todo('opened event for new open issues');
test.todo('updated event from open issues');
test.todo('closed issues');
test.todo('closed event for new closed issues');
