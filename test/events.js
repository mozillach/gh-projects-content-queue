import test from 'ava';
import sinon from 'sinon';
import Events from '../lib/events';
import UpdateManager from '../lib/update-manager';
import DataStoreHolder from '../lib/data-store-holder';

// Ensure update manager never calls update during tests unless we explicitly want it to.
test.before((t) => {
    t.context.clock = sinon.useFakeTimers();
});

test.afterEach(() => {
    clearInterval(UpdateManager.interval);
    UpdateManager.targets.clear();
});

test.after((t) => {
    t.context.clock.restore();
});

test('construction', (t) => {
    const query = 'foo';
    const url = `https://reps.mozilla.org/events/period/future/search/${encodeURIComponent(query)}/ical/`;
    const repsEvents = new Events(url);

    t.is(repsEvents.url, url);
    t.true(repsEvents instanceof DataStoreHolder);
});

test.todo('events data store'); // needs a local express server that has an ical and override the url in the class by extending it.
test.todo('events created event');
