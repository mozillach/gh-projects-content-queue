/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

const fs = require("mz/fs");

const validColumns = [ "ideas", "reactions", "events", "toTweet", "tweeted" ];
const validLabels = [ "retweet", "ready", "invalid" ];

const isObject = (obj) => typeof obj === "object" && obj !== null;
const isString = (str) => typeof str === "string" && str.length > 0;

class ConfigError extends Error {
    constructor(message) {
        super(message);
    }
}

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
        throw new ConfigError("Project configuration must be an object");
    }

    if(!("repo" in projectConfig)) {
        throw new ConfigError('No repository name set in "repo" for project');
    }

    if(!isString(projectConfig.repo) || !projectConfig.repo.includes("/")) {
        throw new ConfigError(`Invalid repo name given: ${projectConfig.repo}. It should have the form of "owner/repository".`);
    }

    if(!("githubToken" in projectConfig)) {
        throw new ConfigError('GitHub user token missing in "githubToken" for ' + projectConfig.repo);
    }

    if(!isString(projectConfig.githubToken)) {
        throw new ConfigError("GitHub user token in invalid format for " + projectConfig.repo);
    }

    if(!("projectName" in projectConfig)) {
        throw new ConfigError('Missing project name in "projectName" for ' + projectConfig.repo);
    }

    if(!isString(projectConfig.projectName)) {
        throw new ConfigError("Invalid project name for " + projectConfig.repo);
    }

    if("columns" in projectConfig && !isObject(projectConfig.columns)) {
        throw new ConfigError(`"columns" must be an object for ${projectConfig.repo}`);
    }

    if("columns" in projectConfig) {
        for(const column in projectConfig.columns) {
            if(!validColumns.includes(column)) {
                throw new ConfigError(`Invalid column "${column}" for ${projectConfig.repo}`);
            }
            else if(!isString(projectConfig.columns[column])) {
                throw new ConfigError(`Column name of column "${column}" must be a non-empty string for ${projectConfig.repo}`);
            }
        }
    }

    if("labels" in projectConfig && !isObject(projectConfig.labels)) {
        throw new ConfigError(`"labels" must be an object for ${projectConfig.repo}`);
    }

    if("labels" in projectConfig) {
        for(const label in projectConfig.labels) {
            if(!validLabels.includes(label)) {
                throw new ConfigError(`Invalid label "${label}" for ${projectConfig.repo}`);
            }
            else if(!isString(projectConfig.labels[label])) {
                throw new ConfigError(`Label name of label "${label}" must be a non-empty string for ${projectConfig.repo}`);
            }
        }
    }
};

/**
 * Validates a config
 *
 * @param {?} config - Config to validate.
 * @throws When the config is invalid.
 * @returns {?} The config that was passed in.
 */
const validateConfig = (config) => {
    if(typeof config !== "object" || !Array.isArray(config)) {
        throw new ConfigError("Config must be an array");
    }
    for(const projectConfig of config) {
        validateProjectConfig(projectConfig);
    }
    return config;
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
        return validateConfig(parsedConfig);
    });
};

exports.loadConfig = loadConfig;
exports.validateConfig = validateConfig;
