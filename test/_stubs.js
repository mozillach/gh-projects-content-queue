import sinon from 'sinon';

const getIssue = (content = 'lorem ipsum') => ({
    content,
    addLabel: sinon.spy(),
    hasLabel: sinon.stub(),
    removeLabel: sinon.spy(),
    comment: sinon.spy()
});

const getConfig = () => ({
    schedulingTime: {
        format: "DD.MM.YYYY HH:mm",
        timezone: 0
    },
    labels: {
        retweet: 'retweet',
        ready: 'ready',
        invalid: 'invalid'
    }
});

export {
    getIssue,
    getConfig
};
