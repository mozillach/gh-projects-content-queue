import test from 'ava';
import DiscourseSource from '../../lib/sources/discourse';

test.todo('get discourse card content');

test('get title', (t) => {
    const thread = {
        title: 'foo'
    };
    const config = {
        forum: 'bar'
    };
    const title = DiscourseSource.getTitle(thread, config);

    t.is(typeof title, "string");
    t.is(title, DiscourseSource.getTitle(thread, config));
    t.not(title, DiscourseSource.getTitle({
        title: 'baz'
    }, config));
    t.not(title, DiscourseSource.getTitle(thread, {
        forum: 'baz'
    }));
});

test('required config', (t) => {
    const requiredConfig = DiscourseSource.requiredConfig;

    t.true(requiredConfig.includes('forum'));
    t.true(requiredConfig.includes('apiUrl'));
    t.true(requiredConfig.includes('apiKey'));
    t.true(requiredConfig.includes('username'));
});

test('required columns', (t) => {
    t.is(DiscourseSource.requiredColumns.length, 1);
    t.true(DiscourseSource.requiredColumns.includes('target'));
});

test.todo('construction');
test.todo('get thread');
test.todo('add thread');
test.todo('handle thread');
