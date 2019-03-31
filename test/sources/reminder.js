import test from 'ava';
import ReminderSource from '../../lib/sources/reminder';
import sinon from 'sinon';

test.before((t) => {
    t.context.clock = sinon.useFakeTimers();
});

test.after((t) => {
    t.context.clock.restore();
});

test('required columns', (t) => {
    t.is(ReminderSource.requiredColumns.length, 1);
    t.true(ReminderSource.requiredColumns.includes('target'));
});

test.serial('construction', (t) => {
    const source = new ReminderSource({
        ready: new Promise(() => {})
    }, 'foo', {
        ready: Promise.resolve()
    }, 'bar');

    t.is(source.lastRun, Date.now());
});

test('remind before', (t) => {
    const source = new ReminderSource({
        ready: new Promise(() => {})
    }, 'bar', {
        ready: Promise.resolve()
    }, 'baz');

    const second = 1000;
    const minute = 60 * second;
    const hour = 60 * minute;
    const day = 24 * hour;

    t.is(source.REMIND_BEFORE, day);
});

test.todo('on updated');
test.todo('storesupdated event');
