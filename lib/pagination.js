/**
 * REST API traversal handlers.
 *
 * @license MPL-2.0
 */
"use strict";

exports.github = async (github, result) => {
    let { data } = result;
    if(github.hasNextPage(result)) {
        const nextPage = await github.getNextPage(result)
        const otherPages = await exports.github(github, nextPage);
        data = data.concat(otherPages);
    }
    return data;
};

const replaceAt = (string, index, char) => {
    return string.substr(0, index) + char + string.substr(index + 1);
}

const stringSubtractor = (string, subtract) => {
    let carry = 0;
    for(let i = string.length - 1; i >= 0; --i) {
        const value = parseInt(string[i], 10);
        if(value - subtract - carry < 0) {
            string = replaceAt(string, i, (10 - parseInt((subtract + carry - value).toString()[0], 10)).toString()[0]);
            carry = 1;
        }
        else {
            string = replaceAt(string, i, (value - subtract - carry).toString());
            break;
        }
        subtract = Math.floor(subtract / 10);
    }
    return string;
};

exports.twitter = async (method, params, maxId) => {
    if(!("count" in params)) {
        params.count = 200;
    }
    if(maxId) {
        params.max_id = stringSubtractor(maxId, 1);
    }
    let result = await method(params);
    if(result.length == params.count) {
        const additionalResults = await exports.twitter(method, params, result.pop().id_str);
        result = result.concat(additionalResults);
    }
    return result;
};
