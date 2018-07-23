import test from 'ava';
import EventsSource from '../../lib/sources/events';
import { getConfig } from '../_stubs';
import sinon from 'sinon';

let clock;

test.before(() => {
    clock = sinon.useFakeTimers();
});

test.after(() => {
    clock.restore();
});

test.todo('get event card content');

test('get title', (t) => {
    const date = new Date();
    const event = {
        summary: 'foo',
        start: date
    };
    const config = getConfig();
    const title = EventsSource.getTitle(event, config);

    t.is(typeof title, "string");
    t.is(title, EventsSource.getTitle(event, config));
    t.not(title, EventsSource.getTitle({
        summary: 'baz',
        start: date
    }, config));

    clock.tick(60000);
    t.not(title, EventsSource.getTitle({
        summary: 'foo',
        start: new Date()
    }, config));
});

test('required config', (t) => {
    t.true(EventsSource.requiredConfig.includes('url'));
});

test('required columns', (t) => {
    t.is(EventsSource.requiredColumns.length, 1);
    t.true(EventsSource.requiredColumns.includes('target'));
});

test.todo('constructor');
test.todo('get event');
test.todo('add event');
test.todo('handle event');
