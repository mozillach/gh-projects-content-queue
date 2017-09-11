import sinon from 'sinon';

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
