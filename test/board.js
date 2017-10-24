import test from 'ava';
import { getGithubClient, getConfig, getColumn, getIssue } from './_stubs';
import Board from '../lib/board';
import UpdateManager from '../lib/update-manager';
import sinon from 'sinon';
import Column from '../lib/column';

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

test.beforeEach((t) => {
    t.context.gh = getGithubClient();
    t.context.config = getConfig();
    t.context.gh.projects.getProjectColumns.resolves({
        data: []
    });
    t.context.gh.projects.getRepoProjects.resolves({
        data: [
            {
                name: t.context.config.projectName,
                id: "1"
            }
        ]
    });
});

test.afterEach((t) => {
    t.context.gh.argumentsValid((assertion, message) => t.true(assertion, message));
});

test('constructor', async (t) => {
    const board = new Board(t.context.gh, t.context.config);

    t.true("columns" in board);
    t.true("columnIds" in board);
    t.true("config" in board);

    t.is(board.githubClient, t.context.gh);
    t.true(board.cards instanceof Map);

    t.true("then" in board.ready);
    t.true("then" in board.columns);
    t.true("then" in board.columnIds);

    await board.ready;

    UpdateManager.targets.has(board);
});

test('not ready', (t) => {
    t.context.gh.projects.getProjectColumns.reset();
    t.context.gh.projects.getProjectColumns.rejects(new Error());
    const board = new Board(t.context.gh, t.context.config);

    return t.notThrows(board.ready);
});

test('get board id', async (t) => {
    const board = new Board(t.context.gh, t.context.config);
    await board.ready;

    delete board.id;
    t.context.gh.projects.getRepoProjects.resetHistory();

    const id = await board.getBoardID();

    t.true("id" in board);
    t.is(id, board.id);
    t.true(t.context.gh.projects.getRepoProjects.called);

    t.context.gh.projects.getRepoProjects.resetHistory();

    board.id = 'foo';
    const storedId = await board.getBoardID();

    t.is(storedId, board.id);
    t.is(storedId, 'foo');
    t.false(t.context.gh.projects.getRepoProjects.called);
});

test('get board id throws when there are no projects', async (t) => {
    const board = new Board(t.context.gh, t.context.config);
    await board.ready;

    t.context.gh.projects.getRepoProjects.resolves({
        data: []
    });
    delete board.id;

    return t.throws(board.getBoardID());
});

test('get board id throws when the project does not exist', async (t) => {
    const board = new Board(t.context.gh, t.context.config);
    await board.ready;

    t.context.gh.projects.getRepoProjects.resolves({
        data: [
            {
                name: t.context.config.projectName + 'foo',
                id: "4"
            }
        ]
    });
    delete board.id;

    return t.throws(board.getBoardID());
});

test('board exists', async (t) => {
    const board = new Board(t.context.gh, t.context.config);
    await board.ready;

    delete board.id;

    t.true(await board.boardExists());
});

test('board exists is false if there are no projects', async (t) => {
    const board = new Board(t.context.gh, t.context.config);
    await board.ready;

    t.context.gh.projects.getRepoProjects.resolves({
        data: []
    });
    delete board.id;

    t.false(await board.boardExists());
});

test('board exists is false if the project is not found', async (t) => {
    const board = new Board(t.context.gh, t.context.config);
    await board.ready;

    t.context.gh.projects.getRepoProjects.resolves({
        data: [
            {
                name: t.context.config.projectName + 'foo',
                id: "4"
            }
        ]
    });
    delete board.id;

    t.false(await board.boardExists());
});

test('board exist throws for other errors', async (t) => {
    const board = new Board(t.context.gh, t.context.config);
    await board.ready;

    t.context.gh.projects.getRepoProjects.rejects('foo');
    delete board.id;

    return t.throws(board.boardExists());
});

test('missing columns', async (t) => {
    t.context.gh.projects.getProjectColumns.resolves({
        data: [
            {
                id: "1",
                name: t.context.config.sources[0].columns.target
            }
        ]
    });
    const board = new Board(t.context.gh, t.context.config);
    await board.ready;

    const allColumns = new Set();
    for(const source of t.context.config.sources) {
        for(const column of Object.values(source.columns)) {
            allColumns.add(column);
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
    t.context.gh.projects.createProjectColumn.resolves({
        data: {
            id: "1"
        }
    });
    const board = new Board(t.context.gh, t.context.config);
    await board.ready;

    t.true(await board.columnsExist());
});

test('columns dont exist', async (t) => {
    t.context.gh.projects.createRepoProject.rejects();
    const board = new Board(t.context.gh, t.context.config);
    await board.ready;

    t.false(await board.columnsExist());
});

test('create board', async (t) => {
    t.context.gh.projects.getRepoProjects.resolves({
        data: []
    });
    t.context.gh.projects.createRepoProject.resolves({
        data: {
            id: 'foo'
        }
    });
    const board = new Board(t.context.gh, t.context.config);
    await board.ready;

    t.is(board.id, 'foo');
    t.true(t.context.gh.projects.createRepoProject.calledWith(sinon.match({
        owner: t.context.config.owner,
        repo: t.context.config.repo,
        name: t.context.config.projectName
    })));
});

test('create column', async (t) => {
    const board = new Board(t.context.gh, t.context.config);
    await board.ready;

    t.context.gh.projects.createProjectColumn.resolves({
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
    const board = new Board(t.context.gh, t.context.config);
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
    const board = new Board(t.context.gh, t.context.config);
    t.context.gh.projects.moveProjectCard.resolves();
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

    t.true(t.context.gh.projects.moveProjectCard.calledWith(sinon.match({
        id: card.id,
        position: 'bottom',
        column_id: newColumn.id
    })));

    t.true(column.removeCard.calledWith(card, true, true));
    t.true(newColumn.addCard.calledWith(card, true));
});

test('move card to column locally', async (t) => {
    const board = new Board(t.context.gh, t.context.config);
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

    t.false(t.context.gh.projects.moveProjectCard.called);

    t.true(column.removeCard.calledWith(card, true, true));
    t.true(newColumn.addCard.calledWith(card, true));
});

test('card tweeted', async (t) => {
    const board = new Board(t.context.gh, t.context.config);
    t.context.gh.projects.moveProjectCard.resolves();
    const column = getColumn("1", 'test');
    const url = 'https://example.com';
    const card = {
        id: "2",
        comment: sinon.stub(),
        issue: {
            close: sinon.stub()
        },
        content: {
            isRetweet: false
        }
    };
    card.comment.resolves();
    card.issue.close.resolves();
    column.addCard.resolves();

    await board.cardTweeted(card, url, column);

    t.true(t.context.gh.projects.moveProjectCard.called);
    t.true(card.comment.calledOnce);
    t.true(card.comment.lastCall.args[0].includes(url));
    t.true(card.issue.close.called);
    t.true(column.addCard.calledWith(card));
});

test('card retweeted', async (t) => {
    const board = new Board(t.context.gh, t.context.config);
    t.context.gh.projects.moveProjectCard.resolves();
    const column = getColumn("1", 'test');
    const url = 'https://example.com';
    const card = {
        id: "2",
        comment: sinon.stub(),
        issue: {
            close: sinon.stub()
        },
        content: {
            isRetweet: true
        }
    };
    card.comment.resolves();
    card.issue.close.resolves();
    column.addCard.resolves();

    await board.cardTweeted(card, url, column);

    t.true(t.context.gh.projects.moveProjectCard.called);
    t.true(card.comment.calledOnce);
    t.false(card.comment.lastCall.args[0].includes(url));
    t.true(card.issue.close.called);
    t.true(column.addCard.calledWith(card));
});

test.todo('columns');
test.todo('columnIds')
