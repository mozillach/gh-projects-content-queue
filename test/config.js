import test from 'ava';
import { validateConfig } from '../lib/config';

//TODO actually validate we get the correct exception.
const TEST_DATA = [
    {
        valid: true,
        config: [
            {
                repo: "foo/bar",
                githubToken: "loremIpsum",
                projectName: "Tweets",
                columns: {}
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
            {}
        ],
        name: "invalid project without repo field"
    },
    {
        valid: false,
        config: [
            {
                repo: null
            }
        ],
        name: "invalid project with repo field of wrong type"
    },
    {
        valid: false,
        config: [
            {
                repo: ""
            }
        ],
        name: "invalid project with empty repo name"
    },
    {
        valid: false,
        config: [
            {
                repo: "foo"
            }
        ],
        name: "invalid repo name when not in format user/reponame"
    },
    {
        valid: false,
        config: [
            {
                repo: "foo/bar"
            }
        ],
        name: "invalid project without githubToken"
    },
    {
        valid: false,
        config: [
            {
                repo: "foo/bar",
                githubToken: null
            }
        ],
        name: "invalid project with githubToken of wrong type"
    },
    {
        valid: false,
        config: [
            {
                repo: "foo/bar",
                githubToken: ""
            }
        ],
        name: "invalud project with empty githubToken"
    },
    {
        valid: false,
        config: [
            {
                repo: "foo/bar",
                githubToken: "loremIpsum"
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
                projectName: null
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
                projectName: ""
            }
        ],
        name: "invalid project with empty board name"
    }
];

const testConfig = (t, data) => {
    if(data.valid) {
        t.notThrows(() => validateConfig(data.config));
    }
    else {
        t.throws(() => validateConfig(data.config));
    }
};

TEST_DATA.forEach((data) => {
    test(data.name, testConfig, data);
});

test.todo("loadConfig can read files and validates them");
