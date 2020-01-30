import test from 'ava';
import Repository from '../lib/repo';
import { getGithubClient, getConfig, getColumn, getBoard, getCard } from './_stubs';

const ACCOUNT_LIST = `- https://example.com/account on Example`;

test('replace placeholder', (t) => {
    const str = 'foo{test}bar';
    const newStr = Repository.replace(str, 'test', ' ');

    t.is(newStr, 'foo bar');
});

test('construction', (t) => {
    const client = getGithubClient();
    client.queueResponse(Promise.reject(new Error('no ratelimit')));
    client.queueResponse({});
    const repo = new Repository(client, getConfig(), ACCOUNT_LIST);

    t.true("githubClient" in repo);
    t.true("config" in repo);
    t.true("ready" in repo);

    t.true("then" in repo.ready);
    return t.throwsAsync(repo.ready);
});

test('ready without repo scope', (t) => {
    const client = getGithubClient();
    client.queueResponse({
        headers: {
            'x-oauth-scopes': 'notifications'
        }
    });
    client.queueResponse({});
    const repo = new Repository(client, getConfig(), ACCOUNT_LIST);

    return t.throwsAsync(repo.ready);
});

test('construction ready', async (t) => {
    const client = getGithubClient();
    const config = getConfig();
    // Repo setup
    client.queueResponse({
        headers: {
            'x-oauth-scopes': 'public_repo, org:read'
        }
    });
    client.queueResponse({
        data: {
            owner: {
                type: "User"
            }
        }
    });
    client.queueResponse({});
    client.queueResponse({});
    // Board setup
    client.queueResponse({
        data: []
    });
    client.queueResponse({
        data: [
            {
                name: config.projectName,
                id: 1
            }
        ]
    });
    // Issues setup
    client.queueResponse({
        data: []
    });
    const repo = new Repository(client, config, ACCOUNT_LIST);
    await repo.ready;

    t.true("issues" in repo);
});

test('has file', async (t) => {
    const client = getGithubClient();
    client.queueResponse(Promise.reject(new Error()));
    const repo = new Repository(client, getConfig(), ACCOUNT_LIST);

    await t.throwsAsync(repo.ready);

    client.queueResponse({});

    t.true(await repo.hasFile('test'));

    client.queueResponse(Promise.reject());

    t.false(await repo.hasFile('foo'));
});

test('add file', async (t) => {
    const client = getGithubClient();
    client.queueResponse(Promise.reject(new Error()));
    const repo = new Repository(client, getConfig(), ACCOUNT_LIST);

    await t.throwsAsync(repo.ready);

    client.queueResponse({});

    await repo.addFile('index.js', 'void');

    t.is(client.options.pop().path, 'index.js');
});

test('add file with custom msg', async (t) => {
    const client = getGithubClient();
    client.queueResponse(Promise.reject(new Error()));
    const repo = new Repository(client, getConfig(), ACCOUNT_LIST);

    await t.throwsAsync(repo.ready);

    client.queueResponse({});

    await repo.addFile('index.js', 'void', 'foo bar');

    const opts = client.options.pop();
    t.is(opts.path, 'index.js');
    t.is(opts.message, 'foo bar');
});

test('add readme', async (t) => {
    const client = getGithubClient();
    const config = getConfig();
    client.queueResponse(Promise.reject(new Error()));
    const repo = new Repository(client, config, ACCOUNT_LIST);

    await t.throwsAsync(repo.ready);

    await repo.addReadme();

    const opts = client.options.pop();
    t.is(opts.path, "README.md");
    t.is(opts.message, "Default content queue README.md");
    //TODO test readme content
});

test.failing('add issue tempaltes', async (t) => {
    const client = getGithubClient();
    const config = getConfig();
    client.queueResponse(Promise.reject(new Error()));
    client.queueResponse(Promise.reject(new Error()));
    const repo = new Repository(client, config, ACCOUNT_LIST);

    await t.throwsAsync(repo.ready);

    await repo.addIssueTemplates(config);

    const opts = client.options.pop();
    t.is(opts.path, ".github/ISSUE_TEMPLATE/retweet.md");
    t.is(opts.message, "Tweet issue template for content queue");
    //TODO test template content
});

test.failing('add files without any content', async (t) => {
    const client = getGithubClient();
    client.queueResponse(Promise.reject(new Error()));
    const repo = new Repository(client, getConfig(), ACCOUNT_LIST);

    await t.throwsAsync(repo.ready);

    client.queueResponse(Promise.reject());

    await repo._addFiles();

    t.log(client.options);
    t.true(client.repos.createFile.calledWithMatch({
        path: "README.md"
    }));
    t.true(client.repos.createFile.calledWithMatch({
        path: ".github/ISSUE_TEMPLATE/tweet.md"
    }));
});

test.failing('add files without all content', async (t) => {
    const client = getGithubClient();
    client.queueResponse(Promise.reject(new Error()));
    const repo = new Repository(client, getConfig(), ACCOUNT_LIST);

    await t.throwsAsync(repo.ready);

    await repo._addFiles();

    t.false(client.repos.createFile.calledWithMatch({
        path: "README.md"
    }));
    t.false(client.repos.createFile.calledWithMatch({
        path: ".github/ISSUE_TEMPLATE/tweet.md"
    }));
});

test.failing('add files with issue tempalte', async (t) => {
    const client = getGithubClient();
    client.queueResponse(Promise.reject(new Error()));
    const repo = new Repository(client, getConfig(), ACCOUNT_LIST);

    await t.throwsAsync(repo.ready);

    await repo._addFiles();

    t.false(client.repos.createFile.calledWithMatch({
        path: "README.md"
    }));
    t.false(client.repos.createFile.calledWithMatch({
        path: ".github/ISSUE_TEMPLATE/tweet.md"
    }));
});

test('has label', async (t) => {
    const client = getGithubClient();
    client.queueResponse(Promise.reject(new Error()));
    const repo = new Repository(client, getConfig(), ACCOUNT_LIST);

    await t.throwsAsync(repo.ready);

    t.true(await repo.hasLabel('foo'));
    const opts = client.options.pop();
    t.is(opts.name, 'foo');
});

test('does not have label', async (t) => {
    const client = getGithubClient();
    client.queueResponse(Promise.reject(new Error()));
    const repo = new Repository(client, getConfig(), ACCOUNT_LIST);

    await t.throwsAsync(repo.ready);

    client.queueResponse(Promise.reject({
        code: 404
    }));

    t.false(await repo.hasLabel('foo'));
    const opts = client.options.pop();
    t.is(opts.name, 'foo');
});

test('has label network error', async (t) => {
    const client = getGithubClient();
    client.queueResponse(Promise.reject(new Error()));
    const repo = new Repository(client, getConfig(), ACCOUNT_LIST);

    await t.throwsAsync(repo.ready);

    client.queueResponse(Promise.reject(new Error()));

    return t.throwsAsync(repo.hasLabel('foo'));
});

test('add label', async (t) => {
    const client = getGithubClient();
    client.queueResponse(Promise.reject(new Error()));
    const config = getConfig();
    const repo = new Repository(client, config, ACCOUNT_LIST);

    await t.throwsAsync(repo.ready);

    client.queueResponse({});

    await repo.addLabel('foo', 'ffffff');

    const opts = client.options.pop();
    t.is(opts.owner, config.owner);
    t.is(opts.repo, config.repo);
    t.is(opts.name, 'foo');
    t.is(opts.color, 'ffffff');
});

test('ensure labels', async (t) => {
    const client = getGithubClient();
    client.queueResponse(Promise.reject(new Error()));
    const config = getConfig();
    const repo = new Repository(client, config, ACCOUNT_LIST);

    await t.throwsAsync(repo.ready);

    client.queueResponse({});

    await repo.ensureLabels({
        foo: config.labels.ready
    });

    const opts = client.options.pop();
    t.is(opts.name, config.labels.ready);
});

//TODO move to board
test.failing('create card without position', async (t) => {
    const client = getGithubClient();
    const config = getConfig();

    // Repo setup
    client.queueResponse({
        headers: {
            'x-oauth-scopes': 'public_repo, org:read'
        }
    });
    client.queueResponse({
        data: {
            owner: {
                type: 'User'
            }
        }
    });
    client.queueResponse({});
    client.queueResponse({
        data: {
            owner: {
                type: "User"
            }
        }
    });
    // Board setup
    client.queueResponse({
        data: []
    });
    client.queueResponse({
        data: [
            {
                name: config.projectName,
                id: 1
            }
        ]
    });
    // Issues setup
    client.queueResponse({
        data: []
    });

    const repo = new Repository(client, config, ACCOUNT_LIST);

    await repo.ready;

    const title = 'lorem ipsum';
    const content = 'foo bar';
    client.queueResponse({
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

//TODO move to board.
test.failing('create card with position', async (t) => {
    const client = getGithubClient();
    const config = getConfig();

    // Repo setup
    client.queueResponse({
        headers: {
            'x-oauth-scopes': 'public_repo, org:read'
        }
    });
    client.queueResponse({
        data: {
            owner: {
                type: 'User'
            }
        }
    });
    client.queueResponse();
    client.queueResponse({
        data: {
            owner: {
                type: "User"
            }
        }
    });
    // Board setup
    client.queueResponse({
        data: []
    });
    client.queueResponse({
        data: [
            {
                name: config.projectName,
                id: 1
            }
        ]
    });
    // Issues setup
    client.queueResponse({
        data: []
    });

    const repo = new Repository(client, config, ACCOUNT_LIST);

    await repo.ready;

    const title = 'lorem ipsum';
    const content = 'foo bar';
    client.queueResponse({
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
    client.queueResponse(Promise.reject(new Error()));
    const repo = new Repository(client, config, ACCOUNT_LIST);

    await t.throwsAsync(repo.ready);

    client.queueResponse({
        data: {
            owner: {
                type: 'User'
            }
        }
    });

    const isUser = await repo.belongsToUser();
    t.true(isUser);
    const opts = client.options.pop();
    t.is(opts.repo, config.repo);
    t.is(opts.owner, config.owner);
});

test('belongs to orga', async (t) => {
    const client = getGithubClient();
    const config = getConfig();
    client.queueResponse(Promise.reject(new Error()));
    const repo = new Repository(client, config, ACCOUNT_LIST);

    await t.throwsAsync(repo.ready);

    client.queueResponse({
        data: {
            owner: {
                type: 'Organization'
            }
        }
    });

    const isUser = await repo.belongsToUser();
    t.false(isUser);
    const opts = client.options.pop();
    t.is(opts.repo, config.repo);
    t.is(opts.owner, config.owner);
});

test('get users in team', async (t) => {
    const client = getGithubClient();
    const config = getConfig();
    client.queueResponse(Promise.reject(new Error()));

    const repo = new Repository(client, config, ACCOUNT_LIST);

    await t.throwsAsync(repo.ready);

    const team = 'baz';
    const member = 'lorem';
    const teamId = '1';

    client.queueResponse({
        data: {
            owner: {
                type: 'Organization'
            }
        }
    });
    client.queueResponse({
        data: [
            {
                name: 'owners',
                id: '9999'
            },
            {
                name: team,
                id: teamId
            }
        ],
        headers: {}
    });
    client.queueResponse({
        data: [
            {
                login: member
            }
        ],
        headers: {}
    });

    const users = await repo.getUsersInTeam(team);

    t.is(users.length, 1);
    t.true(users.includes(member));

    t.is(client.options.pop().url, `https://api.github.com/teams/${teamId}/members`);
    t.is(client.options.pop().url, `https://api.github.com/orgs/${config.owner}/teams`);
});

test('get users of team that does not exist', async (t) => {
    const client = getGithubClient();
    const config = getConfig();
    client.queueResponse(Promise.reject(new Error()));

    const repo = new Repository(client, config, ACCOUNT_LIST);

    await t.throwsAsync(repo.ready);

    const team = 'baz';

    client.queueResponse({
        data: {
            owner: {
                type: 'Organization'
            }
        }
    });
    client.queueResponse({
        data: [],
        headers: {}
    });

    await t.throwsAsync(repo.getUsersInTeam(team), {
        instanceOf: Error
    });

    t.is(client.options.pop().url, `https://api.github.com/orgs/${config.owner}/teams`);
});

test('can not get team members if repo belongs to user', async (t) => {
    const client = getGithubClient();
    client.queueResponse(Promise.reject(new Error()));
    const repo = new Repository(client, getConfig(), ACCOUNT_LIST);

    await t.throwsAsync(repo.ready);

    client.queueResponse({
        data: {
            owner: {
                type: 'User'
            }
        }
    });

    await t.throwsAsync(repo.getUsersInTeam('baz'));
});

test('has required permissions for user', async (t) => {
    const client = getGithubClient();
    client.queueResponse(Promise.reject(new Error()));
    const repo = new Repository(client, getConfig(), ACCOUNT_LIST);

    await t.throwsAsync(repo.ready);

    client.queueResponse({
        headers: {
            'x-oauth-scopes': 'public_repo'
        }
    });
    client.queueResponse({
        data: {
            owner: {
                type: 'User'
            }
        }
    });

    const hasPermissions = await repo.hasRequiredPermissions();

    t.true(hasPermissions);
    t.truthy(client.options.length);
});

test('has required permissions for org', async (t) => {
    const client = getGithubClient();
    client.queueResponse(Promise.reject(new Error()));
    const repo = new Repository(client, getConfig(), ACCOUNT_LIST);

    await t.throwsAsync(repo.ready);

    client.queueResponse({
        headers: {
            'x-oauth-scopes': 'public_repo, read:org'
        }
    });
    client.queueResponse({
        data: {
            owner: {
                type: 'Organization'
            }
        }
    });

    const hasPermissions = await repo.hasRequiredPermissions();

    t.true(hasPermissions);
    t.truthy(client.options.length);
});

test('does not have required permissions', async (t) => {
    const client = getGithubClient();
    client.queueResponse(Promise.reject(new Error()));
    const repo = new Repository(client, getConfig(), ACCOUNT_LIST);

    await t.throwsAsync(repo.ready);

    client.queueResponse({
        headers: {
            'x-oauth-scopes': 'repo'
        }
    });
    client.queueResponse({
        data: {
            owner: {
                type: 'Organization'
            }
        }
    });

    const hasPermissions = await repo.hasRequiredPermissions();

    t.false(hasPermissions);
    t.truthy(client.options.length);
});

test.failing('add issues to board', async (t) => {
    const client = getGithubClient();
    client.queueResponse(Promise.reject(new Error()));
    const repo = new Repository(client, getConfig(), ACCOUNT_LIST);

    await t.throwsAsync(repo.ready);

    repo.board = getBoard({
        Test: '1',
        Other: '2'
    });
    repo.board.addCard.resolves();
    const columns = await repo.board.columns;
    const issues = new Map();

    for(const column of Object.values(columns)) {
        column.hasIssue.resolves(false);
    }

    const issueFixtures = [
        {
            number: 4,
            column: '1'
        },
        {
            number: 5,
            column: '1'
        },
        {
            number: 6,
            column: '2'
        },
        {
            number: 10,
            column: '2'
        }
    ];

    for(const issue of issueFixtures) {
        issues.set(issue.number, {
            number: issue.number
        });
        columns[issue.column].hasIssue.withArgs(issue.number).resolves(true);
    }

    await repo.addIssuesToBoard(issues, Object.values(columns));

    for(const issue of issueFixtures) {
        t.true(repo.board.addCard.calledWith(issues.get(issue.number), columns[issue.column], true));
    }
});

test.failing('add no issues to board', async (t) => {
    const client = getGithubClient();
    client.queueResponse(Promise.reject(new Error()));
    const repo = new Repository(client, getConfig(), ACCOUNT_LIST);

    await t.throwsAsync(repo.ready);

    repo.board = getBoard({
        Test: '1',
        Other: '2'
    });
    const columns = await repo.board.columns;
    const issues = new Map();

    for(const column of Object.values(columns)) {
        column.hasIssue.resolves(false);
    }

    await repo.addIssuesToBoard(issues, Object.values(columns));

    t.false(repo.board.addCard.called);
});

test('update card', async (t) => {
    const client = getGithubClient();
    const config = getConfig();
    // Repo setup
    client.queueResponse({
        headers: {
            'x-oauth-scopes': 'public_repo, org:read'
        }
    });
    client.queueResponse({
        data: {
            owner: {
                type: "User"
            }
        }
    });
    client.queueResponse({});
    // Board setup
    client.queueResponse({
        data: [],
        headers: {}
    });
    const repo = new Repository(client, config, ACCOUNT_LIST);

    await t.notThrowsAsync(repo.ready);

    const card = getCard();
    const newContent = `${card.issue.content} dolor sit amet`;
    const openIssues = await repo.issues.issues;
    openIssues.set(card.issue.number, card.issue);

    client.queueResponse({
        data: {
            id: card.issue.id,
            number: card.issue.number,
            updated_at: new Date().toString(),
            body: newContent,
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
    client.queueResponse({
        data: [],
        headers: {}
    });

    await repo.updateCard(card);

    t.is(card.issue.content, newContent);
});

test.todo('setup');
