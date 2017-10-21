import sinon from 'sinon';

const getGithubClient = () => ({
    issues: {
        addLabels: sinon.stub(),
        removeLabel: sinon.stub(),
        createComment: sinon.stub(),
        edit: sinon.stub(),
        addAssigneesToIssue: sinon.stub(),
        getForRepo: sinon.stub(),
        create: sinon.stub()
    },
    projects: {
        moveProjectColumn: sinon.stub(),
        getProjectCards: sinon.stub(),
        createProjectColumn: sinon.stub(),
        createProjectCard: sinon.stub(),
        deleteProjectCard: sinon.stub(),
        moveProjectCard: sinon.stub()
    },
    hasNextPage: sinon.stub(),
    getNextPage: sinon.stub()
});

export default getGithubClient;
