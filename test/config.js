import test from 'ava';
import { validateConfig } from '../lib/config';

const TEST_DATA = [
    {
        valid: true,
        config: [
            {},
            {}
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
