import test from 'ava';
import IssuesSource from '../../lib/sources/issues';
import { getRepo, getTwitterAccount } from '../_stubs';
import sinon from 'sinon';

const getArgs = () => {
    const managedColumns = sinon.stub();
    managedColumns.resolves([]);
    return [
        getRepo({
            'Foo': '1'
        }),
        getTwitterAccount(),
        {
            columns: {
                target: 'Foo'
            }
        },
        managedColumns
    ];
};

test('columns', (t) => {
    t.is(IssuesSource.requiredColumns.length, 1);
    t.true(IssuesSource.requiredColumns.includes('target'));
});

test('construction', (t) => {
    const args = getArgs();

    new IssuesSource(...args);

    t.true(args[0].issues.on.called);
});

test('handle card in no column', async (t) => {
    const source = new IssuesSource(...getArgs());
    const column = await source.handleCard({
        number: 1
    });
    t.is(column, null);
});

test('handle card in column', async (t) => {
    const source = new IssuesSource(...getArgs());
    const targetColumn = (await source._repo.board.columns)['1'];
    targetColumn.hasIssue.returns(true);
    const column = await source.handleCard({
        number: 1
    });
    t.is(column, targetColumn);
});

test.todo('handle card does not return managed column');

test('add issue already in column', async (t) => {
    const source = new IssuesSource(...getArgs());
    const targetColumn = (await source._repo.board.columns)['1'];
    targetColumn.hasIssue.returns(true);
    source._repo.board.addCard.resolves('card');

    const card = await source.addIssue({
        number: 1
    }, 'foo');

    t.is(card, 'card');
    t.true(source._repo.board.addCard.calledWith(sinon.match({
        number: 1
    }), targetColumn, 'foo'));
});

test('add new issue', async (t) => {
    const source = new IssuesSource(...getArgs());
    const targetColumn = (await source._repo.board.columns)['1'];
    targetColumn.hasIssue.returns(false);
    source._repo.board.addCard.resolves('card');

    const card = await source.addIssue({
        number: 1
    }, false, false);

    t.is(card, 'card');
    t.true(source._repo.board.addCard.calledWith(sinon.match({
        number: 1
    }), targetColumn));
});

test('does not add new closed issue', async (t) => {
    const source = new IssuesSource(...getArgs());
    const targetColumn = (await source._repo.board.columns)['1'];
    targetColumn.hasIssue.returns(false);
    source._repo.board.addCard.resolves('card');

    await source.addIssue({
        number: 1
    }, false, true);

    t.false(source._repo.board.addCard.called);
});
