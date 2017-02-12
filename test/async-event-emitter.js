import test from 'ava';
import AsyncEventEmitter from '../lib/async-event-emitter';
import EventEmitter from 'events';
import sinon from 'sinon';

test("constructor", (t) => {
    const aee = new AsyncEventEmitter();

    t.true(aee instanceof EventEmitter);
});

test("handler are chained based on the promises they return", async (t) => {
    const aee = new AsyncEventEmitter();

    let lastListener;
    const promiseToResolve = new Promise((resolve) => {
        lastListener = sinon.spy(() => {
            resolve();
            return Promise.resolve();
        });
    });

    const listener = sinon.spy(() => Promise.resolve());
    const firstListener = sinon.spy();

    aee.on('test', firstListener);
    aee.on('test', listener);
    aee.on('test', lastListener);

    t.true(aee.emit('test'));

    await promiseToResolve;

    t.true(firstListener.calledOnce);
    t.true(listener.calledOnce);
    t.true(lastListener.calledOnce);
    t.true(firstListener.calledBefore(listener));
    t.true(listener.calledBefore(lastListener));
});

test("emit behaves like the original emit", async (t) => {
    const EVENT = 'test';
    const aee = new AsyncEventEmitter();

    const result = aee.emit(EVENT);
    t.is(typeof result, 'boolean');
    t.false(result);

    let listener;
    const promise = new Promise((resolve) => {
        listener = sinon.spy(() => {
            resolve();
        });
    });
    aee.on(EVENT, listener);

    const resultWith = aee.emit(EVENT);
    t.is(typeof resultWith, 'boolean');
    t.true(resultWith);

    await promise;
    t.true(listener.calledOnce);

    aee.removeListener(EVENT, listener);
});

test("rejecting listener doesn't stop chain", async (t) => {
    const aee = new AsyncEventEmitter();

    let listener;
    const promiseToResolve = new Promise((resolve) => {
        listener = sinon.spy(() => {
            resolve();
            return Promise.resolve();
        });
    });

    const firstListener = sinon.spy(() => Promise.reject());

    aee.on('test', firstListener);
    aee.on('test', listener);

    t.true(aee.emit('test'));

    await promiseToResolve;

    t.true(firstListener.calledOnce);
    t.true(listener.calledOnce);
    t.true(firstListener.calledBefore(listener));
});
