import test from 'ava';
import sinon from 'sinon';
import DiscourseThreads from '../lib/discourse-threads';
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
    const discourseThreads = new DiscourseThreads('https://example.com', 'a', 'b', 'c');

    t.true(discourseThreads instanceof DataStoreHolder);
    t.is(discourseThreads.forum, 'c');
});

test.todo('construction discourse client');
test.todo('threads data store');
test.todo('threads created event');
