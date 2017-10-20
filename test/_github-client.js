import sinon from 'sinon';

const getGithubClient = () => ({
    issues: {
        addLabels: sinon.stub(),
        removeLabel: sinon.stub(),
        createComment: sinon.stub(),
        edit: sinon.stub(),
        addAssigneesToIssue: sinon.stub()
    },
    hasNextPage: sinon.stub(),
    getNextPage: sinon.stub()
});

export default getGithubClient;
