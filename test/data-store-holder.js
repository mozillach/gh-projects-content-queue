import test from 'ava';
import Emittery from 'emittery';
import DataStoreHolder from '../lib/data-store-holder';
import sinon from 'sinon';
import UpdateManager from '../lib/update-manager';

test('constructor', (t) => {
    const updateStore = sinon.spy(() => Promise.resolve());
    const storeProp = "store";
    const h = new DataStoreHolder({
        [storeProp]: updateStore
    });

    t.true(h instanceof Emittery);
    t.true(storeProp in h);

    const storeDescriptor = Object.getOwnPropertyDescriptor(h, storeProp);
    t.true(storeDescriptor.enumerable);
    t.is(typeof storeDescriptor.get, "function");
    t.is(storeDescriptor.set, undefined);
    t.false(storeDescriptor.configurable);
});

test('update updates data stores', async (t) => {
    const updateStore = sinon.spy(() => Promise.resolve());
    const h = new DataStoreHolder({
        store: updateStore
    });

    t.false(updateStore.called);

    await h.update();

    t.true(updateStore.calledOnce);
});

test('update fires updated event', async (t) => {
    const updateStore = sinon.spy(() => Promise.resolve());
    const h = new DataStoreHolder({
        store: updateStore
    });

    const promise = new Promise((resolve) => {
        h.once('storesupdated', resolve);
    });

    h.update();

    await promise;

    t.true(updateStore.calledOnce);
});

test('defined properties are magic stores that return a promise', async (t) => {
    const STORE_PROP = 'store';
    const RV = 'a';
    const updateStore = sinon.spy(() => Promise.resolve(RV));
    const h = new DataStoreHolder({
        [STORE_PROP]: updateStore
    });

    const returnVal1 = h[STORE_PROP];

    t.is(typeof returnVal1.then, 'function');

    const result1 = await returnVal1;

    t.is(result1, RV);
    t.true(updateStore.calledOnce);

    const returnVal2 = h[STORE_PROP];

    t.is(typeof returnVal2.then, 'function');

    const result2 = await returnVal2;

    t.is(result2, RV);
    t.true(updateStore.calledOnce);
});

test('emits events', (t) => {
    const store = sinon.spy();
    store.emitsEvents = true;
    const h = new DataStoreHolder({
        store
    });

    t.true(UpdateManager.targets.has(h));
});
