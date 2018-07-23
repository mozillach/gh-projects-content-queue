"use strinct";
const path = require("path");
const fs = require("fs");
const oldConfig = require("../config.json");
const newConfig = {
    accounts: {
        github: [],
        twitter: [],
        discourse: []
    },
    boards: [

    ]
};

const addAccount = (board, type, otherConfig) => {
    const otherConfigKeys = Object.keys(otherConfig);
    for(const account of newConfig.accounts[type]) {
        if(otherConfigKeys.every((k) => account[k] == otherConfig[k])) {
            return account.name;
        }
    }
    const newName = makeAccountName(type, board.repo, board.projectName);
    newConfig.accounts[type].push(Object.assign({
        name: newName
    }, otherConfig));
    return newName;
}

const makeAccountName = (type, repo, projectName) => {
    const [ user, repoName ] = repo.split("/");
    if(!newConfig.accounts[type].hasOwnProperty(user)) {
        return user;
    }
    if(!newConfig.accounts[type].hasOwnProperty(repo)) {
        return repo;
    }
    const name = repo + projectName;
    if(!newConfig.accounts[type].hasOwnProperty(name)) {
        return name;
    }
    let i = 1;
    while(newConfig.accounts[type].hasOwnProperty(name + i)) {
        ++i;
    }
    return name + i;
};

for(const board of oldConfig) {
    const githubName = addAccount(board, 'github', {
        token: board.githubToken
    });
    const twitterName = addAccount(board, 'twitter', board.twitter);
    const newBoard = {
        repo: board.repo,
        projectName: board.projectName,
        githubAccount: githubName,
        labels: board.labels,
        schedulingTime: board.schedulingTime,
        sources: board.sources.map((s) => {
            switch(s.type) {
                case 'mentions':
                    s.twitterAccount = twitterName;
                    return s;
                case 'tweeting': {
                    return {
                        columns: s.columns,
                        type: 'publish',
                        accountType: 'twitter',
                        accountName: twitterName
                    };
                }
                case 'discourse': {
                    const discourseName = addAccount(board, 'discourse', {
                        forum: s.forum,
                        key: s.apiKey,
                        url: s.apiUrl,
                        username: s.username
                    });
                    return {
                        columns: s.columns,
                        type: s.type,
                        discourseAccount: discourseName
                    };
                }
                case 'events':
                    return {
                        columns: s.columns,
                        type: s.type,
                        url: `https://reps.mozilla.org/events/period/future/search/${encodeURIComponent(s.query)}/ical/`
                    };
                default:
                    return s;
            }
        })
    };
    newConfig.boards.push(newBoard);
}
fs.writeFile(path.join(__dirname, "../config.json"), JSON.stringify(newConfig, null, 2));
