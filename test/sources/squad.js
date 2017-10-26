import test from 'ava';
import SquadSource from '../../lib/sources/squad';
import { getRepo } from '../_stubs';
import RotatingList from '../../lib/rotating-list';
import sinon from 'sinon';

test('required columns', (t) => {
    const columns = SquadSource.requiredColumns;

    t.is(columns.length, 1);
    t.true(columns.includes('target'));
});

test('Constructor fails without any squad config', (t) => {
    t.throws(() => new SquadSource(getRepo(), 'foo', {}));
});

test('Constructor with hard coded squad', async (t) => {
    const squad = [
        'foo',
        'bar'
    ];
    const source = new SquadSource(getRepo(), 'lorem', {
        squad
    });

    const squadRotatingList = await source.squad;
    t.true(squadRotatingList instanceof RotatingList);
    t.deepEqual(squadRotatingList.items, squad);
});

test('Constructor with team squad', async (t) => {
    const repo = getRepo();
    const source = new SquadSource(repo, 'lorem', {
        squadTeam: 'foo'
    });
    repo.getUsersInTeam.resolves([
        'baz'
    ]);

    const squad = await source.squad;
    t.is(squad.size, 1);
    t.is(squad.getNext(), 'baz');
    t.true(repo.getUsersInTeam.calledWith('foo'));

    repo.githubClient.argumentsValid((assertion, message) => t.true(assertion, message));
});

test.todo('Test squad team data store keeps position');

test('process cards', async (t) => {
    const repo = getRepo({
        'Target': 'foo'
    });
    const columns = await repo.board.columns;
    const assign = sinon.spy();
    columns.foo.cards.add({
        assign,
        issue: {
            assignee: undefined
        }
    });
    const source = new SquadSource(repo, 'foo', {
        columns: {
            target: 'Target'
        },
        squad: [
            'bar'
        ]
    });

    await source.ready;

    t.true(assign.calledWith('bar'));
});

test('process cards with user assigned', async (t) => {
    const repo = getRepo({
        'Target': 'foo'
    });
    const columns = await repo.board.columns;
    const assign = sinon.spy();
    columns.foo.cards.add({
        assign,
        issue: {
            assignee: 'lorem ipsum'
        }
    });
    const source = new SquadSource(repo, 'foo', {
        columns: {
            target: 'Target'
        },
        squad: [
            'bar'
        ]
    });

    await source.ready;

    t.false(assign.called);
});

test.todo('process cards event listener');
