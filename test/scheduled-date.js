import test from 'ava';
import ScheduledDate from '../lib/scheduled-date';
import sinon from 'sinon';

let clock;

test.before(() => {
    clock = sinon.useFakeTimers();
});
test.after(() => {
    clock.restore();
});

test('constructor with invalid date', (t) => {
    const date = new ScheduledDate('', {
        format: '',
        timezone: 0
    });

    t.true(date instanceof Date);
    // Can't test the date object's time since the subclassing of the date object
    // isn't captured by the sinon shim.
    t.is(date.rawDate, '');
    t.false(date.valid);
});

test.todo('constructor with valid formatted date');

// these should both be able to use the same reference date formats and patterns.
// Should probably use ava macros (see config tests).
test.todo('split date formats');
test.todo('split date patterns')
test.todo('format date');
test.todo('valid date pattern');
test.todo('valid date format')

test.todo('non-string date format invalid');
test.todo('empty string date format invalid');
test.todo('only whitespace invalid date format');

test.todo('is the scheduled date instance valid');
