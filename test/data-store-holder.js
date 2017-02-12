import test from 'ava';
import DataStoreHolder from '../lib/data-store-holder';
import AsyncEventEmitter from '../lib/async-event-emitter';
import sinon from 'sinon';

test('constructor', (t) => {
    const updateStore = sinon.spy(() => Promise.resolve());
    const storeProp = "store";
    const h = new DataStoreHolder({
        [storeProp]: updateStore
    });

    t.true(h instanceof AsyncEventEmitter);
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

test.todo('update fires updated event');
test.todo('defined properties are magic stores that return a promise');
