import test from 'ava';
import TwitterAccount from '../lib/twitter-account';

// getTweetIDFromURL()
test.todo('get tweet id from url with http');
test('get tweet id from url with https', (t) => {
    const TWEET_ID = "798606989978910720";
    const TWEET_URL = `https://twitter.com/freaktechnik/status/${TWEET_ID}`;

    t.is(TwitterAccount.getTweetIDFromURL(TWEET_URL), TWEET_ID);
});
test.todo('get tweet id from url with http and www');
test.todo('get tweet id from url with https and www');
test.todo('don\'t get a tweet id from a non-tweet url');

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
