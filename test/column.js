import test from 'ava';
import { getGithubClient } from './_stubs';
import Column from '../lib/column';
import sinon from 'sinon';

// Ensure data stores are not invalidated.
test.before((t) => {
    t.context.clock = sinon.useFakeTimers();
});
test.after((t) => {
    t.context.clock.restore();
});

test('constructor', (t) => {
    const client = getGithubClient();
    client.queueResponse({
        data: [],
        headers: {}
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

    const column = new Column(client, 1);

    await column.move('start');

    const opts = client.options.pop();
    t.is(opts.column_id, 1);
    t.is(opts.position, 'start');
});

test('create', async (t) => {
    const client = getGithubClient();
    client.queueResponse({
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

    const opts = client.options.pop();
    t.is(opts.project_id, projectId);
    t.is(opts.name, name);
});

test('add card localonly that does not exist remotely', async (t) => {
    const client = getGithubClient();
    client.queueResponse({
        data: [],
        headers: {}
    });
    const allCards = new Map();
    allCards.isReady = true;
    allCards.ready = Promise.resolve();
    const column = new Column(client, 1, 'test', allCards);
    const card = {
        id: 1,
        issue: {
            number: 1
        }
    };

    const addedCard = await column.addCard(card, true);

    t.deepEqual(addedCard, card);
    t.is(card.column, column);
    t.is(client.options.length, 1);

    const cards = await column.cards;

    t.true(cards.has(card));

    const issues = await column.issues;

    t.false(card.issue.number in issues);
});

test('add card that is already assigned to the column', async (t) => {
    const client = getGithubClient();
    client.queueResponse({
        data: [],
        headers: {}
    });
    const allCards = new Map();
    allCards.isReady = true;
    allCards.ready = Promise.resolve();
    const column = new Column(client, 1, 'test', allCards);
    const card = {
        id: 1,
        issue: {
            number: 1
        },
        column
    };

    const addedCard = await column.addCard(card, true);

    t.deepEqual(addedCard, card);
    t.is(client.options.length, 0);

    const cards = await column.cards;

    t.false(cards.has(card));
});

test('add card throws when card has no id and local only', (t) => {
    const client = getGithubClient();
    client.queueResponse({
        data: [],
        headers: {}
    });
    const column = new Column(client, 1, 'test', new Map());
    const card = {
        issue: {
            number: 1
        }
    };

    return t.throwsAsync(column.addCard(card, true), Error);
});

test('add card remotely', async (t) => {
    const client = getGithubClient();
    client.queueResponse({
        data: [],
        headers: {}
    });
    client.queueResponse({
        data: {
            id: 2
        }
    });

    const allCards = new Map();
    allCards.ready = Promise.resolve();
    allCards.isReady = true;
    const column = new Column(client, 1, 'test', allCards);
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
    const opts = client.options.pop();
    t.is(opts.column_id, column.id);
    t.is(opts.content_id, card.issue.id);
    t.is(opts.content_type, 'Issue');

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
    client.queueResponse({
        data: [
            {
                id: 2,
                content_url: 'https://github.com/mozillach/gh-projects-content-queue/issues/3'
            }
        ],
        headers: {}
    });
    const allCards = new Map();
    allCards.ready = Promise.resolve();
    allCards.isReady = true;
    const column = new Column(client, 1, 'test', allCards);
    const card = {
        issue: {
            number: 3
        }
    };

    const addedCard = await column.addCard(card);

    t.deepEqual(addedCard, card);
    t.is(card.id, 2);
    t.is(card.column, column);
    t.is(client.options.length, 1);

    const cards = await column.cards;

    t.true(cards.has(card));
});

test('remove card locally and keep the card', async (t) => {
    const client = getGithubClient();
    client.queueResponse({
        data: [],
        headers: {}
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
    client.queueResponse({
        data: [],
        headers: {}
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

    await column.removeCard(card);

    const opts = client.options.pop();
    t.is(opts.card_id, card.id);
    t.is(opts.method, 'DELETE');

    t.false(allCards.has(card.id));
    t.false(cards.has(card));
});

test('get card', async (t) => {
    const client = getGithubClient();
    client.queueResponse({
        data: [],
        headers: {}
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
    client.queueResponse({
        data: [],
        headers: {}
    });
    const column = new Column(client, 1, 'test', new Map());
    const card = {
        id: 2,
        column
    };

    await column.moveCard(card, 'start');

    const opts = client.options.pop();
    t.is(opts.card_id, card.id);
    t.is(opts.position, 'start');
});

test('has issue', async (t) => {
    const client = getGithubClient();
    client.queueResponse({
        data: [
            {
                id: 2,
                content_url: 'https://github.com/mozillach/gh-projects-content-queue/issues/3'
            }
        ],
        headers: {}
    });
    const column = new Column(client, 1, 'test', new Map());

    t.true(await column.hasIssue(3));
    t.false(await column.hasIssue(2));
});

test('has card', (t) => {
    const client = getGithubClient();
    client.queueResponse({
        data: [],
        headers: {}
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
    client.queueResponse({
        data: [],
        headers: {}
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
    client.queueResponse({
        data: [
            {
                id: 2,
                content_url: 'https://github.com/mozillach/gh-projects-content-queue/issues/3'
            },
            {
                id: 4,
                content_url: 'https://github.com/mozillach/gh-projects-content-queue/pull-requests/5'
            }
        ],
        headers: {}
    });
    const column = new Column(client, 1, 'test', new Map());

    const issues = await column.issues;

    t.true('3' in issues);
    t.true('5' in issues);
    t.is(issues['3'].id, 2);
    t.is(issues['5'].id, 4);
});

test.todo('cards');
test.todo('waits for cards to be ready');
