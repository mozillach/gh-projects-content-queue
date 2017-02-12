import test from 'ava';
import { validateConfig, loadConfig } from '../lib/config';
import tempWrite from 'temp-write';
import DEFAULT_CONFIG from '../config.default.json';
import path from 'path';

//TODO actually validate we get the correct exception.
const TEST_DATA = [
    {
        valid: true,
        config: [
            {
                repo: "foo/bar",
                githubToken: "loremIpsum",
                projectName: "Tweets",
                columns: {
                    ideas: "Backlog",
                    reactions: "Reaction needed",
                    events: "Event Backlog",
                    toTweet: "Ready",
                    tweeted: "Done"
                },
                labels: {
                    retweet: "RT",
                    ready: "valid",
                    invalid: "invalid"
                },
                twitter: {
                    access_token_key: "asdf",
                    access_token_secret: "asdf",
                    consumer_key: "asdf",
                    consumer_secret: "asdf"
                }
            },
            {
                repo: "foo/bar",
                githubToken: "loremIpsum",
                projectName: "baz",
                twitter: {
                    access_token_key: "asdf",
                    access_token_secret: "asdf",
                    consumer_key: "asdf",
                    consumer_secret: "asdf"
                }
            }
        ],
        name: "valid config"
    },
    {
        valid: true,
        config: [],
        name: "valid empty config"
    },
    {
        valid: false,
        config: {},
        name: "invalid object config"
    },
    {
        valid: false,
        config: "a string",
        name: "invalid string config"
    },
    {
        valid: false,
        config: false,
        name: "invalid boolean config"
    },
    {
        valid: false,
        config: 0,
        name: "invalid numerical config"
    },
    {
        valid: false,
        config: undefined,
        name: "invalid undefined config"
    },
    {
        valid: false,
        config: null,
        name: "invalid null config"
    },
    {
        valid: false,
        config: [
            "string, because why not"
        ],
        name: "invalid project config type"
    },
    {
        valid: false,
        config: [
            null
        ],
        name: "invalid project config type"
    },
    {
        valid: false,
        config: [
            {
                githubToken: "loremIpsum",
                projectName: "foo bar",
                twitter: {
                    access_token_key: "asdf",
                    access_token_secret: "asdf",
                    consumer_key: "asdf",
                    consumer_secret: "asdf"
                }
            }
        ],
        name: "invalid project without repo field"
    },
    {
        valid: false,
        config: [
            {
                repo: null,
                githubToken: "loremIpsum",
                projectName: "foo bar",
                twitter: {
                    access_token_key: "asdf",
                    access_token_secret: "asdf",
                    consumer_key: "asdf",
                    consumer_secret: "asdf"
                }
            }
        ],
        name: "invalid project with repo field of wrong type"
    },
    {
        valid: false,
        config: [
            {
                repo: "",
                githubToken: "loremIpsum",
                projectName: "foo bar",
                twitter: {
                    access_token_key: "asdf",
                    access_token_secret: "asdf",
                    consumer_key: "asdf",
                    consumer_secret: "asdf"
                }
            }
        ],
        name: "invalid project with empty repo name"
    },
    {
        valid: false,
        config: [
            {
                repo: "foo",
                githubToken: "loremIpsum",
                projectName: "foo bar",
                twitter: {
                    access_token_key: "asdf",
                    access_token_secret: "asdf",
                    consumer_key: "asdf",
                    consumer_secret: "asdf"
                }
            }
        ],
        name: "invalid repo name when not in format user/reponame"
    },
    {
        valid: false,
        config: [
            {
                repo: "foo/bar",
                projectName: "foo bar",
                twitter: {
                    access_token_key: "asdf",
                    access_token_secret: "asdf",
                    consumer_key: "asdf",
                    consumer_secret: "asdf"
                }
            }
        ],
        name: "invalid project without githubToken"
    },
    {
        valid: false,
        config: [
            {
                repo: "foo/bar",
                githubToken: null,
                projectName: "foo bar",
                twitter: {
                    access_token_key: "asdf",
                    access_token_secret: "asdf",
                    consumer_key: "asdf",
                    consumer_secret: "asdf"
                }
            }
        ],
        name: "invalid project with githubToken of wrong type"
    },
    {
        valid: false,
        config: [
            {
                repo: "foo/bar",
                githubToken: "",
                projectName: "foo bar",
                twitter: {
                    access_token_key: "asdf",
                    access_token_secret: "asdf",
                    consumer_key: "asdf",
                    consumer_secret: "asdf"
                }
            }
        ],
        name: "invalud project with empty githubToken"
    },
    {
        valid: false,
        config: [
            {
                repo: "foo/bar",
                githubToken: "loremIpsum",
                twitter: {
                    access_token_key: "asdf",
                    access_token_secret: "asdf",
                    consumer_key: "asdf",
                    consumer_secret: "asdf"
                }
            }
        ],
        name: "invalid project with no board name"
    },
    {
        valid: false,
        config: [
            {
                repo: "foo/bar",
                githubToken: "loremIpsum",
                projectName: null,
                twitter: {
                    access_token_key: "asdf",
                    access_token_secret: "asdf",
                    consumer_key: "asdf",
                    consumer_secret: "asdf"
                }
            }
        ],
        name: "inavlid project with board name of wrong type"
    },
    {
        valid: false,
        config: [
            {
                repo: "foo/bar",
                githubToken: "loremIpsum",
                projectName: "",
                twitter: {
                    access_token_key: "asdf",
                    access_token_secret: "asdf",
                    consumer_key: "asdf",
                    consumer_secret: "asdf"
                }
            }
        ],
        name: "invalid project with empty board name"
    },
    {
        valid: false,
        config: [
            {
                repo: "foo/bar",
                githubToken: "loremIpsum",
                projectName: "baz",
                columns: null,
                twitter: {
                    access_token_key: "asdf",
                    access_token_secret: "asdf",
                    consumer_key: "asdf",
                    consumer_secret: "asdf"
                }
            }
        ],
        name: "invalid project with null columns"
    },
    {
        valid: false,
        config: [
            {
                repo: "foo/bar",
                githubToken: "loremIpsum",
                projectName: "baz",
                columns: {
                    what: "no"
                },
                twitter: {
                    access_token_key: "asdf",
                    access_token_secret: "asdf",
                    consumer_key: "asdf",
                    consumer_secret: "asdf"
                }
            }
        ],
        name: "invalid project with unknown column"
    },
    {
        valid: false,
        config: [
            {
                repo: "foo/bar",
                githubToken: "loremIpsum",
                projectName: "baz",
                columns: {
                    events: null
                },
                twitter: {
                    access_token_key: "asdf",
                    access_token_secret: "asdf",
                    consumer_key: "asdf",
                    consumer_secret: "asdf"
                }
            }
        ],
        name: "invalid project with invalid readable column name"
    },
    {
        valid: false,
        config: [
            {
                repo: "foo/bar",
                githubToken: "loremIpsum",
                projectName: "baz",
                columns: {
                    events: ""
                },
                twitter: {
                    access_token_key: "asdf",
                    access_token_secret: "asdf",
                    consumer_key: "asdf",
                    consumer_secret: "asdf"
                }
            }
        ],
        name: "invalid project with empty readable column name"
    },
    {
        valid: false,
        config: [
            {
                repo: "foo/bar",
                githubToken: "loremIpsum",
                projectName: "baz",
                labels: null,
                twitter: {
                    access_token_key: "asdf",
                    access_token_secret: "asdf",
                    consumer_key: "asdf",
                    consumer_secret: "asdf"
                }
            }
        ],
        name: "invalid project with null labels"
    },
    {
        valid: false,
        config: [
            {
                repo: "foo/bar",
                githubToken: "loremIpsum",
                projectName: "baz",
                labels: {
                    what: "no"
                },
                twitter: {
                    access_token_key: "asdf",
                    access_token_secret: "asdf",
                    consumer_key: "asdf",
                    consumer_secret: "asdf"
                }
            }
        ],
        name: "inavlid project with unknown label"
    },
    {
        valid: false,
        config: [
            {
                repo: "foo/bar",
                githubToken: "loremIpsum",
                projectName: "baz",
                labels: {
                    retweet: null
                },
                twitter: {
                    access_token_key: "asdf",
                    access_token_secret: "asdf",
                    consumer_key: "asdf",
                    consumer_secret: "asdf"
                }
            }
        ],
        name: "inavlid project with lable with invalid name"
    },
    {
        valid: false,
        config: [
            {
                repo: "foo/bar",
                githubToken: "loremIpsum",
                projectName: "baz",
                labels: {
                    retweet: ""
                },
                twitter: {
                    access_token_key: "asdf",
                    access_token_secret: "asdf",
                    consumer_key: "asdf",
                    consumer_secret: "asdf"
                }
            }
        ],
        name: "inavlid project with lable with empty name"
    }
];

const testConfig = (t, data) => {
    if(data.valid) {
        t.notThrows(() => {
            const c = validateConfig(data.config);
            t.deepEqual(c, data.config);
        });
    }
    else {
        t.throws(() => validateConfig(data.config));
    }
};
testConfig.title = (providedTitle) => `Validating config that is ${providedTitle}`;

const testLoadConfig = async (t, data, i) => {
    const path = await tempWrite(JSON.stringify(data.config), `config${i}.json`);
    if(data.valid) {
        return t.notThrows(async () => {
            const config = await loadConfig(path);
            t.deepEqual(config, data.config);
        });
    }
    else {
        return t.throws(loadConfig(path));
    }
};
testLoadConfig.title = (providedTitle) => `Loading config that is ${providedTitle}`;

TEST_DATA.forEach((data, i) => {
    test(data.name, testConfig, data);
    test(data.name, testLoadConfig, data, i);
});

test('load default config', async (t) => {
    const readConfig = await loadConfig(path.join(__dirname, "../config.default.json"));
    t.deepEqual(readConfig, DEFAULT_CONFIG);
});

test('parse default config', (t) => {
    const c = validateConfig(DEFAULT_CONFIG);
    t.deepEqual(c, DEFAULT_CONFIG);
});
