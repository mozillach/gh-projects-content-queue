import test from 'ava';
import UpdateManager from '../lib/update-manager';
import sinon from 'sinon';
import { getDataStoreHolder } from './_stubs';

test.serial.beforeEach((t) => {
    t.context.clock = sinon.useFakeTimers();
});

test.serial.afterEach((t) => {
    t.context.clock.restore();
});

test('UpdateManager is an object', (t) => {
    t.is(typeof UpdateManager, 'object');
});

test.serial('setInterval starts interval', (t) => {
    t.is(UpdateManager.interval, undefined);

    UpdateManager.setInterval();

    t.not(UpdateManager.interval, undefined);

    clearInterval(UpdateManager.interval);
    UpdateManager.interval = undefined;
});

test.serial("setInterval doesn't replace existing interval", (t) => {
    UpdateManager.setInterval();

    t.not(UpdateManager.interval, undefined);
    const startInterval = UpdateManager.interval;

    UpdateManager.setInterval();

    t.is(UpdateManager.interval, startInterval);

    clearInterval(UpdateManager.interval);
    UpdateManager.interval = undefined;
});

test.serial("register adds data store holder to the update manager", (t) => {
    const dsh = getDataStoreHolder();

    t.is(UpdateManager.targets.size, 0);
    t.is(UpdateManager.interval, undefined);

    UpdateManager.register(dsh);

    t.not(UpdateManager.interval, undefined);
    t.is(UpdateManager.targets.size, 1);
    t.true(UpdateManager.targets.has(dsh));

    UpdateManager.targets.clear();
    clearInterval(UpdateManager.interval);
    UpdateManager.interval = undefined;
});

test.serial("register accepts data-store-holder-likes", (t) => {
    const dsh = {
        update: sinon.spy()
    };

    UpdateManager.register(dsh);

    t.not(UpdateManager.interval, undefined);
    t.is(UpdateManager.targets.size, 1);
    t.true(UpdateManager.targets.has(dsh));

    UpdateManager.targets.clear();
    clearInterval(UpdateManager.interval);
    UpdateManager.interval = undefined;
});

test.serial("register doesn't accept non-data-store-holders", (t) => {
    const notDsh = {};

    t.throws(() => UpdateManager.register(notDsh), {
        instanceOf: TypeError
    });
});

test.serial("update calls update on all data store holders", async (t) => {
    const dsh = getDataStoreHolder();
    UpdateManager.register(dsh);

    t.false(dsh.updateSpy.called);

    await UpdateManager.update();

    t.true(dsh.updateSpy.calledOnce);

    UpdateManager.targets.clear();
    clearInterval(UpdateManager.interval);
    UpdateManager.interval = undefined;
});

test.serial("update gracefully handles rejections in data store updates", async (t) => {
    const dsh = getDataStoreHolder(),
        dsh2 = getDataStoreHolder();
    UpdateManager.register(dsh);
    UpdateManager.register(dsh2);

    dsh.updateSpy.throws(new Error('no update'));

    await t.notThrowsAsync(UpdateManager.update());

    t.true(dsh.updateSpy.calledOnce);
    t.true(dsh2.updateSpy.calledOnce);

    UpdateManager.targets.clear();
    clearInterval(UpdateManager.interval);
    UpdateManager.interval = undefined;
});

test.serial("interval calls update on all data stores", (t) => {
    const dsh = getDataStoreHolder();
    UpdateManager.register(dsh);

    t.context.clock.next();

    t.true(dsh.updateSpy.calledOnce);

    UpdateManager.targets.clear();
    clearInterval(UpdateManager.interval);
    UpdateManager.interval = undefined;
});
