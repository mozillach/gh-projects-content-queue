/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

const config = require("../config.json");

const validateProjectConfig = (projectConfig) => {
    // TODO test additional settings
    if(typeof projectConfig !== "object") {
        throw "Project configuration must be an object";
    }
};

const validateConfig = (conf = config) => {
    if(typeof conf !== "object" || !Array.isArray(conf)) {
        throw "Config must be an array";
    }
    for(const projectConfig of conf) {
        validateProjectConfig(projectConfig));
    }
};

validateConfig();

module.exports = config;
