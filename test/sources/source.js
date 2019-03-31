import test from 'ava';
import Source from '../../lib/sources/source';
import { getBoard } from '../_stubs';

test('constructor', (t) => {
    const repo = 'a';
    const accountManager = 'b';
    const config = 'c';
    const managedColumns = 'd';
    const board = 'e';
    const s = new Source(repo, accountManager, board, config, managedColumns);

    t.is(s._repo, repo);
    t.is(s._accountManager, accountManager);
    t.is(s._config, config);
    t.is(s._getManagedColumns, managedColumns);
});

test('required columns', (t) => {
    t.true(Array.isArray(Source.requiredColumns));
    t.is(Source.requiredColumns.length, 0);
});

test('required config', (t) => {
    t.true(Array.isArray(Source.requiredConfig));
    t.deepEqual(Source.requiredConfig, [
        'columns'
    ]);
});

test('managed columns', (t) => {
    t.true(Array.isArray(Source.managedColumns));
    t.is(Source.managedColumns.length, 0);
});

test('getColumn', async (t) => {
    const config = {
        columns: {
            test: 'Foo'
        }
    };
    const board = getBoard({
        Foo: "1"
    });
    const repo = board.repo;
    const source = new Source(repo, undefined, board, config);

    const column = await source.getColumn('test');

    t.is(column.name, 'Foo');
    t.is(column.id, "1");
});
