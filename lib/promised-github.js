/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

const GitHub = require("github");

/**
 * @callback PromisifiedGitHub
 * @param {string} namespace- Namespace the method is defined on.
 * @param {string} method - Name of the method to run.
 * @param {Object} params - Params for the method.
 * @async
 * @returns {Object} - API response.
 * @prop {Object} lastMeta - Meta info of the last request.
 * @thorws when an error happens.
 */

/**
 * Returns a function that takes a function and its argument object as an
 * argument and then returns a promise.
 *
 * @param {string} token - Token to authenticate with.
 * @returns {PromisifiedGitHub} Promisified GitHub client.
 * @todo add pagination capability
 */
exports.getPromisifedClient = (token) => {
    const gh = new GitHub();
    gh.authenticate({
        type: "token",
        token
    });

    return function (namespace, method, params) {
        return new Promise((resolve, reject) => {
            gh[namespace][method](params, (err, res) => {
                if(err) {
                    reject(err);
                }
                else {
                    resolve(res);
                }
            });
        });
    }
};
