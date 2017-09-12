import test from 'ava';
import RotatingList from '../lib/rotating-list';

test('constructor with default args', (t) => {
    const list = new RotatingList();
    t.is(list.size, 0);
});

test('constructor with iterable', (t) => {
    const arg = [ 0, 1, 2 ];
    const list = new RotatingList(arg);
    t.is(list.size, arg.length);
});

test('get', (t) => {
    const arg = [ 0, 1, 2 ];
    const list = new RotatingList(arg);
    t.is(list.get(0), arg[0]);
    t.is(list.get(1), arg[1]);
    t.is(list.get(2), arg[2]);
});

test('add', (t) => {
    const arg = [ 0, 1, 2 ];
    const list = new RotatingList(arg);
    list.add(arg.length);
    t.is(list.get(arg.length), arg.length);
    t.is(list.size, arg.length + 1);
});

test('getNext', (t) => {
    const arg = [ 0, 1, 2 ];
    const list = new RotatingList(arg);
    for(let i = 0; i < arg.length; ++i) {
        t.is(list.getNext(), i);
    }
    for(let i = 0; i < arg.length; ++i) {
        t.is(list.getNext(), i, 'Second iteration starts at the beginning');
    }
});

test('delete', (t) => {
    const arg = [ 0, 1, 2 ];
    const list = new RotatingList(arg);
    list.delete(1);
    t.is(list.size, 2);
    t.is(list.get(1), 2);
});

test('clear', (t) => {
    const arg = [ 0, 1, 2 ];
    const list = new RotatingList(arg);
    list.clear();
    t.is(list.size, 0);
});

test.todo('No item is skipped when removing an item');
