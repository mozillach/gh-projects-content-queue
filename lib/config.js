/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

const fs = require("mz/fs");

/**
 * Validates a project configuration.
 *
 * @param {?} projectConfig - Config for a single project.
 * @throws When the config is invalid.
 * @returns {undefined}
 */
const validateProjectConfig = (projectConfig) => {
    // TODO test additional settings
    if(typeof projectConfig !== "object" && projectConfig !== null) {
        throw "Project configuration must be an object";
    }

    if(!("repo" in projectConfig)) {
        throw 'No repository name set in "repo" for project';
    }

    if(typeof projectConfig.repo !== "string" || projectConfig.repo.length === 0 || !projectConfig.repo.includes("/")) {
        throw `Invalid repo name given: ${projectConfig.repo}. It should have the form of "owner/repository".`;
    }

    if(!("githubToken" in projectConfig)) {
        throw 'GitHub user token missing in "githubToken" for ' + projectConfig.repo;
    }

    if(typeof projectConfig.githubToken !== "string" || projectConfig.githubToken.length === 0) {
        throw "GitHub user token in invalid format for " + projectConfig.repo;
    }
};

/**
 * Validates a config
 *
 * @param {?} config - Config to validate.
 * @throws When the config is invalid.
 * @returns {undefined}
 */
const validateConfig = (config) => {
    if(typeof config !== "object" || !Array.isArray(config)) {
        throw "Config must be an array";
    }
    for(const projectConfig of config) {
        validateProjectConfig(projectConfig);
    }
};

/**
 * Loads a config and validates it.
 *
 * @param {string} file - Path to the config file.
 * @async
 * @returns {Object} Configuration from the given file.
 * @throws When the config is invalid.
 */
const loadConfig = (file) => {
    return fs.readFile(file, 'utf8').then((config) => {
        validateConfig(config);
    });
};

exports.loadConfig = loadConfig;
exports.validateConfig = validateConfig;
