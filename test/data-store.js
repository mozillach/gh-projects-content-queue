import test from 'ava';
import DataStore from '../lib/data-store';
import sinon from 'sinon';

let clock;

test.before(() => {
    clock = sinon.useFakeTimers();
    clock.tick(100);
});
test.after(() => {
    clock.restore();
});

test('constructor', (t) => {
    const CACHE_TIME = 3000;
    const fetcher = sinon.spy();
    const ds = new DataStore(fetcher, CACHE_TIME);

    t.is(ds.cacheTime, CACHE_TIME);
    t.false(fetcher.called);
    t.true(ds.lastUpdate < Date.now());
    t.is(ds.fetch, fetcher);
});

test.todo('cache expired without any fetched data');

test.todo('get data without cache');
// These tests are serial since they rely on clock behaviour for cache invalidation.
test.serial.todo('get data from cache');
test.serial.todo('get data from expired cache');
test.serial.todo('cache expired true');
test.serial.todo('cache expired false');

test.todo('fetch callback only gets called once while loading data');
