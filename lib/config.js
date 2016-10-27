/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

const fs = require("mz/fs");

const validColumns = [ "ideas", "reactions", "events", "toTweet", "tweeted" ];

const isObject = (obj) => typeof obj === "object" && obj !== null;
const isString = (str) => typeof str === "string" && str.length > 0;

/**
 * Validates a project configuration.
 *
 * @param {?} projectConfig - Config for a single project.
 * @throws When the config is invalid.
 * @returns {undefined}
 */
const validateProjectConfig = (projectConfig) => {
    // TODO test additional settings
    if(!isObject(projectConfig)) {
        throw "Project configuration must be an object";
    }

    if(!("repo" in projectConfig)) {
        throw 'No repository name set in "repo" for project';
    }

    if(!isString(projectConfig.repo) || !projectConfig.repo.includes("/")) {
        throw `Invalid repo name given: ${projectConfig.repo}. It should have the form of "owner/repository".`;
    }

    if(!("githubToken" in projectConfig)) {
        throw 'GitHub user token missing in "githubToken" for ' + projectConfig.repo;
    }

    if(!isString(projectConfig.githubToken)) {
        throw "GitHub user token in invalid format for " + projectConfig.repo;
    }

    if(!("projectName" in projectConfig)) {
        throw 'Missing project name in "projectName" for ' + projectConfig.repo;
    }

    if(!isString(projectConfig.projectName)) {
        throw "Invalid project name for " + projectConfig.repo;
    }

    if("columns" in projectConfig && isObject(projectConfig.columns)) {
        for(const column in projectConfig.columns) {
            if(!validColumns.includes(column)) {
                throw `Invalid column "${column}" for ${projectConfig.repo}`;
            }
            else if(!isString(projectConfig.columns[column])) {
                throw `Column name of column "${column}" must be a non-empty string for ${projectConfig.repo}`;
            }
        }
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
        const parsedConfig = JSON.parse(config);
        validateConfig(parsedConfig);
        return parsedConfig;
    });
};

exports.loadConfig = loadConfig;
exports.validateConfig = validateConfig;
