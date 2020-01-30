import test from 'ava';
import { NoProjectsError, ProjectNotFoundError } from '../lib/board-errors';

test('no projects error', (t) => {
    t.throws(() => {
        throw new NoProjectsError('foo');
    }, {
        instanceOf: Error
    });
});

test('project not found error', (t) => {
    t.throws(() => {
        throw new ProjectNotFoundError('foo', 'bar');
    }, {
        instanceOf: Error
    });
});
