/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

const fs = require("mz/fs");
const Ajv = require("ajv");
const schema = require("../templates/config.schema.json");

class ConfigError extends Error {
    constructor(message) {
        super(message);
    }
}

const ajv = new Ajv();

/**
 * Validates a config
 *
 * @param {?} config - Config to validate.
 * @throws When the config is invalid.
 * @returns {?} The config that was passed in.
 */
const validateConfig = (config) => {
    const valid = ajv.validate(schema, config);
    if(!valid) {
        throw new ConfigError(ajv.errorsText());
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
