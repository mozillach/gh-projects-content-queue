/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

const VALID_SEPARATORS = [" ", "-", "T", "Z", ":", "."];
const NUMBERS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const PATTERN_PLACEHOLDERS = ["Y", "M", "D", "H", "m"];
const ALLOWED_CHARS = VALID_SEPARATORS.concat(NUMBERS).join("");
const PATTERN_CHARS = VALID_SEPARATORS.concat(PATTERN_PLACEHOLDERS).join("");

const pad = (s, l) => {
    s = s.toString();
    while(s.length < l) {
        s = "0" + s;
    }
    return s;
}

class ScheduledDate extends Date {
    /**
     * @param {string} date - The date to parse.
     * @param {Object} config - Config object.
     */
    constructor(date, config) {
        if(ScheduledDate.isValid(date) && ScheduledDate.isValid(config.schedulingTime.format, true)) {
            const splitPattern = ScheduledDate.split(config.schedulingTime.format);
            const splitDate = ScheduledDate.split(date);

            const year = Number.parseInt(splitDate[splitPattern.indexOf("YYYY")], 10);
            const month = Number.parseInt(splitDate[splitPattern.indexOf("MM")], 10) - 1;
            const day = Number.parseInt(splitDate[splitPattern.indexOf("DD")], 10);
            const hour = Number.parseInt(splitDate[splitPattern.indexOf("HH")], 10);
            const minute = Number.parseInt(splitDate[splitPattern.indexOf("mm")], 10);

            super(year, month, day, hour, minute);

            const difference = config.schedulingTime.timezone + this.getTimezoneOffset() / 60;
            // Compensate for timezone difference if host timezone doesn't match
            // the one in the config.
            if(difference != 0) {
                let time = this.getTime();
                time += difference * 3600000;
                this.setTime(time);
            }
        }
        else {
            super();
        }
        this.config = config.schedulingTime;
        this.rawDate = date;
    }

    static split(str) {
        let strings = [str];
        let newStrings = [];
        for(const s of VALID_SEPARATORS) {
            newStrings.length = 0;
            for(const ss of strings) {
                if(ss.includes(s)) {
                    newStrings = newStrings.concat(ss.split(s));
                }
                else {
                    newStrings.push(ss);
                }
            }
            strings = newStrings.slice();
        }
        return strings;
    }

    /**
     * Format a date according to the given format. The format is the same as in
     * the config pattern:
     *  - YYYY for the 4 digit year
     *  - MM for the 2 digit month
     *  - DD for the 2 digit day of the month
     *  - HH for the 2 digit hour of the day (0 based)
     *  - mm for the 2 digit minutes within the hour
     *
     * Allowed separators: " ", ":", ".", "-", "T", "Z".
     *
     *  @param {?} date - Date to format, only actually does anything if it's a
     *                    Date instance.
     * @param {string} pattern - The pattern to format the date according to.
     * @returns {string|?} Returns a string if a date was passed, else whatever
     *          was originally passed as date.
     */
    static formatDate(date, pattern) {
        if(date instanceof Date) {
            return pattern
                .replace("YYYY", date.getFullYear())
                .replace("MM", pad(date.getMonth() + 1, 2))
                .replace("DD", pad(date.getDate(), 2))
                .replace("HH", pad(date.getHours(), 2))
                .replace("mm", pad(date.getMinutes(), 2));
        }
        return date;
    }

    /**
     * @param {string} str - String to check if it's a valid formatted date or pattern.
     * @param {boolean} [pattern=false] - If the passed string is a pattern.
     * @returns {boolean} Whether the string is valid.
     */
    static isValid(str, pattern = false) {
        if(typeof str != "string") {
            console.warn(str, "is not a string");
            return false;
        }
        const date = str.trim();
        if(!date.length) {
            console.warn("Date string is empty");
            return false;
        }

        if(pattern && !PATTERN_PLACEHOLDERS.every((p) => str.includes(p))) {
            console.warn("Pattern is missing placeholders:", str);
            return false;
        }

        let allowedChars = ALLOWED_CHARS;
        if(pattern) {
            allowedChars = PATTERN_CHARS;
        }
        return date.split("").every((s) => allowedChars.includes(s));
    }

    /**
     * @type {boolean}
     * @readonly
     */
    get valid() {
        return ScheduledDate.isValid(this.rawDate);
    }
}
module.exports = ScheduledDate;
