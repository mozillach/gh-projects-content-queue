import test from 'ava';
import MentionsSource from '../../lib/sources/mentions';
import TwitterAccount from '../../lib/twitter-account';

test('required columns', (t) => {
    t.true(MentionsSource.requiredColumns.includes('target'));
});

test('get tweet permalink', (t) => {
    const tweet = {
        user: {
            screen_name: 'foo'
        },
        id_str: '1234'
    };

    const url = MentionsSource.getTweetPermalink(tweet);

    t.is(TwitterAccount.getTweetIDFromURL(url), tweet.id_str);
    t.true(url.includes(tweet.user.screen_name));
});

test('format tweet', (t) => {
    const tweet = {
        user: {
            screen_name: 'foo'
        },
        id_str: '1234',
        text: 'lorem ipsum',
        truncated: false,
        entities: {}
    };
    const formattedTweet = MentionsSource.formatTweet(tweet);

    t.true(formattedTweet.startsWith(">"));
    t.true(formattedTweet.includes(tweet.text));
});

test.todo('construction');
test.todo('check issue');
