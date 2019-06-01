import sinon from 'sinon';
import config from '../config.default.json';
import DataStoreHolder from '../lib/data-store-holder';
import Octokit from '@octokit/rest'; //eslint-disable-line ava/no-import-test-files
import Source from '../lib/sources/source';
import TwitterAccount from '../lib/accounts/twitter';

const [ owner, repo ] = config.boards[0].repo.split("/");
config.boards[0].owner = owner;
config.boards[0].repo = repo;

const getGithubClient = () => {
    const inst = new Octokit();
    const responseQueue = [];
    inst.queueResponse = (resp) => {
        responseQueue.push(resp);
    };
    inst.options = [];
    inst.resetQueue = () => {
        responseQueue.length = 0;
    };
    inst.hook.wrap('request', async (r, options) => {
        inst.options.push(options);
        if(responseQueue.length) {
            const resp = responseQueue.shift();
            console.log(options.url, resp);
            return resp;
        }
        else {
            console.log(options.url, "MISS");
            return {
                headers: {}
            };
        }
    });
    return inst;
};

const getConfig = () => config.boards[0];

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
allCards.ready = Promise.resolve();
allCards.isReady = true;

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
    hasIssue: sinon.stub(),
    moveCard: sinon.stub()
});

const getColumns = (columns) => {
    const columnInstances = {};
    for(const columnName in columns) {
        columnInstances[columns[columnName]] = getColumn(columns[columnName], columnName);
    }
    return columnInstances;
};

const getIssue = (content = 'lorem ipsum', number = 1) => {
    const labels = new Set();
    return {
        number,
        id: 'foo',
        content,
        addLabel: sinon.spy((label) => labels.add(label)),
        hasLabel: sinon.spy((label) => labels.has(label)),
        removeLabel: sinon.spy((label) => labels.delete(label)),
        comment: sinon.stub(),
        assign: sinon.stub(),
        update(data) {
            if(data.content) {
                this.content = data.content;
            }
        }
    };
};

const getIssues = () => ({
    issues: Promise.resolve(new Map()),
    closedIssues: Promise.resolve(new Map()),
    config: getConfig(),
    githubClient: getGithubClient(),
    on: sinon.stub()
});

const getRepo = () => ({
    ready: Promise.resolve(),
    issues: getIssues(),
    config: getConfig(),
    githubClient: getGithubClient(),
    getUsersInTeam: sinon.stub()
});

const getBoard = (columns) => ({
    cards: allCards,
    ready: Promise.resolve(),
    columns: Promise.resolve(getColumns(columns)),
    columnIds: Promise.resolve(columns),
    config: getConfig(),
    githubClient: getGithubClient(),
    on: sinon.stub(),
    addCard: sinon.stub(),
    moveCardToColumn: sinon.stub(),
    repo: getRepo()
});

const getTwitterClient = () => ({
    get: sinon.stub(),
    post: sinon.stub()
});

const getTwitterAccount = (username, tweets = []) => {
    class StubAccount extends TwitterAccount {
        constructor() {
            const client = getTwitterClient();
            client.get.resolves({});
            super(getConfig(), client);
            this.username = username;
            this.getUsername = sinon.spy(() => Promise.resolve(username));
            this.retweet = sinon.stub();
            this.tweet = sinon.stub();
            this.uploadMedia = sinon.stub();
        }

        get tweets() {
            return Promise.resolve(tweets);
        }
    }
    //TODO should probably just use sinon magic stubbing?
    return new StubAccount();
};

const getCard = (issue = getIssue(), column = getColumn()) => ({
    issue,
    column,
    id: 'bar',
    updateContent: sinon.stub()
});

const getAccountManager = () => ({
    getAccount(type) {
        if(type == "twitter") {
            return getTwitterAccount('lorem');
        }
        else if(type == "github") {
            return getGithubClient();
        }
    },

    getContentAccounts() {
        return [
            this.getAccount("twitter")
        ];
    }
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
    getTwitterAccount,
    getCard,
    getAccountManager
};
