/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

const GitHub = require("github");

/**
 * @callback PromisifiedGitHub
 * @param {string} method - Name of the method to run.
 * @param {Object} params - Params for the method.
 * @async
 * @returns {Object} - API response.
 * @thorws when an error happens.
 */

/**
 * Returns a function that takes a function and its argument object as an
 * argument and then returns a promise.
 *
 * @param {string} token - Token to authenticate with.
 * @param {string} namespace - Namespace the function calls should be made on.
 * @returns {PromisifiedGitHub} Promisified GitHub client.
 */
exports.getPromisifedClient = (token, namespace) => {
    const gh = new GitHub();
    gh.authenticate({
        type: "token",
        token
    });

    return (method, params) => {
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
