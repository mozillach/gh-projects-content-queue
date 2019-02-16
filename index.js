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
const Repository = require("./lib/repo");

class QueueManager {
    static init() {
        this.repositories = new Map();

        loadConfig(path.join(__dirname, "./config.json")).then((config) => this.createQueues(config)).catch(console.error);
    }

    static async createQueues(config) {
        this.accountManager = new AccountManager(config.accounts);
        for(const project of config.boards) {
            const repo = await this.getRepository(project, config);
            new ContentQueue(this.accountManager, project, repo);
        }
    }

    static getBoardsInRepo(boards, repo) {
        return boards.filter((board) => {
            if(board.hasOwnProperty("owner")) {
                return `${board.owner}/${board.repo}` === repo;
            }
            return board.repo === repo;
        });
    }

    static async makeAccountList(boards, project) {
        // This gets all boards on the same repo in this instance, regardless of account it uses.
        const boardsWithRepo = this.getBoardsInRepo(boards, project.repo);
        //TODO this currently completely ignores account types, even though names are only unique per type.
        const accountsInBoards = new Set([].concat(...boardsWithRepo.map((b) => b.sources.filter((s) => s.type === 'publish').map((s) => s.accountName))));
        const accounts = this.accountManager.getContentAccounts(accountsInBoards);
        const links = await Promise.all(accounts.map((a) => a.getAccountLink().then((link) => `${link} on ${a.constructor.TYPE}`)));
        return links.map((l) => `- ${l}`).join("\n");
    }

    static makeBoardList(boards, repo) {
        const boardsInRepo = this.getBoardsInRepo(boards, repo);
        return boardsInRepo.map((b) => `- ${b.projectName}`).join("\n");
    }

    static async getRepository(config, globalConfig) {
        const repoId = `${config.repo}@${config.githubAccount}`;
        if(!this.repositories.has(repoId)) {
            const [ owner, repo ] = config.repo.split("/");
            const accountsList = await this.makeAccountList(globalConfig.boards, config);
            const boardList = this.makeBoardList(globalConfig.boards, config.repo);
            const githubClient = this.accountManager.getAccount('github', config.githubAccount);
            /**
            * @type {module:repo.Repository}
            */
            const repository = new Repository(githubClient.client, {
                owner,
                repo
            }, await accountsList, boardList);
            this.repositories.set(repoId, repository);
        }
        return this.repositories.get(repoId);
    }
}
QueueManager.init();
