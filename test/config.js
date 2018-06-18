import test from 'ava';
import { validateConfig, loadConfig } from '../lib/config';
import tempWrite from 'temp-write';
import DEFAULT_CONFIG from '../config.default.json';
import path from 'path';

//TODO actually validate we get the correct exception.
const TEST_DATA = [
    {
        valid: true,
        config: {
            accounts: {
                github: [
                    {
                        name: "gh",
                        token: "loremIpsum"
                    }
                ],
                twitter: [
                    {
                        name: "t",
                        access_token_key: "asdf",
                        access_token_secret: "asdf",
                        consumer_key: "asdf",
                        consumer_secret: "asdf"
                    }
                ]
            },
            boards: [
                {
                    repo: "foo/bar",
                    projectName: "Tweets",
                    githubAccount: "gh",
                    labels: {
                        retweet: "RT",
                        ready: "valid",
                        invalid: "invalid"
                    },
                },
                {
                    repo: "foo/bar",
                    projectName: "baz",
                    githubAccount: "gh"
                }
            ]
        },
        name: "valid config"
    },
    {
        valid: false,
        config: [],
        name: "invalid array config"
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
        config: {
            accounts: {
                github: [
                    {
                        name: "gh",
                        token: "loremIpsum"
                    }
                ],
                twitter: [
                    {
                        name: "t",
                        access_token_key: "asdf",
                        access_token_secret: "asdf",
                        consumer_key: "asdf",
                        consumer_secret: "asdf"
                    }
                ]
            },
            boards: [
                "string, because why not"
            ]
        },
        name: "invalid project config type"
    },
    {
        valid: false,
        config: {
            accounts: {
                github: [
                    {
                        name: "gh",
                        token: "loremIpsum"
                    }
                ],
                twitter: [
                    {
                        name: "t",
                        access_token_key: "asdf",
                        access_token_secret: "asdf",
                        consumer_key: "asdf",
                        consumer_secret: "asdf"
                    }
                ]
            },
            boards: [
                null
            ]
        },
        name: "invalid project config type"
    },
    {
        valid: false,
        config: {
            accounts: {
                github: [
                    {
                        name: "gh",
                        token: "loremIpsum"
                    }
                ],
                twitter: [
                    {
                        name: "t",
                        access_token_key: "asdf",
                        access_token_secret: "asdf",
                        consumer_key: "asdf",
                        consumer_secret: "asdf"
                    }
                ]
            },
            boards: [
                {
                    projectName: "foo bar",
                    githubAccount: "gh"
                }
            ]
        },
        name: "invalid project without repo field"
    },
    {
        valid: false,
        config: {
            accounts: {
                github: [
                    {
                        name: "gh",
                        token: "loremIpsum"
                    }
                ],
                twitter: [
                    {
                        name: "t",
                        access_token_key: "asdf",
                        access_token_secret: "asdf",
                        consumer_key: "asdf",
                        consumer_secret: "asdf"
                    }
                ]
            },
            boards: [
                {
                    repo: null,
                    projectName: "foo bar",
                    githubAccount: "gh"
                }
            ]
        },
        name: "invalid project with repo field of wrong type"
    },
    {
        valid: false,
        config: {
            accounts: {
                github: [
                    {
                        name: "gh",
                        token: "loremIpsum"
                    }
                ],
                twitter: [
                    {
                        name: "t",
                        access_token_key: "asdf",
                        access_token_secret: "asdf",
                        consumer_key: "asdf",
                        consumer_secret: "asdf"
                    }
                ]
            },
            boards: [
                {
                    repo: "",
                    projectName: "foo bar",
                    githubAccount: "gh"
                }
            ]
        },
        name: "invalid project with empty repo name"
    },
    {
        valid: false,
        config: {
            accounts: {
                github: [
                    {
                        name: "gh",
                        token: "loremIpsum"
                    }
                ],
                twitter: [
                    {
                        name: "t",
                        access_token_key: "asdf",
                        access_token_secret: "asdf",
                        consumer_key: "asdf",
                        consumer_secret: "asdf"
                    }
                ]
            },
            boards: [
                {
                    repo: "foo",
                    githubAccount: "gh",
                    projectName: "foo bar"
                }
            ]
        },
        name: "invalid repo name when not in format user/reponame"
    },
    {
        valid: false,
        config: {
            accounts: {
                github: [
                    {
                        name: "gh",
                        token: "loremIpsum"
                    }
                ],
                twitter: [
                    {
                        name: "t",
                        access_token_key: "asdf",
                        access_token_secret: "asdf",
                        consumer_key: "asdf",
                        consumer_secret: "asdf"
                    }
                ]
            },
            boards: [
                {
                    repo: "foo/bar",
                    projectName: "foo bar"
                }
            ]
        },
        name: "invalid project without githubAccount"
    },
    {
        valid: false,
        config: {
            accounts: {
                github: [
                    {
                        name: "gh",
                        token: "loremIpsum"
                    }
                ],
                twitter: [
                    {
                        name: "t",
                        access_token_key: "asdf",
                        access_token_secret: "asdf",
                        consumer_key: "asdf",
                        consumer_secret: "asdf"
                    }
                ]
            },
            boards: [
                {
                    repo: "foo/bar",
                    githubAccount: null,
                    projectName: "foo bar"
                }
            ]
        },
        name: "invalid project with githubAccount of wrong type"
    },
    {
        valid: false,
        config: {
            accounts: {
                github: [
                    {
                        name: "gh",
                        token: "loremIpsum"
                    }
                ],
                twitter: [
                    {
                        name: "t",
                        access_token_key: "asdf",
                        access_token_secret: "asdf",
                        consumer_key: "asdf",
                        consumer_secret: "asdf"
                    }
                ]
            },
            boards: [
                {
                    repo: "foo/bar",
                    githubToken: "",
                    projectName: "foo bar"
                }
            ]
        },
        name: "invalud project with empty githubAccount"
    },
    {
        valid: false,
        config: {
            accounts: {
                github: [
                    {
                        name: "gh",
                        token: "loremIpsum"
                    }
                ],
                twitter: [
                    {
                        name: "t",
                        access_token_key: "asdf",
                        access_token_secret: "asdf",
                        consumer_key: "asdf",
                        consumer_secret: "asdf"
                    }
                ]
            },
            boards: [
                {
                    repo: "foo/bar",
                    githubAccount: "gh"
                }
            ]
        },
        name: "invalid project with no board name"
    },
    {
        valid: false,
        config: {
            accounts: {
                github: [
                    {
                        name: "gh",
                        token: "loremIpsum"
                    }
                ],
                twitter: [
                    {
                        name: "t",
                        access_token_key: "asdf",
                        access_token_secret: "asdf",
                        consumer_key: "asdf",
                        consumer_secret: "asdf"
                    }
                ]
            },
            boards: [
                {
                    repo: "foo/bar",
                    githubAccount: "gh",
                    projectName: null
                }
            ]
        },
        name: "inavlid project with board name of wrong type"
    },
    {
        valid: false,
        config: {
            accounts: {
                github: [
                    {
                        name: "gh",
                        token: "loremIpsum"
                    }
                ],
                twitter: [
                    {
                        name: "t",
                        access_token_key: "asdf",
                        access_token_secret: "asdf",
                        consumer_key: "asdf",
                        consumer_secret: "asdf"
                    }
                ]
            },
            boards: [
                {
                    repo: "foo/bar",
                    githubAccount: "gh",
                    projectName: ""
                }
            ]
        },
        name: "invalid project with empty board name"
    },
    {
        valid: false,
        config: {
            accounts: {
                github: [
                    {
                        name: "gh",
                        token: "loremIpsum"
                    }
                ],
                twitter: [
                    {
                        name: "t",
                        access_token_key: "asdf",
                        access_token_secret: "asdf",
                        consumer_key: "asdf",
                        consumer_secret: "asdf"
                    }
                ]
            },
            boards: [
                {
                    repo: "foo/bar",
                    githubAccount: "gh",
                    projectName: "baz",
                    labels: null
                }
            ]
        },
        name: "invalid project with null labels"
    },
    {
        valid: false,
        config: {
            accounts: {
                github: [
                    {
                        name: "gh",
                        token: "loremIpsum"
                    }
                ],
                twitter: [
                    {
                        name: "t",
                        access_token_key: "asdf",
                        access_token_secret: "asdf",
                        consumer_key: "asdf",
                        consumer_secret: "asdf"
                    }
                ]
            },
            boards: [
                {
                    repo: "foo/bar",
                    githubAccount: "gh",
                    projectName: "baz",
                    labels: {
                        what: "no"
                    }
                }
            ]
        },
        name: "inavlid project with unknown label"
    },
    {
        valid: false,
        config: {
            accounts: {
                github: [
                    {
                        name: "gh",
                        token: "loremIpsum"
                    }
                ],
                twitter: [
                    {
                        name: "t",
                        access_token_key: "asdf",
                        access_token_secret: "asdf",
                        consumer_key: "asdf",
                        consumer_secret: "asdf"
                    }
                ]
            },
            boards: [
                {
                    repo: "foo/bar",
                    githubAccount: "gh",
                    projectName: "baz",
                    labels: {
                        retweet: null
                    }
                }
            ]
        },
        name: "inavlid project with lable with invalid name"
    },
    {
        valid: false,
        config: {
            accounts: {
                github: [
                    {
                        name: "gh",
                        token: "loremIpsum"
                    }
                ],
                twitter: [
                    {
                        name: "t",
                        access_token_key: "asdf",
                        access_token_secret: "asdf",
                        consumer_key: "asdf",
                        consumer_secret: "asdf"
                    }
                ]
            },
            boards: [
                {
                    repo: "foo/bar",
                    githubAccount: "gh",
                    projectName: "baz",
                    labels: {
                        retweet: ""
                    }
                }
            ]
        },
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

test.serial('load env config', async (t) => {
    process.env.CQ_CONFIG = JSON.stringify(DEFAULT_CONFIG);
    const c = await loadConfig();
    t.deepEqual(c, DEFAULT_CONFIG);
    delete process.env.CQ_CONFIG;
});

test('no env config to load', (t) => {
    return t.throws(loadConfig());
});

test.todo('prefers file over env');
