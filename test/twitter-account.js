import test from 'ava';
import TwitterAccount from '../lib/twitter-account';
import { getTwitterClient } from './_stubs';
import UpdateManager from '../lib/update-manager';
import sinon from 'sinon';

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
});

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

test('construction', (t) => {
    const client = getTwitterClient();
    client.get.resolves({});
    const account = new TwitterAccount(client);

    t.is(account._twitterClient, client);
    t.true("then" in account.ready);
    t.true("lastMention" in account);
    t.true("tweets" in account);
});

test('construction ready rejected', (t) => {
    const client = getTwitterClient();
    client.get.rejects(new Error());
    const account = new TwitterAccount(client);

    return t.throws(account.ready, Error);
});

test.todo('uploadMedia');

test('tweet', async (t) => {
    const client = getTwitterClient();
    client.get.resolves({
        screen_name: 'test'
    });
    const account = new TwitterAccount(client);
    const tweet = 'lorem ipsum';

    client.post.resolves({
        id_str: 'foo'
    });

    const url = await account.tweet(tweet);

    t.true(client.post.calledOnce);
    t.true(client.post.calledWith('statuses/update', {
        status: tweet
    }));
    t.is(url, 'https://twitter.com/test/status/foo');
});

test('too long tweet', (t) => {
    const client = getTwitterClient();
    client.get.resolves({
        screen_name: 'test'
    });
    const account = new TwitterAccount(client);
    const tweet = getTweet(144);

    client.post.resolves({
        id_str: 'foo'
    });

    return t.throws(account.tweet(tweet));
});

test('tweet with media', async (t) => {
    const client = getTwitterClient();
    client.get.resolves({
        screen_name: 'test'
    });
    const account = new TwitterAccount(client);
    const tweet = 'lorem ipsum';
    const media = 'foo bar';

    client.post.resolves({
        id_str: 'foo'
    });

    const url = await account.tweet(tweet, media);

    t.true(client.post.calledOnce);
    t.true(client.post.calledWith('statuses/update', {
        status: tweet,
        media_ids: media
    }));
    t.is(url, 'https://twitter.com/test/status/foo');
});

test("tweet reply that can't be replied to", async (t) => {
    const client = getTwitterClient();
    client.get.resolves({
        screen_name: 'test'
    });
    const account = new TwitterAccount(client);
    const tweet = 'lorem ipsum';
    const reply = 'foo bar';

    client.post.resolves({
        id_str: 'foo'
    });

    const url = await account.tweet(tweet, '', reply);

    t.true(client.post.calledOnce);
    t.true(client.post.calledWith('statuses/update', {
        status: tweet
    }));
    t.is(url, 'https://twitter.com/test/status/foo');
});

test("tweet reply", async (t) => {
    const client = getTwitterClient();
    client.get.resolves({
        screen_name: 'test'
    });
    const account = new TwitterAccount(client);
    const tweet = 'lorem ipsum';
    const reply = 'https://twitter.com/baz/status/1234';

    client.post.resolves({
        id_str: 'foo'
    });

    const url = await account.tweet(tweet, '', reply);

    t.true(client.post.calledOnce);
    t.true(client.post.calledWith('statuses/update', {
        status: tweet,
        in_reply_to_status_id: '1234'
    }));
    t.is(url, 'https://twitter.com/test/status/foo');
});

test('retweet', async (t) => {
    const client = getTwitterClient();
    client.get.resolves({});
    const account = new TwitterAccount(client);
    const retweet = 'https://twitter.com/baz/status/1234';

    client.post.resolves({});

    const url = await account.retweet(retweet);

    t.is(url, retweet);
    t.true(client.post.calledOnce);
    t.true(client.post.calledWith('statuses/retweet/1234'));
});

test('check login', async (t) => {
    const client = getTwitterClient();
    client.get.resolves({
        screen_name: 'test',
        id_str: '1234'
    });
    const account = new TwitterAccount(client);

    client.get.resetHistory();

    await account.checkLogin();

    t.is(account.username, 'test');
    t.is(account.id, '1234');
    t.true(client.get.calledOnce);
});

test('get username', async (t) => {
    const client = getTwitterClient();
    client.get.resolves({
        screen_name: 'test'
    });
    const account = new TwitterAccount(client);

    const username = await account.getUsername();

    t.is(username, account.username);
    t.is(username, 'test');
});

test('get ID', async (t) => {
    const client = getTwitterClient();
    client.get.resolves({
        screen_name: 'test',
        id_str: '1234'
    });
    const account = new TwitterAccount(client);

    const id = await account.getID();

    t.is(id, account.id);
    t.is(id, '1234');
});

test('tweets', async (t) => {
    const client = getTwitterClient();
    client.get.resolves({
        id_str: '1234'
    });
    const account = new TwitterAccount(client);

    const tweets = [
        'tweet1',
        'tweet2',
        'tweet3'
    ];

    client.get.reset();
    client.get.resolves(tweets);

    const allTweets = await account.tweets;

    t.deepEqual(allTweets, tweets);
    t.true(client.get.calledOnce);
    t.true(client.get.calledWith('statuses/user_timeline', sinon.match({
        user_id: '1234'
    })));
});

test.serial('tweets with existing tweets stored', async (t) => {
    const client = getTwitterClient();
    client.get.resolves({
        id_str: '1234'
    });
    const account = new TwitterAccount(client);

    const tweets = [
        {
            id_str: 'foo'
        },
        {
            id_str: 'bar'
        }
    ];

    client.get.reset();
    client.get.resolves(tweets);

    await account.tweets;

    const newerTweets = [
        {
            id_str: 'baz'
        }
    ];
    client.get.resolves(newerTweets);
    clock.tick(UpdateManager.UPDATE_INTERVAL + 1);

    // Update manager updates the data store.

    const allTweets = await account.tweets;

    t.deepEqual(allTweets, newerTweets.concat(tweets));
    t.true(client.get.calledThrice);
    t.true(client.get.calledWith('statuses/user_timeline', sinon.match({
        user_id: '1234',
        since_id: 'foo'
    })));
});

test('tweets without any results', async (t) => {
    const client = getTwitterClient();
    client.get.resolves({
        id_str: '1234'
    });
    const account = new TwitterAccount(client);

    const tweets = [];

    client.get.reset();
    client.get.resolves(tweets);

    const allTweets = await account.tweets;

    t.deepEqual(allTweets, tweets);
    t.is(allTweets.length, 0);
    t.true(client.get.calledOnce);
    t.true(client.get.calledWith('statuses/user_timeline', sinon.match({
        user_id: '1234'
    })));
});

test('last mention', async (t) => {
    const client = getTwitterClient();
    client.get.resolves({
        id_str: '1234'
    });
    const account = new TwitterAccount(client);

    const tweets = [];
    client.get.resolves(tweets);

    await account.tweets;

    client.get.reset();
    client.get.resolves([
        {
            in_reply_to_status_id_str: 'asdf',
            id_str: '1234'
        },
        {
            in_reply_to_status_id_str: 'qwer',
            id_str: '5678'
        }
    ]);

    const lastMention = await account.lastMention;

    t.is(lastMention, '1234');
    t.true(client.get.calledWith('statuses/mentions_timeline', {
        count: 200
    }));
});

test('last mention second run', async (t) => {
    const client = getTwitterClient();
    client.get.resolves({
        id_str: '1234'
    });
    const account = new TwitterAccount(client);

    const tweets = [];
    client.get.resolves(tweets);

    await account.tweets;

    client.get.resolves([
        {
            in_reply_to_status_id_str: 'asdf',
            id_str: '1234'
        },
        {
            in_reply_to_status_id_str: 'qwer',
            id_str: '5678'
        }
    ]);

    await account.lastMention;

    client.get.reset();
    client.get.resolves([]);
    clock.tick(UpdateManager.UPDATE_INTERVAL + 1);

    const lastMention = await account.lastMention;

    t.is(lastMention, '1234');
    t.true(client.get.calledWith('statuses/mentions_timeline', {
        count: 200,
        since_id: lastMention
    }));
});

test.todo('last mention event');
test.todo('last mention already replied to');
