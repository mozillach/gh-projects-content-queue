import test from 'ava';
import TwitterAccount from '../lib/twitter-account';

// getTweetIDFromURL()
test('get tweet id from url with http', (t) => {
    const TWEET_ID = "798606989978910720";
    const TWEET_URL = `http://twitter.com/freaktechnik/status/${TWEET_ID}`;

    t.is(TwitterAccount.getTweetIDFromURL(TWEET_URL), TWEET_ID);
});

test('get tweet id from url with https', (t) => {
    const TWEET_ID = "798606989978910720";
    const TWEET_URL = `https://twitter.com/freaktechnik/status/${TWEET_ID}`;

    t.is(TwitterAccount.getTweetIDFromURL(TWEET_URL), TWEET_ID);
});

test('get tweet id from url with http and www', (t) => {
    const TWEET_ID = "798606989978910720";
    const TWEET_URL = `http://www.twitter.com/freaktechnik/status/${TWEET_ID}`;

    t.is(TwitterAccount.getTweetIDFromURL(TWEET_URL), TWEET_ID);
});

test('get tweet id from url with https and www', (t) => {
    const TWEET_ID = "798606989978910720";
    const TWEET_URL = `https://www.twitter.com/freaktechnik/status/${TWEET_ID}`;

    t.is(TwitterAccount.getTweetIDFromURL(TWEET_URL), TWEET_ID);
});

test('don\'t get a tweet id from a non-tweet url', (t) => {
    t.is(TwitterAccount.getTweetIDFromURL('https://twitter.com/freaktechnik/status/824753300985769984/photo/1'), null);
    t.is(TwitterAccount.getTweetIDFromURL('https://twitter.com/freaktechnik/status/'), null);
    t.is(TwitterAccount.getTweetIDFromURL('https://example.com'), null);
    t.is(TwitterAccount.getTweetIDFromURL('foo bart'), null);
});

// getRemainingChars()
test.todo('remaining characters with a too long tweet');
test.todo('remaining characters for short text tweet');
test.todo('remaining characters with mention at start');
test.todo('remaining characters with link');

// tweetTooLong()
test.todo('tweet not too long just text');
test.todo('tweet too long with just text');
test.todo('tweet not too long with link');
test.todo('tweet too long with link');
test.todo('reply not too long');
test.todo('reply too long');
