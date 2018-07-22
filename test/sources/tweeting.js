import test from 'ava';
import TweetingSource from '../../lib/sources/tweeting';
import { getRepo, getAccountManager, getColumn } from '../_stubs';
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
        getAccountManager(),
        {
            columns: {
                target: 'Foo',
                source: 'Bar'
            },
            schedule: []
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
test.todo('getUTCHourMinuteDate with fictures');

test.serial('getUTCHourMinuteDate', (t) => {
    const now = new Date();

    t.is(TweetingSource.getUTCHourMinuteDate(now.getUTCHours(), now.getUTCMinutes()), now.getTime());
});

test('get current quota is infinite without schedule', (t) => {
    const source = new TweetingSource(...getArgs());

    source._config.schedule.length = 0;

    const quota = source.getCurrentQuota();

    t.is(quota, Infinity);
});

test.serial('get current quota', (t) => {
    const source = new TweetingSource(...getArgs());

    source._config.schedule.length = 0;
    const now = new Date();
    source._config.schedule.push(`${now.getUTCHours()}:${now.getUTCMinutes() + 1}`);
    source._config.schedule.push(`${now.getUTCHours() + 1}:${now.getUTCMinutes()}`);
    source._config.schedule.push(`${now.getUTCHours() - 1}:${now.getUTCMinutes()}`);
    source._config.schedule.push(`${now.getUTCHours() - 1}:00}`);

    clock.tick(3700001);

    const quota = source.getCurrentQuota();

    t.is(quota, 2);
});

test('card tweeted', async (t) => {
    const args = getArgs();
    const source = new TweetingSource(...args);
    args[0].board.moveCardToColumn.resolves();
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

    await source.cardTweeted(card, url, column);

    t.true(args[0].board.moveCardToColumn.called);
    t.true(card.comment.calledOnce);
    t.true(card.comment.lastCall.args[0].includes(url));
    t.true(card.issue.close.called);
    t.true(column.addCard.calledWith(card));
});

test('card retweeted', async (t) => {
    const args = getArgs();
    const source = new TweetingSource(...args);
    args[0].board.moveCardToColumn.resolves();
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

    await source.cardTweeted(card, url, column);

    t.true(args[0].board.moveCardToColumn.called);
    t.true(card.comment.calledOnce);
    t.false(card.comment.lastCall.args[0].includes(url));
    t.true(card.issue.close.called);
    t.true(column.addCard.calledWith(card));
});
