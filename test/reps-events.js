import test from 'ava';
import sinon from 'sinon';
import RepsEvents from '../lib/reps-events';
import UpdateManager from '../lib/update-manager';
import DataStoreHolder from '../lib/data-store-holder';

// Ensure update manager never calls update during tests unless we explicitly want it to.
let clock;
test.before(() => {
    clock = sinon.useFakeTimers();
});

test.afterEach(() => {
    clearInterval(UpdateManager.interval);
    UpdateManager.targets.clear();
});

test.after(() => {
    clock.restore();
});

test('construction', (t) => {
    const query = 'foo';
    const repsEvents = new RepsEvents(query);

    t.is(repsEvents.query, query);
    t.true(repsEvents instanceof DataStoreHolder);
});

test('url', (t) => {
    const query = 'foo';
    const repsEvents = new RepsEvents(query);

    t.is(repsEvents.url, `https://reps.mozilla.org/events/period/future/search/${encodeURIComponent(query)}/ical/`);
});

test.todo('events data store'); // needs a local express server that has an ical and override the url in the class by extending it.
test.todo('events created event');
