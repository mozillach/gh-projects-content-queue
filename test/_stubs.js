import sinon from 'sinon';
import config from '../config.default.json';
import DataStoreHolder from '../lib/data-store-holder';
import getGithubClient from './_github-client';

const getIssue = (content = 'lorem ipsum') => {
    //TODO should use an actual issue instance instead with a no-op github client.
    const labels = new Set();
    return {
        content,
        addLabel: sinon.spy((label) => labels.add(label)),
        hasLabel: sinon.spy((label) => labels.has(label)),
        removeLabel: sinon.spy((label) => labels.delete(label)),
        comment: sinon.spy()
    };
};

const getConfig = () => config[0];

const getDataStoreHolder = () => {
    const Dsh = class extends DataStoreHolder {
        constructor() {
            super();
            this.updateSpy = sinon.stub();
        }
        async update() {
            this.updateSpy();
            return super.update();
        }
    };
    return new Dsh();
};

const getIssueData = () => ({
    id: 0,
    number: 1,
    owner: "test",
    repo: "foo",
    content: 'lorem ipsum',
    updated_at: new Date().toString(),
    assignee: null,
    labels: [],
    title: 'bar',
    state: true
});

export {
    getIssue,
    getConfig,
    getDataStoreHolder,
    getGithubClient,
    getIssueData
};
