import test from 'ava';
import { getGithubClient } from './_stubs';
import Column from '../lib/column';
import sinon from 'sinon';

// Ensure data stores are not invalidated.
let clock;

test.before(() => {
    clock = sinon.useFakeTimers();
});
test.after(() => {
    clock.restore();
});

test('constructor', (t) => {
    const client = getGithubClient();
    client.projects.getProjectCards.resolves({
        data: []
    });
    const id = 1;
    const name = 'test';
    const cards = new Map();
    const column = new Column(client, id, name, cards);

    t.is(column.githubClient, client);
    t.is(column.id, id);
    t.is(column.name, name);
    t.is(column.allCards, cards);

    t.true("issues" in column);
    t.true("cards" in column);

    t.true("then" in column.issues);
    t.true("then" in column.cards);
});

test('move', async (t) => {
    const client = getGithubClient();
    client.projects.moveProjectColumn.resolves();

    const column = new Column(client, 1);

    await column.move('start');

    t.true(client.projects.moveProjectColumn.calledWith(sinon.match({
        id: 1,
        position: 'start'
    })));
});

test('create', async (t) => {
    const client = getGithubClient();
    client.projects.createProjectColumn.resolves({
        data: {
            id: 1
        }
    });
    const projectId = 2;
    const name = 'test';
    const cards = new Map();

    const column = await Column.create(client, projectId, name, cards);

    t.true(column instanceof Column);
    t.is(column.id, 1);
    t.is(column.name, name);
    t.is(column.allCards, cards);
    t.is(column.githubClient, client);

    t.true(client.projects.createProjectColumn.calledWith(sinon.match({
        project_id: projectId,
        name
    })));
});

test('add card localonly that does not exist remotely', async (t) => {
    const client = getGithubClient();
    client.projects.getProjectCards.resolves({
        data: []
    });
    const column = new Column(client, 1, 'test', new Map());
    const card = {
        id: 1,
        issue: {
            number: 1
        }
    };

    const addedCard = await column.addCard(card, true);

    t.deepEqual(addedCard, card);
    t.is(card.column, column);
    t.false(client.projects.createProjectCard.called);

    const cards = await column.cards;

    t.true(cards.has(card));

    const issues = await column.issues;

    t.false(card.issue.number in issues);
});

test('add card that is already assigned to the column', async (t) => {
    const client = getGithubClient();
    client.projects.getProjectCards.resolves({
        data: []
    });
    const column = new Column(client, 1, 'test', new Map());
    const card = {
        id: 1,
        issue: {
            number: 1
        },
        column
    };

    const addedCard = await column.addCard(card, true);

    t.deepEqual(addedCard, card);
    t.false(client.projects.createProjectCard.called);

    const cards = await column.cards;

    t.false(cards.has(card));
});

test('add card throws when card has no id and local only', (t) => {
    const client = getGithubClient();
    client.projects.getProjectCards.resolves({
        data: []
    });
    const column = new Column(client, 1, 'test', new Map());
    const card = {
        issue: {
            number: 1
        }
    };

    return t.throws(column.addCard(card, true), Error);
});

test('add card remotely', async (t) => {
    const client = getGithubClient();
    client.projects.getProjectCards.resolves({
        data: []
    });
    client.projects.createProjectCard.resolves({
        data: {
            id: 2
        }
    });

    const column = new Column(client, 1, 'test', new Map());
    const card = {
        issue: {
            number: 3,
            id: 4
        }
    };

    const addedCard = await column.addCard(card);

    t.deepEqual(addedCard, card);
    t.is(card.id, 2);
    t.is(card.column, column);
    t.true(client.projects.createProjectCard.calledWith(sinon.match({
        column_id: column.id,
        content_id: card.issue.id,
        content_type: 'Issue'
    })));

    const issues = await column.issues;

    t.true(card.issue.number in issues);
    t.deepEqual(issues[card.issue.number], {
        id: 2
    });

    const cards = await column.cards;

    t.true(cards.has(card));
});

test('add card that is already in the column', async (t) => {
    const client = getGithubClient();
    client.projects.getProjectCards.resolves({
        data: [
            {
                id: 2,
                content_url: 'https://github.com/mozillach/gh-projects-content-queue/issues/3'
            }
        ]
    });
    const column = new Column(client, 1, 'test', new Map());
    const card = {
        issue: {
            number: 3
        }
    };

    const addedCard = await column.addCard(card);

    t.deepEqual(addedCard, card);
    t.is(card.id, 2);
    t.is(card.column, column);
    t.false(client.projects.createProjectCard.called);

    const cards = await column.cards;

    t.true(cards.has(card));
});

test('remove card locally and keep the card', async (t) => {
    const client = getGithubClient();
    client.projects.getProjectCards.resolves({
        data: []
    });
    const allCards = new Map();
    const column = new Column(client, 1, 'test', allCards);
    const card = {
        id: 2,
        issue: {
            number: 3
        },
        column
    };
    const cards = await column.cards;
    cards.add(card);
    allCards.set(card.id, card);

    await column.removeCard(card, true, true);

    t.not(card.column, column);

    t.false(cards.has(card));
    t.true(allCards.has(card.id));
});

test('remove card remotely and do not keep it', async (t) => {
    const client = getGithubClient();
    client.projects.getProjectCards.resolves({
        data: []
    });
    client.projects.deleteProjectCard.resolves();
    const allCards = new Map();
    const column = new Column(client, 1, 'test', allCards);
    const card = {
        id: 2,
        issue: {
            number: 3
        },
        column
    };
    const cards = await column.cards;
    cards.add(card);
    allCards.set(card.id, card);

    await column.removeCard(card);

    t.true(client.projects.deleteProjectCard.calledWith(sinon.match({
        id: card.id
    })));

    t.false(allCards.has(card.id));
    t.false(cards.has(card));
});

test('get card', async (t) => {
    const client = getGithubClient();
    client.projects.getProjectCards.resolves({
        data: []
    });
    const column = new Column(client, 1, 'test', new Map());
    const card = {
        id: 2,
        issue: {
            number: 3
        },
        column
    };
    const cards = await column.cards;
    cards.add(card);

    const foundCard = await column.getCard(card.issue.id);

    t.deepEqual(foundCard, card);
});

test('move card', async (t) => {
    const client = getGithubClient();
    client.projects.getProjectCards.resolves({
        data: []
    });
    client.projects.moveProjectCard.resolves();
    const column = new Column(client, 1, 'test', new Map());
    const card = {
        id: 2,
        column
    };

    await column.moveCard(card, 'start');

    t.true(client.projects.moveProjectCard.calledWith(sinon.match({
        id: card.id,
        position: 'start'
    })));
});

test('check cards', async (t) => {
    const client = getGithubClient();
    client.projects.getProjectCards.resolves({
        data: []
    });
    const column = new Column(client, 1, 'test', new Map());
    const card = {
        checkValidity: sinon.spy()
    };

    const cards = await column.cards;
    cards.add(card);

    await column.checkCards();

    t.true(card.checkValidity.called);
});

test('has issue', async (t) => {
    const client = getGithubClient();
    client.projects.getProjectCards.resolves({
        data: [
            {
                id: 2,
                content_url: 'https://github.com/mozillach/gh-projects-content-queue/issues/3'
            }
        ]
    });
    const column = new Column(client, 1, 'test', new Map());

    t.true(await column.hasIssue(3));
    t.false(await column.hasIssue(2));
});

test('has card', (t) => {
    const client = getGithubClient();
    client.projects.getProjectCards.resolves({
        data: []
    });
    const allCards = new Map();
    const column = new Column(client, 1, 'test', allCards);

    allCards.set(2, {
        column
    });
    allCards.set(3, {});

    t.true(column.hasGithubCardId(2));
    t.false(column.hasGithubCardId(3));
});

test('get card by id', (t) => {
    const client = getGithubClient();
    client.projects.getProjectCards.resolves({
        data: []
    });
    const allCards = new Map();
    const column = new Column(client, 1, 'test', allCards);

    const card = {
        id: 2,
        column
    };
    allCards.set(2, card);
    allCards.set(3, {
        id: 3
    });

    t.deepEqual(column.getCardById(2), card);
    t.is(column.getCardById(3), null);
});

test('issues', async (t) => {
    const client = getGithubClient();
    client.projects.getProjectCards.resolves({
        data: [
            {
                id: 2,
                content_url: 'https://github.com/mozillach/gh-projects-content-queue/issues/3'
            },
            {
                id: 4,
                content_url: 'https://github.com/mozillach/gh-projects-content-queue/pull-requests/5'
            }
        ]
    });
    const column = new Column(client, 1, 'test', new Map());

    const issues = await column.issues;

    t.true('3' in issues);
    t.true('5' in issues);
    t.is(issues['3'].id, 2);
    t.is(issues['5'].id, 4);
});

test.todo('cards');
