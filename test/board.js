import test from 'ava';
import { getGithubClient, getConfig, getColumn, getIssue, getRepo } from './_stubs';
import Board from '../lib/board';
import UpdateManager from '../lib/update-manager';
import sinon from 'sinon';
import Column from '../lib/column';
import { NoProjectsError, ProjectNotFoundError } from '../lib/board-errors';

// Ensure update manager never calls update during tests unless we explicitly want it to.
test.before((t) => {
    t.context.clock = sinon.useFakeTimers();
});

test.after((t) => {
    t.context.clock.restore();
});

test.beforeEach((t) => {
    t.context.gh = getGithubClient();
    t.context.config = getConfig();
    t.context.gh.queueResponse({
        data: [],
        headers: {}
    });
    t.context.gh.queueResponse({
        data: [
            {
                name: t.context.config.projectName,
                id: "1"
            }
        ],
        headers: {}
    });
});

test.afterEach(() => {
    clearInterval(UpdateManager.interval);
    UpdateManager.targets.clear();
});

test('constructor', async (t) => {
    const board = new Board(t.context.gh, t.context.config, getRepo());

    t.true("columns" in board);
    t.true("columnIds" in board);
    t.true("config" in board);
    t.true("repo" in board);

    t.is(board.githubClient, t.context.gh);
    t.true(board.cards instanceof Map);

    t.true("then" in board.ready);
    t.context.gh.queueResponse({
        data: [],
        headers: {}
    });
    t.true("then" in board.columns);
    t.true("then" in board.columnIds);

    await board.ready;

    UpdateManager.targets.has(board);
});

test('not ready', (t) => {
    t.context.gh.queueResponse(Promise.resolve(new Error()));
    const board = new Board(t.context.gh, t.context.config, getRepo());

    return t.notThrowsAsync(board.ready);
});

test('get board id', async (t) => {
    const board = new Board(t.context.gh, t.context.config, getRepo());
    await board.ready;

    delete board.id;
    t.context.gh.queueResponse({
        data: [
            {
                name: t.context.config.projectName,
                id: 1
            }
        ]
    });

    const id = await board.getBoardID();

    t.true("id" in board);
    t.is(id, board.id);
    t.is(t.context.gh.options.length, 4);

    board.id = 'foo';
    const storedId = await board.getBoardID();

    t.is(storedId, board.id);
    t.is(storedId, 'foo');
    t.is(t.context.gh.options.length, 4);
});

test('get board id throws when there are no projects', async (t) => {
    const board = new Board(t.context.gh, t.context.config, getRepo());
    await board.ready;

    t.context.gh.queueResponse({
        data: [],
        headers: {}
    });
    delete board.id;

    return t.throwsAsync(board.getBoardID(), NoProjectsError);
});

test('get board id throws when the project does not exist', async (t) => {
    const board = new Board(t.context.gh, t.context.config, getRepo());
    await board.ready;

    t.context.gh.queueResponse({
        data: [
            {
                name: t.context.config.projectName + 'foo',
                id: "4"
            }
        ],
        headers: {}
    });
    delete board.id;

    return t.throwsAsync(board.getBoardID(), ProjectNotFoundError);
});

test('board exists', async (t) => {
    const board = new Board(t.context.gh, t.context.config, getRepo());
    await board.ready;

    delete board.id;
    t.context.gh.queueResponse({
        data: [
            {
                name: t.context.config.projectName,
                id: 1
            }
        ]
    });

    t.true(await board.boardExists());
});

test('board exists is false if there are no projects', async (t) => {
    const board = new Board(t.context.gh, t.context.config, getRepo());
    await board.ready;

    t.context.gh.queueResponse({
        data: [],
        headers: {}
    });
    delete board.id;

    t.false(await board.boardExists());
});

test('board exists is false if the project is not found', async (t) => {
    const board = new Board(t.context.gh, t.context.config, getRepo());
    await board.ready;

    t.context.gh.queueResponse({
        data: [
            {
                name: t.context.config.projectName + 'foo',
                id: "4"
            }
        ],
        headers: {}
    });
    delete board.id;

    t.false(await board.boardExists());
});

test('board exist throws for other errors', async (t) => {
    const board = new Board(t.context.gh, t.context.config, getRepo());
    await board.ready;

    t.context.gh.queueResponse(Promise.reject(new Error('foo')));
    delete board.id;

    return t.throwsAsync(board.boardExists());
});

test('missing columns', async (t) => {
    t.context.gh.queueResponse({
        data: [
            {
                name: t.context.config.projectName,
                id: 1
            }
        ],
        headers: {}
    });
    t.context.gh.queueResponse({
        data: [
            {
                id: "1",
                name: t.context.config.sources[0].columns.target
            }
        ],
        headers: {}
    });
    const board = new Board(t.context.gh, t.context.config, getRepo());
    await board.ready;

    const allColumns = new Set();
    for(const source of t.context.config.sources) {
        if(source.hasOwnProperty('columns')) {
            for(const column of Object.values(source.columns)) {
                allColumns.add(column);
            }
        }
    }

    const missingColumns = await board.missingColumns();

    t.is(missingColumns.length, allColumns.size - 1);
    for(const missing of missingColumns) {
        t.not(missing, t.context.config.sources[0].columns.target);
        t.true(allColumns.has(missing));
    }
});

test('columns exist', async (t) => {
    t.context.gh.queueResponse({
        data: [
            {
                id: 1,
                name: t.context.config.projectName
            }
        ],
        headers: {}
    });
    t.context.gh.queueResponse({
        data: [
            {
                id: "1",
                name: t.context.config.sources[0].columns.target
            }
        ],
        headers: {}
    });
    let currId = 0;
    for(const source of t.context.config.sources) {
        for(const c in source.columns) {
            t.log("Creating", c);
            t.context.gh.queueResponse({
                data: {
                    id: (++currId).toString()
                }
            });
        }
    }
    const board = new Board(t.context.gh, t.context.config, getRepo());
    await board.ready;

    t.true(await board.columnsExist());
});

test('columns dont exist', async (t) => {
    t.context.gh.queueResponse({
        data: [
            {
                id: 1,
                name: t.context.config.projectName
            }
        ],
        headers: {}
    });
    t.context.gh.queueResponse({
        data: [],
        headers: {}
    });
    t.context.gh.queueResponse(Promise.reject(new Error()));
    const board = new Board(t.context.gh, t.context.config, getRepo());
    await board.ready;

    t.false(await board.columnsExist());
});

test('create board', async (t) => {
    t.context.gh.resetQueue();
    t.context.gh.queueResponse({
        data: [],
        headers: {}
    });
    t.context.gh.queueResponse({
        data: {
            id: "100"
        }
    });
    const board = new Board(t.context.gh, t.context.config, getRepo());
    await board.ready;

    t.is(board.id, "100");
    const [ , opts ] = t.context.gh.options;
    t.is(opts.repo, t.context.config.repo);
    t.is(opts.name, t.context.config.projectName);
    t.is(opts.owner, t.context.config.owner);
});

test('create column', async (t) => {
    t.context.gh.queueResponse({
        data: [
            {
                name: t.context.config.projectName,
                id: "1"
            }
        ],
        headers: {}
    });
    t.context.gh.queueResponse({
        data: [],
        headers: {}
    });
    const board = new Board(t.context.gh, t.context.config, getRepo());
    await board.ready;

    t.context.gh.queueResponse({
        data: {
            id: "1"
        }
    });

    await board.createColumn('test');

    const columns = await board.columns;
    t.true("1" in columns);
    t.true(columns["1"] instanceof Column);

    const columnIds = await board.columnIds;
    t.true('test' in columnIds);
    t.is(columnIds.test, "1");
});

test.todo('setup');

test('add card', async (t) => {
    const board = new Board(t.context.gh, t.context.config, getRepo());
    const column = getColumn(1, 'test');
    const card = {
        id: "2"
    };
    const issue = getIssue();
    column.addCard.resolves(card);

    const returnedCard = await board.addCard(issue, column, 'a');

    t.is(returnedCard, card);
    t.true(board.cards.has(card.id));
    t.is(board.cards.get(card.id), card);

    t.true(column.addCard.calledWith(sinon.match({
        issue
    }, 'a')));
});

test('move card to column', async (t) => {
    t.context.gh.queueResponse({
        data: [
            {
                name: t.context.config.projectName,
                id: "1"
            }
        ],
        headers: {}
    });
    t.context.gh.queueResponse({
        data: [],
        headers: {}
    });
    const board = new Board(t.context.gh, t.context.config, getRepo());
    await board.ready;
    const column = getColumn("1", 'test');
    const newColumn = getColumn("2", 'lorem ipsum');
    const card = {
        id: "3",
        column
    };

    board.cards.set(card.id, card);

    column.removeCard.resolves();
    newColumn.addCard.resolves();

    await board.moveCardToColumn(card, newColumn);

    t.true(board.cards.has(card.id));

    const opts = t.context.gh.options.pop();
    t.is(opts.card_id, card.id);
    t.is(opts.position, 'bottom');
    t.is(opts.column_id, newColumn.id);

    t.true(column.removeCard.calledWith(card, true, true));
    t.true(newColumn.addCard.calledWith(card, true));
});

test('move card to column locally', async (t) => {
    t.context.gh.queueResponse({
        data: [
            {
                name: t.context.config.projectName,
                id: "1"
            }
        ],
        headers: {}
    });
    t.context.gh.queueResponse({
        data: [],
        headers: {}
    });
    const board = new Board(t.context.gh, t.context.config, getRepo());
    await board.ready;
    t.context.gh.options.length = 0;
    const column = getColumn("1", 'test');
    const newColumn = getColumn("2", 'lorem ipsum');
    const card = {
        id: "3",
        column
    };

    board.cards.set(card.id, card);

    column.removeCard.resolves();
    newColumn.addCard.resolves();

    await board.moveCardToColumn(card, newColumn, true, 'top');

    t.true(board.cards.has(card.id));

    t.falsy(t.context.gh.options.length);

    t.true(column.removeCard.calledWith(card, true, true));
    t.true(newColumn.addCard.calledWith(card, true));
});

test.todo('columns');
test.todo('columnIds');
