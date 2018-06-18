import test from 'ava';
import SourceManager from '../../lib/sources/manager';
import { getRepo } from '../_stubs';
import Source from '../../lib/sources/source';

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
    const accountManager = 'ipsum';
    const manager = new SourceManager(config, repo, accountManager);

    t.is(manager.sources.size, 0);
    t.is(manager.sourceFactories.size, 0);
    t.is(manager.managedColumns.size, 0);

    t.deepEqual(manager._config, config);
    t.is(manager._repo, repo);
    t.is(manager._accountManager, accountManager);
});

test('constructor with config with empty sources', (t) => {
    const config = {
        sources: []
    };
    const manager = new SourceManager(config);

    t.is(manager.sources.size, 0);
});

test('get managed columns', async (t) => {
    const manager = new SourceManager({}, getRepo({
        test: 1,
        foo: 2,
        bar: 3
    }));
    manager.managedColumns.add('test');

    const managedColumns = await manager.getManagedColumns();

    t.is(managedColumns.length, 1);

    const managedColumnNames = managedColumns.map((c) => c.name);
    t.true(managedColumnNames.includes('test'));
});

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

test('check valid source config', (t) => {
    const manager = new SourceManager({});
    manager.sourceFactories.set('test', {
        requiredConfig: [
            'foo',
            'columns'
        ],
        requiredColumns: [
            'lorem'
        ]
    });

    t.true(manager.checkSourceConfig({
        type: 'test',
        columns: {
            lorem: 'Lorem'
        },
        foo: 'bar'
    }));
});

test('check invalid source config missing a column', (t) => {
    const manager = new SourceManager({});
    manager.sourceFactories.set('test', {
        requiredConfig: [
            'foo',
            'columns'
        ],
        requiredColumns: [
            'lorem'
        ]
    });

    t.false(manager.checkSourceConfig({
        type: 'test',
        columns: {},
        foo: 'bar'
    }));
});

test('check invalid source config missing a config key', (t) => {
    const manager = new SourceManager({});
    manager.sourceFactories.set('test', {
        requiredConfig: [
            'foo',
            'columns'
        ],
        requiredColumns: [
            'lorem'
        ]
    });

    t.false(manager.checkSourceConfig({
        type: 'test',
        columns: {
            lorem: 'Lorem'
        }
    }));
});

test('construction', async (t) => {
    const LocalSource = class extends Source {
        static get requiredColumns() {
            return [
                'target'
            ];
        }
        static get managedColumns() {
            return [
                'target'
            ];
        }
        constructor(...args) {
            super(...args);
            this.constructedWith = args;
        }
    };
    const LocalSourceManager = class extends SourceManager {
        getSourceFactory(type) {
            this.sourceType = type;
            return LocalSource;
        }
    };

    const repo = getRepo({
        'Target': 1
    });
    const source = {
        type: 'test',
        columns: {
            target: 'Target'
        }
    };
    const manager = new LocalSourceManager({
        sources: [
            source
        ]
    }, repo, 'bar');

    t.is(manager.sourceType, 'test');
    t.is(manager.sources.size, 1);

    const sourceInstance = Array.from(manager.sources.values())[0];

    t.is(sourceInstance.constructedWith.length, 4);
    t.is(sourceInstance.constructedWith[0], repo);
    t.is(sourceInstance.constructedWith[1], 'bar');
    t.deepEqual(sourceInstance.constructedWith[2], source);

    const managedColumnsSource = await sourceInstance.constructedWith[3]();
    const managedColumns = await manager.getManagedColumns();
    t.is(managedColumns.length, 1);
    t.is(managedColumns.length, managedColumnsSource.length);
    t.deepEqual(managedColumns, managedColumnsSource);
});

test('construction throwing for missing columns', (t) => {
    const LocalSource = class extends Source {
        static get requiredColumns() {
            return [
                'target'
            ];
        }
        constructor(...args) {
            super(...args);
            this.constructedWith = args;
        }
    };
    const LocalSourceManager = class extends SourceManager {
        getSourceFactory(type) {
            this.sourceType = type;
            return LocalSource;
        }
    };

    const repo = getRepo({
        'Target': 1
    });
    const source = {
        type: 'test',
        columns: {
        }
    };
    t.throws(() => new LocalSourceManager({
        sources: [
            source
        ]
    }, repo, 'bar'));
});

test('construction throwing for missing config keys', (t) => {
    const LocalSource = class extends Source {
        static get requiredColumns() {
            return [
                'target'
            ];
        }
        static get requiredConfig() {
            return Source.requiredConfig.concat([
                'foo'
            ]);
        }
        constructor(...args) {
            super(...args);
            this.constructedWith = args;
        }
    };
    const LocalSourceManager = class extends SourceManager {
        getSourceFactory(type) {
            this.sourceType = type;
            return LocalSource;
        }
    };

    const repo = getRepo({
        'Target': 1
    });
    const source = {
        type: 'test',
        columns: {
            target: 'Target'
        }
    };
    t.throws(() => new LocalSourceManager({
        sources: [
            source
        ]
    }, repo, 'bar'));
});

test('construction without managed columns', async (t) => {
    const LocalSource = class extends Source {
        static get requiredColumns() {
            return [
                'target'
            ];
        }
        constructor(...args) {
            super(...args);
            this.constructedWith = args;
        }
    };
    const LocalSourceManager = class extends SourceManager {
        getSourceFactory(type) {
            this.sourceType = type;
            return LocalSource;
        }
    };

    const repo = getRepo({
        'Target': 1
    });
    const source = {
        type: 'test',
        columns: {
            target: 'Target'
        }
    };
    const manager = new LocalSourceManager({
        sources: [
            source
        ]
    }, repo, 'bar');

    t.is(manager.sourceType, 'test');
    t.is(manager.sources.size, 1);

    const sourceInstance = Array.from(manager.sources.values())[0];

    t.is(sourceInstance.constructedWith.length, 4);
    t.is(sourceInstance.constructedWith[0], repo);
    t.is(sourceInstance.constructedWith[1], 'bar');
    t.deepEqual(sourceInstance.constructedWith[2], source);

    const managedColumnsSource = await sourceInstance.constructedWith[3]();
    const managedColumns = await manager.getManagedColumns();
    t.is(managedColumns.length, 0);
    t.is(managedColumns.length, managedColumnsSource.length);
    t.deepEqual(managedColumns, managedColumnsSource);
});

test('load squad source without valid config', (t) => {
    const repo = getRepo({
        'Foo': 1
    });
    const source = {
        type: 'squad',
        columns: {
            target: 'Foo'
        }
    };
    t.throws(() => new SourceManager({
        sources: [
            source
        ]
    }, repo, 'bar'));
});
