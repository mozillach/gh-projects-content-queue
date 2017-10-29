import test from 'ava';
import Repository from '../lib/repo';
import { getGithubClient, getTwitterAccount, getConfig, getColumn } from './_stubs';
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

test('create card without position', async (t) => {
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

    // Issue setup
    client.issues.addLabels.resolves();

    const repo = new Repository(client, getTwitterAccount('test'), config);

    await repo.ready;

    const title = 'lorem ipsum';
    const content = 'foo bar';
    client.issues.create.resolves({
        data: {
            id: '2',
            number: 1,
            updated_at: Date.now(),
            body: content,
            title,
            state: 'open'
        }
    });
    const column = getColumn('1', 'test');
    const cardResult = {
        id: '4'
    };
    column.addCard.resolves(cardResult);

    const card = await repo.createCard(title, content, column);

    t.deepEqual(card, cardResult);
    client.issues.create.argumentsValid((a, m) => t.true(a, m));
    t.true(client.issues.create.calledWithMatch({
        title,
        body: content
    }));
    t.true(column.addCard.calledWithMatch({
        issue: {
            id: '2',
            number: 1,
            content,
            title
        },
        config
    }, false));
});

test('create card with position', async (t) => {
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

    // Issue setup
    client.issues.addLabels.resolves();

    const repo = new Repository(client, getTwitterAccount('test'), config);

    await repo.ready;

    const title = 'lorem ipsum';
    const content = 'foo bar';
    client.issues.create.resolves({
        data: {
            id: '2',
            number: 1,
            updated_at: Date.now(),
            body: content,
            title,
            state: 'open'
        }
    });
    const column = getColumn('1', 'test');
    const cardResult = {
        id: '4'
    };
    column.addCard.resolves(cardResult);
    column.moveCard.resolves();

    const card = await repo.createCard(title, content, column, 'top');

    t.deepEqual(card, cardResult);
    client.issues.create.argumentsValid((a, m) => t.true(a, m));
    t.true(client.issues.create.calledWithMatch({
        title,
        body: content
    }));
    t.true(column.addCard.calledWithMatch({
        issue: {
            id: '2',
            number: 1,
            content,
            title
        },
        config
    }, false));
    t.true(column.moveCard.calledWithMatch(cardResult, 'top'));
});

test('belongs to user', async (t) => {
    const client = getGithubClient();
    const config = getConfig();
    client.misc.getRateLimit.rejects();
    const repo = new Repository(client, getTwitterAccount('test'), config);

    await t.throws(repo.ready);

    client.repos.get.resolves({
        data: {
            owner: {
                type: 'User'
            }
        }
    });

    const isUser = await repo.belongsToUser();
    t.true(isUser);
    client.repos.get.argumentsValid((a, m) => t.true(a, m));
    t.true(client.repos.get.calledWithMatch({
        repo: config.repo,
        owner: config.owner
    }));
});

test('belongs to orga', async (t) => {
    const client = getGithubClient();
    const config = getConfig();
    client.misc.getRateLimit.rejects();
    const repo = new Repository(client, getTwitterAccount('test'), config);

    await t.throws(repo.ready);

    client.repos.get.resolves({
        data: {
            owner: {
                type: 'Organization'
            }
        }
    });

    const isUser = await repo.belongsToUser();
    t.false(isUser);
    client.repos.get.argumentsValid((a, m) => t.true(a, m));
    t.true(client.repos.get.calledWithMatch({
        repo: config.repo,
        owner: config.owner
    }));
});

test('get users in team', async (t) => {
    const client = getGithubClient();
    const config = getConfig();
    client.misc.getRateLimit.rejects();

    const repo = new Repository(client, getTwitterAccount('test'), config);

    await t.throws(repo.ready);

    const team = 'baz';
    const member = 'lorem';
    const teamId = '1';

    client.repos.get.resolves({
        data: {
            owner: {
                type: 'Organization'
            }
        }
    });
    client.orgs.getTeams.resolves({
        data: [
            {
                name: 'owners',
                id: '9999'
            },
            {
                name: team,
                id: teamId
            }
        ]
    });
    client.orgs.getTeamMembers.resolves({
        data: [
            {
                login: member
            }
        ]
    });

    const users = await repo.getUsersInTeam(team);

    t.is(users.length, 1);
    t.true(users.includes(member));

    client.argumentsValid((a, m) => t.true(a, m));

    t.true(client.orgs.getTeams.calledWithMatch({
        org: config.owner
    }));
    t.true(client.orgs.getTeamMembers.calledWithMatch({
        id: teamId
    }));
});

test('get users of team that does not exist', async (t) => {
    const client = getGithubClient();
    const config = getConfig();
    client.misc.getRateLimit.rejects();

    const repo = new Repository(client, getTwitterAccount('test'), config);

    await t.throws(repo.ready);

    const team = 'baz';

    client.repos.get.resolves({
        data: {
            owner: {
                type: 'Organization'
            }
        }
    });
    client.orgs.getTeams.resolves({
        data: []
    });
    client.orgs.getTeamMembers.rejects();

    await t.throws(repo.getUsersInTeam(team), Error);

    client.argumentsValid((a, m) => t.true(a, m));
    t.true(client.orgs.getTeams.calledWithMatch({
        org: config.owner
    }));
    t.false(client.orgs.getTeamMembers.called);
});

test('can not get team members if repo belongs to user', async (t) => {
    const client = getGithubClient();
    client.misc.getRateLimit.rejects();
    const repo = new Repository(client, getTwitterAccount('test'), getConfig());

    await t.throws(repo.ready);

    client.repos.get.resolves({
        data: {
            owner: {
                type: 'User'
            }
        }
    });
    client.orgs.getTeams.rejects();

    await t.throws(repo.getUsersInTeam('baz'));

    client.argumentsValid((a, m) => t.true(a, m));
    t.false(client.orgs.getTeams.called);
});

test('has required permissions for user', async (t) => {
    const client = getGithubClient();
    client.misc.getRateLimit.rejects();
    const repo = new Repository(client, getTwitterAccount('test'), getConfig());

    await t.throws(repo.ready);

    client.misc.getRateLimit.resolves({
        meta: {
            'x-oauth-scopes': 'public_repo'
        }
    });
    client.repos.get.resolves({
        data: {
            owner: {
                type: 'User'
            }
        }
    });

    const hasPermissions = await repo.hasRequiredPermissions();

    t.true(hasPermissions);
    t.true(client.misc.getRateLimit.called);
    client.argumentsValid((a, m) => t.true(a, m));
});

test('has required permissions for org', async (t) => {
    const client = getGithubClient();
    client.misc.getRateLimit.rejects();
    const repo = new Repository(client, getTwitterAccount('test'), getConfig());

    await t.throws(repo.ready);

    client.misc.getRateLimit.resolves({
        meta: {
            'x-oauth-scopes': 'public_repo, read:org'
        }
    });
    client.repos.get.resolves({
        data: {
            owner: {
                type: 'Organization'
            }
        }
    });

    const hasPermissions = await repo.hasRequiredPermissions();

    t.true(hasPermissions);
    t.true(client.misc.getRateLimit.called);
    client.argumentsValid((a, m) => t.true(a, m));
});

test('does not have required permissions', async (t) => {
    const client = getGithubClient();
    client.misc.getRateLimit.rejects();
    const repo = new Repository(client, getTwitterAccount('test'), getConfig());

    await t.throws(repo.ready);

    client.misc.getRateLimit.resolves({
        meta: {
            'x-oauth-scopes': 'repo'
        }
    });
    client.repos.get.resolves({
        data: {
            owner: {
                type: 'Organization'
            }
        }
    });

    const hasPermissions = await repo.hasRequiredPermissions();

    t.false(hasPermissions);
    t.true(client.misc.getRateLimit.called);
    client.argumentsValid((a, m) => t.true(a, m));
});

test.todo('add issues to board');
test.todo('setup');
