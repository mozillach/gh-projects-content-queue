/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/**
 * @module config
 * @license MPL-2.0
 */
"use strict";

const fs = require("mz/fs");
const Ajv = require("ajv");
const timezoneSupport = require("timezone-support");
const schema = require("../templates/config.schema.json");

/**
 * @typedef {Object} ScheduledDateConfig
 * @property {string} format - Format of the date time.
 * @property {number} timezone - Offset relative to UTC in hours.
 * @property {string} region - Region to use as date offset.
 */

/**
 * @typedef {Object} Config
 * @property {ScheduledDateConfig} schedulingTime - ScheduledDate configuration.
 */

/**
 * @extends external:Error
 */
class ConfigError extends Error {
    constructor(message) {
        super(message);
    }
}

const ajv = new Ajv();

/**
 * Validates a config
 *
 * @param {Config} config - Config to validate.
 * @throws {ConfigError} When the config is invalid.
 * @returns {Config} The config that was passed in.
 */
const validateConfig = (config) => {
    const valid = ajv.validate(schema, config);
    if(!valid) {
        throw new ConfigError(ajv.errorsText());
    }
    const boardIds = new Set();
    const timezones = timezoneSupport.listTimeZones();
    for(const board of config.boards) {
        const boardId = board.projectName + "@" + board.repo;
        if(boardIds.has(boardId)) {
            throw new ConfigError(`Should only have one configuration for board ${board.projectName} in ${board.repo}`);
        }
        else if(board.schedulingTime && board.schedulingTime.region && !timezones.includes(board.schedulingTime.region)) {
            throw new ConfigError(`Unrecognized timezone region "${board.schedulingTime.region}`);
        }
        boardIds.add(boardId);
    }
    return config;
};

/**
 * Loads a config and validates it.
 *
 * @param {string} file - Path to the config file.
 * @async
 * @returns {module:config~Config} Configuration from the given file.
 * @throws {module:config~ConfigError} When the config is invalid.
 * @alias module:config.loadConfig
 */
const loadConfigFromFile = (file) => {
    return fs.readFile(file, 'utf8').then((config) => {
        const parsedConfig = JSON.parse(config);
        return validateConfig(parsedConfig);
    });
};

const loadConfigFromEnv = () => {
    if(process.env.CQ_CONFIG) {
        const config = JSON.parse(process.env.CQ_CONFIG);
        return validateConfig(config);
    }
    throw new ConfigError("No configuration found");
};

const loadConfig = async (file) => {
    try {
        await fs.stat(file);
    }
    catch(e) {
        return loadConfigFromEnv();
    }
    return loadConfigFromFile(file);
};

exports.loadConfig = loadConfig;
exports.validateConfig = validateConfig;
