import test from 'ava';
import Repository from '../lib/repo';
import { getGithubClient, getTwitterAccount, getConfig } from './_stubs';
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

test('replace placeholder', (t) => {
    const str = 'foo{test}bar';
    const newStr = Repository.replace(str, 'test', ' ');

    t.is(newStr, 'foo bar');
});

test('construction', (t) => {
    const client = getGithubClient();
    client.misc.getRateLimit.rejects();
    const repo = new Repository(client, getTwitterAccount('test'), getConfig());

    t.true("githubClient" in repo);
    t.true("twitterAccount" in repo);
    t.true("config" in repo);
    t.true("ready" in repo);

    t.true("then" in repo.ready);
    return t.throws(repo.ready);
});

test('ready without repo scope', (t) => {
    const client = getGithubClient();
    client.misc.getRateLimit.resolves({
        meta: {
            'x-oauth-scopes': 'notifications'
        }
    });
    const repo = new Repository(client, getTwitterAccount('test'), getConfig());

    return t.throws(repo.ready);
});

test('construction ready', async (t) => {
    const client = getGithubClient();
    const config = getConfig();
    // Repo setup
    client.misc.getRateLimit.resolves({
        meta: {
            'x-oauth-scopes': 'public_repo, org:read'
        }
    });
    client.repos.getContent.resolves();
    client.issues.getLabel.resolves();
    client.repos.get.resolves({
        data: {
            owner: {
                type: "User"
            }
        }
    });
    // Board setup
    client.projects.getProjectColumns.resolves({
        data: []
    });
    client.projects.getRepoProjects.resolves({
        data: [
            {
                name: config.projectName,
                id: 1
            }
        ]
    });
    // Issues setup
    client.issues.getForRepo.resolves({
        data: []
    });
    const repo = new Repository(client, getTwitterAccount('test'), config);
    await repo.ready;

    t.true("board" in repo);
    t.true("issues" in repo);
    t.true(UpdateManager.targets.has(repo));
});

test('has file', async (t) => {
    const client = getGithubClient();
    client.misc.getRateLimit.rejects();
    const repo = new Repository(client, getTwitterAccount('test'), getConfig());

    await t.throws(repo.ready);

    client.repos.getContent.resolves();

    t.true(await repo.hasFile('test'));

    client.repos.getContent.rejects();

    t.false(await repo.hasFile('foo'));
});

test('add file', async (t) => {
    const client = getGithubClient();
    client.misc.getRateLimit.rejects();
    const repo = new Repository(client, getTwitterAccount('test'), getConfig());

    await t.throws(repo.ready);

    client.repos.createFile.resolves();

    await repo.addFile('index.js', 'void');

    client.repos.createFile.argumentsValid((assertion, message) => t.true(assertion, message));
    t.true(client.repos.createFile.calledWithMatch({
        path: 'index.js'
    }));
});

test('add file with custom msg', async (t) => {
    const client = getGithubClient();
    client.misc.getRateLimit.rejects();
    const repo = new Repository(client, getTwitterAccount('test'), getConfig());

    await t.throws(repo.ready);

    client.repos.createFile.resolves();

    await repo.addFile('index.js', 'void', 'foo bar');

    client.repos.createFile.argumentsValid((assertion, message) => t.true(assertion, message));
    t.true(client.repos.createFile.calledWithMatch({
        path: 'index.js',
        message: 'foo bar'
    }));
});

test('has label', async (t) => {
    const client = getGithubClient();
    client.misc.getRateLimit.rejects();
    const repo = new Repository(client, getTwitterAccount('test'), getConfig());

    await t.throws(repo.ready);

    client.issues.getLabel.resolves();

    t.true(await repo.hasLabel('foo'));
    client.issues.getLabel.argumentsValid((assertion, message) => t.true(assertion, message));
    t.true(client.issues.getLabel.calledWithMatch({
        name: 'foo'
    }));
});

test('does not have label', async (t) => {
    const client = getGithubClient();
    client.misc.getRateLimit.rejects();
    const repo = new Repository(client, getTwitterAccount('test'), getConfig());

    await t.throws(repo.ready);

    client.issues.getLabel.rejects({
        code: 404
    });

    t.false(await repo.hasLabel('foo'));
    client.issues.getLabel.argumentsValid((assertion, message) => t.true(assertion, message));
    t.true(client.issues.getLabel.calledWithMatch({
        name: 'foo'
    }));
});

test('has label network error', async (t) => {
    const client = getGithubClient();
    client.misc.getRateLimit.rejects();
    const repo = new Repository(client, getTwitterAccount('test'), getConfig());

    await t.throws(repo.ready);

    client.issues.getLabel.rejects({});

    return t.throws(repo.hasLabel('foo'));
});
