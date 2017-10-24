import sinon from 'sinon';
import config from '../config.default.json';
import DataStoreHolder from '../lib/data-store-holder';
import getGithubClient from 'github-stub';
import Source from '../lib/sources/source';

const [ owner, repo ] = config[0].repo.split("/");
config[0].owner = owner;
config[0].repo = repo;

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
    id: "0",
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

const getSource = () => new Source();

const allCards = new Map();

const getColumn = (id, name) => ({
    id: `${id}`,
    name,
    allCards,
    issues: {},
    cards: new Set(),
    config: getConfig(),
    githubClient: getGithubClient(),
    addCard: sinon.stub(),
    removeCard: sinon.stub(),
    hasIssue: sinon.stub()
});

const getColumns = (columns) => {
    const columnInstances = {};
    for(const columnName in columns) {
        columnInstances[columns[columnName]] = getColumn(columns[columnName], columnName);
    }
    return columnInstances;
};

const getBoard = (columns) => ({
    cards: allCards,
    ready: Promise.resolve(),
    columns: Promise.resolve(getColumns(columns)),
    columnIds: Promise.resolve(columns),
    config: getConfig(),
    githubClient: getGithubClient(),
    cardTweeted: sinon.stub(),
    on: sinon.stub(),
    addCard: sinon.stub()
});

const getIssue = (content = 'lorem ipsum') => {
    const labels = new Set();
    return {
        content,
        addLabel: sinon.spy((label) => labels.add(label)),
        hasLabel: sinon.spy((label) => labels.has(label)),
        removeLabel: sinon.spy((label) => labels.delete(label)),
        comment: sinon.stub(),
        assign: sinon.stub()
    };
};

const getIssues = () => ({
    firstRun: false,
    ready: Promise.resolve(),
    issues: Promise.resolve(new Map()),
    closedIssues: Promise.resolve(new Map()),
    config: getConfig(),
    githubClient: getGithubClient(),
    on: sinon.stub()
});

const getRepo = (columns) => ({
    ready: Promise.resolve(),
    board: getBoard(columns),
    issues: getIssues(),
    config: getConfig(),
    githubClient: getGithubClient()
});

const getTwitterClient = () => ({
    get: sinon.stub(),
    post: sinon.stub()
});

const getTwitterAccount = (username, tweets = []) => ({
    username,
    getUsername: sinon.spy(() => Promise.resolve(username)),
    tweets: Promise.resolve(tweets),
    retweet: sinon.stub(),
    tweet: sinon.stub(),
    uploadMedia: sinon.stub()
});

export {
    getConfig,
    getDataStoreHolder,
    getGithubClient,
    getIssueData,
    getSource,
    getColumn,
    getBoard,
    getIssue,
    getIssues,
    getRepo,
    getTwitterClient,
    getTwitterAccount
};
