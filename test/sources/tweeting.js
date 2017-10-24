import test from 'ava';
import TweetingSource from '../../lib/sources/tweeting';
import { getRepo, getTwitterAccount, getColumn } from '../_stubs';
import sinon from 'sinon';

// Ensure update manager never calls update during tests unless we explicitly want it to.
let clock;
test.before(() => {
    clock = sinon.useFakeTimers();
});

test.after(() => {
    clock.restore();
});

const getArgs = () => {
    return [
        getRepo({
            'Foo': 1,
            'Bar': 2
        }),
        getTwitterAccount(),
        {
            columns: {
                target: 'Foo',
                source: 'Bar'
            }
        },
        () => Promise.resolve([ getColumn(1, 'Foo') ])
    ];
};

test('columns', (t) => {
    t.is(TweetingSource.requiredColumns.length, 2);
    t.true(TweetingSource.requiredColumns.includes('target'));
    t.true(TweetingSource.requiredColumns.includes('source'));
});

test('managed columns', (t) => {
    t.is(TweetingSource.managedColumns.length, 1);
    t.true(TweetingSource.managedColumns.includes('target'));
});

test('constructor', (t) => {
    const source = new TweetingSource(...getArgs());

    t.true("lastUpdate" in source);
    t.is(source.lastUpdate, Date.now());
});

test.todo('events');
test.todo('init');
test.todo('tweet');
test.todo('separateContentAndMedia');
test.todo('getUTCHourMinuteDate');
test.todo('get current quota');
