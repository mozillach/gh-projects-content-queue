import test from 'ava';
import AsyncEventEmitter from '../lib/async-event-emitter';
import EventEmitter from 'events';

test("constructor", (t) => {
    const aee = new AsyncEventEmitter();

    t.true(aee instanceof EventEmitter);
});

test.todo("handler are chained based on the promises they return");
test.todo("emit behaves like the original emit");
