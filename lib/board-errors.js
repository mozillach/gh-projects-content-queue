/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/**
 * @module board-errors
 * @license MPL-2.0
 */
"use strict";

exports.ProjectNotFoundError = class extends Error {
    /**
     * @param {string} projectName - Name of the project that was not found.
     */
    constructor(projectName) {
        super(`Could not find project ${projectName}`);
    }
};

exports.NoProjectsError = class extends Error {
    /**
     * @param {string} owner - Owner of the repo.
     * @param {string} repo - Repo name.
     */
    constructor(owner, repo) {
        super(`No projects in repo ${owner}/${repo}`);
    }
};
