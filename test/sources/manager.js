import test from 'ava';
import SourceManager from '../../lib/sources/manager';

test('invalid source names', (t) => {
    t.true(SourceManager.NOT_SOURCES.includes('manager'));
    t.true(SourceManager.NOT_SOURCES.includes('source'));
});

const testConfigs = [
    {
        required: [
            'foo',
            'bar'
        ],
        config: {
            foo: [],
            bar: 'baz'
        },
        missing: []
    },
    {
        required: [],
        config: {
            foo: [],
            bar: 'baz'
        },
        missing: []
    },
    {
        required: [
            'foo',
            'bar'
        ],
        config: {
            bar: 'baz'
        },
        missing: [
            'foo'
        ]
    }
];

const testCheckConfig = (t, data) => {
    t.is(SourceManager.checkConfigArray(data.required, data.config), data.missing.length === 0);
};

const testMissingConfig = (t, data) => {
    t.deepEqual(SourceManager.missingConfig(data.required, data.config), data.missing);
};

for(const data of testConfigs) {
    test('check config array', testCheckConfig, data);
    test('missing config', testMissingConfig, data);
}

test('construction with config without sources', (t) => {
    const config = {
        foo: 'bar'
    };
    const repo = 'lorem';
    const twitter = 'ipsum';
    const manager = new SourceManager(config, repo, twitter);

    t.is(manager.sources.size, 0);
    t.is(manager.sourceFactories.size, 0);
    t.is(manager.managedColumns.size, 0);

    t.deepEqual(manager._config, config);
    t.is(manager._repo, repo);
    t.is(manager._twitterAccount, twitter);
});

test('constructor with config with empty sources', (t) => {
    const config = {
        sources: []
    };
    const manager = new SourceManager(config);

    t.is(manager.sources.size, 0);
});

//TODO: repo stubs
test.todo('get managed columns');

test('get source factory', (t) => {
    const manager = new SourceManager({});

    const factory = 'foo';
    manager.sourceFactories.set(factory, factory);

    t.is(manager.getSourceFactory(factory), factory);
});

test('can not get invalid source factories', (t) => {
    const manager = new SourceManager({});

    t.throws(() => manager.getSourceFactory('manager'));
    t.throws(() => manager.getSourceFactory('source'));
});

// Also needs pre-loading or some similar hack.
test.todo('check source config');

// Pre-load sourceFactory that is used in construction
test.serial.todo('construction');
