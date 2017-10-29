import test from 'ava';
import Repository from '../lib/repo';
import { getGithubClient, getTwitterAccount, getConfig } from './_stubs';
import sinon from 'sinon';

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

test('add readme', async (t) => {
    const client = getGithubClient();
    const config = getConfig();
    client.misc.getRateLimit.rejects();
    const twitterAccount = getTwitterAccount('test');
    const repo = new Repository(client, twitterAccount, config);

    await t.throws(repo.ready);

    client.repos.createFile.resolves();

    await repo.addReadme();

    t.true(client.repos.createFile.calledWithMatch({
        path: "README.md",
        message: "Default content queue README.md"
    }));
    client.repos.createFile.argumentsValid((assertion, message) => t.true(assertion, message));
    //TODO test readme content
});

test('add issue tempalte', async (t) => {
    const client = getGithubClient();
    const config = getConfig();
    client.misc.getRateLimit.rejects();
    const repo = new Repository(client, getTwitterAccount('test'), config);

    await t.throws(repo.ready);

    client.repos.createFile.resolves();

    await repo.addIssueTemplate();

    t.true(client.repos.createFile.calledWithMatch({
        path: "ISSUE_TEMPLATE.md",
        message: "Issue template for content queue"
    }));
    client.repos.createFile.argumentsValid((assertion, message) => t.true(assertion, message));
    //TODO test template content
});

test('add files without any content', async (t) => {
    const client = getGithubClient();
    client.misc.getRateLimit.rejects();
    const repo = new Repository(client, getTwitterAccount('test'), getConfig());

    await t.throws(repo.ready);

    client.repos.getContent.rejects();
    client.repos.createFile.resolves();

    await repo._addFiles();

    t.true(client.repos.createFile.calledWithMatch({
        path: "README.md"
    }));
    t.true(client.repos.createFile.calledWithMatch({
        path: "ISSUE_TEMPLATE.md"
    }));
    client.repos.createFile.allArgumentsValid((assertion, message) => t.true(assertion, message));
});

test('add files without all content', async (t) => {
    const client = getGithubClient();
    client.misc.getRateLimit.rejects();
    const repo = new Repository(client, getTwitterAccount('test'), getConfig());

    await t.throws(repo.ready);

    client.repos.getContent.resolves();
    client.repos.createFile.resolves();

    await repo._addFiles();

    t.false(client.repos.createFile.calledWithMatch({
        path: "README.md"
    }));
    t.false(client.repos.createFile.calledWithMatch({
        path: "ISSUE_TEMPLATE.md"
    }));
});

test('add files with issue tempalte', async (t) => {
    const client = getGithubClient();
    client.misc.getRateLimit.rejects();
    const repo = new Repository(client, getTwitterAccount('test'), getConfig());

    await t.throws(repo.ready);

    client.repos.getContent.resolves();
    client.repos.getContent.withArgs(sinon.match({
        path: ".github/ISSUE_TEMPLATE.md"
    })).rejects();
    client.repos.createFile.resolves();

    await repo._addFiles();

    t.false(client.repos.createFile.calledWithMatch({
        path: "README.md"
    }));
    t.false(client.repos.createFile.calledWithMatch({
        path: "ISSUE_TEMPLATE.md"
    }));
});

test('add files with .github issue tempalte', async (t) => {
    const client = getGithubClient();
    client.misc.getRateLimit.rejects();
    const repo = new Repository(client, getTwitterAccount('test'), getConfig());

    await t.throws(repo.ready);

    client.repos.getContent.resolves();
    client.repos.getContent.withArgs(sinon.match({
        path: "ISSUE_TEMPLATE.md"
    })).rejects();
    client.repos.createFile.resolves();

    await repo._addFiles();

    t.false(client.repos.createFile.calledWithMatch({
        path: "README.md"
    }));
    t.false(client.repos.createFile.calledWithMatch({
        path: "ISSUE_TEMPLATE.md"
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

test('add label', async (t) => {
    const client = getGithubClient();
    client.misc.getRateLimit.rejects();
    const config = getConfig();
    const repo = new Repository(client, getTwitterAccount('test'), config);

    await t.throws(repo.ready);

    client.issues.createLabel.resolves();

    await repo.addLabel('foo', 'ffffff');

    client.issues.createLabel.argumentsValid((assertion, message) => t.true(assertion, message));
    t.true(client.issues.createLabel.calledWithMatch({
        owner: config.owner,
        repo: config.repo,
        name: 'foo',
        color: 'ffffff'
    }));
});

test('ensure labels', async (t) => {
    const client = getGithubClient();
    client.misc.getRateLimit.rejects();
    const config = getConfig();
    const repo = new Repository(client, getTwitterAccount('test'), config);

    await t.throws(repo.ready);

    client.issues.getLabel.resolves();
    client.issues.getLabel
        .withArgs(sinon.match({
            name: config.labels.ready
        }))
        .rejects({
            code: 404
        });
    client.issues.createLabel.resolves();

    await repo.ensureLabels();

    client.allArgumentsValid((a, m) => t.true(a, m));
    t.true(client.issues.createLabel.calledWithMatch({
        name: config.labels.ready
    }));
});

test.todo('create card');
test.todo('belongs to user');
test.todo('get users in team');
test.todo('add issues to board');
test.todo('has required permissions for user');
test.todo('has required permissions for org');
test.todo('does not have required permissions');
test.todo('setup');
