import test from 'ava';
import Source from '../../lib/sources/source';
import { getRepo } from '../_stubs';

test('constructor', (t) => {
    const repo = 'a';
    const twitterAccount = 'b';
    const config = 'c';
    const managedColumns = 'd';
    const s = new Source(repo, twitterAccount, config, managedColumns);

    t.is(s._repo, repo);
    t.is(s._twitterAccount, twitterAccount);
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
    const repo = getRepo({
        Foo: "1"
    });
    const source = new Source(repo, undefined, config);

    const column = await source.getColumn('test');

    t.is(column.name, 'Foo');
    t.is(column.id, "1");
});
