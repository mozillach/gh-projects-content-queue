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
const getTweet = (length) => {
    const content = new Array(length);
    return content.fill('a').join("");
};
test('remaining characters with a too long tweet', (t) => {
    t.is(TwitterAccount.getRemainingChars(getTweet(144)), -4);
});

test('remaining characters for short text tweet', (t) => {
    t.is(TwitterAccount.getRemainingChars(getTweet(23)), 117);
});

test('remaining characters with mention at start', (t) => {
    t.is(TwitterAccount.getRemainingChars(`@mention ${getTweet(23)}`), 108);
});

test('remaining characters with link', (t) => {
    t.is(TwitterAccount.getRemainingChars(`${getTweet(23)} https://example.com`), 93);
});

// tweetTooLong()
test('tweet not too long just text', (t) => {
    t.false(TwitterAccount.tweetTooLong(getTweet(139)));
});

test('140 chars fit into a tweet', (t) => {
    t.false(TwitterAccount.tweetTooLong(getTweet(140)));
})

test('tweet too long with just text', (t) => {
    t.true(TwitterAccount.tweetTooLong(getTweet(144)));
});

test('tweet not too long with link', (t) => {
    t.false(TwitterAccount.tweetTooLong(`${getTweet(116)} https://example.com`));
});

test('tweet too long with link', (t) => {
    t.true(TwitterAccount.tweetTooLong(`${getTweet(140)} https://example.com`));
});

test('reply not too long', (t) => {
    t.false(TwitterAccount.tweetTooLong(`@user ${getTweet(133)}`));
});

test('reply too long', (t) => {
    t.true(TwitterAccount.tweetTooLong(`@user ${getTweet(135)}`));
});

test('get media and content', (t) => {
    const text = 'Lorem ipsum dolor sit amet';
    const mediaURL = "https://example.com/image.png";
    const content = `${text}
![](${mediaURL})`;

    const [ pureTweet, media ] = TwitterAccount.getMediaAndContent(content);

    t.is(pureTweet, text);
    t.is(media.length, 1);
    t.is(media[0], mediaURL);
});

test('get media and content with alt text', (t) => {
    const text = 'Lorem ipsum dolor sit amet';
    const mediaURL = "https://example.com/image.png";
    const content = `${text}
![foo bar](${mediaURL})`;

    const [ pureTweet, media ] = TwitterAccount.getMediaAndContent(content);

    t.is(pureTweet, text);
    t.is(media.length, 1);
    t.is(media[0], mediaURL);
});

test('get content with no media', (t) => {
    const text = "Lorem ipsum dolor sit amet [test](link that isn't one)";

    const [ pureTweet, media ] = TwitterAccount.getMediaAndContent(text);

    t.is(pureTweet, text);
    t.is(media.length, 0);
});

test('too much media throws', (t) => {
    const content = `Lorem ipsum
![test](https://example.com/image1.png)
![](https://example.com/image2.png)
![](https://example.com/image3.png)
![](https://example.com/image4.png)
![foo](https://example.com/image-too-much.png)`;

    t.throws(() => TwitterAccount.getMediaAndContent(content), Error);
    t.throws(() => TwitterAccount.tweetTooLong(content), Error);
    t.throws(() => TwitterAccount.getRemainingChars(content), Error);
});
