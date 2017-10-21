import test from 'ava';
import { getGithubClient, getConfig } from './_stubs';
import Board from '../lib/board';
import UpdateManager from '../lib/update-manager';
import sinon from 'sinon';

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
                id: 1
            }
        ]
    });
});

test('constructor', (t) => {
    const board = new Board(t.context.gh, t.context.config);

    t.true("columns" in board);
    t.true("columnIds" in board);
    t.true("config" in board);

    t.is(board.githubClient, t.context.gh);
    t.true(board.cards instanceof Map);

    t.true("then" in board.ready);
    t.true("then" in board.columns);
    t.true("then" in board.columnIds);
});

test('not ready', (t) => {
    t.context.gh.projects.getProjectColumns.reset();
    t.context.gh.projects.getProjectColumns.rejects(new Error());
    const board = new Board(t.context.gh, t.context.config);

    return t.notThrows(board.ready);
});

test.todo('board updated event');

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
                id: 4
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
                id: 4
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
