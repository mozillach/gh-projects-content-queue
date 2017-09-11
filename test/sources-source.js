import test from 'ava';
import Source from '../lib/sources/source';

test('constructor', (t) => {
    const repo = 'a';
    const twitterAccount = 'b';
    const s = new Source(repo, twitterAccount);

    t.is(s._repo, repo);
    t.is(s._twitterAccount, twitterAccount);
});

test('required columns', (t) => {
    t.true(Array.isArray(Source.requiredColumns));
    t.is(Source.requiredColumns.length, 0);
});

test.todo('getColumn');
