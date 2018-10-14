/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

const path = require("path");

const { loadConfig } = require("./lib/config");
const ContentQueue = require("./lib/content-queue");
const AccountManager = require("./lib/accounts/manager");

const repositories = new Map();

const makeAccountList = async (accountManager, boards, project) => {
    // This gets all boards on the same repo in this instance, regardless of account it uses.
    const boardsWithRepo = boards.filter((board) => {
        if(board.hasOwnProperty('owner')) {
            return board.owner + "/" + board.repo === project.repo;
        }
        return board.repo === project.repo;
    });
    //TODO this currently completely ignores account types, even though names are only unique per type.
    const accountsInBoards = new Set([].concat(...boards.map((b) => b.sources.filter((s) => s.type === 'publish').map((s) => s.accountName))));
    const accounts = this.accountManager.getContentAccounts(accountsInBoards);
    const links = await Promise.all(accounts.map((a) => a.getAccountLink().then((link) => `${link} on ${a.constructor.TYPE}`)));
    return links.map((l) => `- ${l}`).join("\n");
};

const getRepository = async (config, accountList, githubClient) => {
    const repoId = `${config.repo}@${config.githubAccount}`;
    if(!repositories.has(repoId)) {
        const [ owner, repo ] = config.repo.split("/");
        /**
        * @type {module:repo.Repository}
        */
        //TODO reduce config to what repo actually needs so it's board agnostic
        //TODO also needs a list of boards and validators to us.
        const repository = new Repository(githubClient, {
            owner,
            repo
        }, accountsList, boardList);
        repositories.set(repoId, repository);
    }
    return repositories.get(repoId);
};

loadConfig(path.join(__dirname, "./config.json")).then(async (config) => {
    const accountManager = new AccountManager(config.accounts);
    for(const project of config.boards) {
        const repo = await getRepository(project, await makeAccountList(accountManager, config.boards, project), accountManager.getAccount('github', project.githubAccount));
        //TODO also create board.
        new ContentQueue(accountManager, project, repo);
    }
}).catch((e) => console.error(e));
