/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/**
 * @module scheduled-date
 * @license MPL-2.0
 */
"use strict";

const self = require("./self");
const timezoneSupport = require("timezone-support");

/**
 * Allowed separators in a date time formatted string.
 *
 * @const {[string]}
 */
const VALID_SEPARATORS = [" ", "-", "T", "Z", ":", "."];
/**
 * Numbers allowed within a formatted date time.
 *
 * @const {[string]}
 */
const NUMBERS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
/**
 * Placeholders within a date time pattern.
 *
 * @const {[string]}
 */
const PATTERN_PLACEHOLDERS = ["Y", "M", "D", "H", "m"];
/**
 * All characters allowed in a formatted date time.
 *
 * @const {[string]}
 */
const ALLOWED_CHARS = VALID_SEPARATORS.concat(NUMBERS).join("");
/**
 * All characters allowed in a date time pattern.
 *
 * @const {[string]}
 */
const PATTERN_CHARS = VALID_SEPARATORS.concat(PATTERN_PLACEHOLDERS).join("");

/**
 * Pad a number with zeroes to the left to a given size.
 *
 * @param {number} s - Number to pad.
 * @param {number} l - Length of the final string.
 * @returns {string} Zero padded number.
 */
const pad = (s, l) => {
    s = s.toString();
    return s.padStart(l, "0");
};

/**
 * @extends external:Date
 * @alias module:scheduled-date.ScheduledDate
 */
class ScheduledDate extends Date {
    /**
     * @param {string} date - The date to parse.
     * @param {module:config~Config} config - Config object.
     */
    constructor(date, config) {
        if(ScheduledDate.isValid(date)
            && ScheduledDate.isValid(config.schedulingTime.format, true)
            && (typeof config.schedulingTime.timezone == "number" || typeof config.schedulingTime.region == "string")
            && ScheduledDate.matchesPattern(date, config.schedulingTime.format)) {
            const splitPattern = ScheduledDate.split(config.schedulingTime.format);
            const splitDate = ScheduledDate.split(date);

            const year = Number.parseInt(splitDate[splitPattern.indexOf("YYYY")], 10);
            const month = Number.parseInt(splitDate[splitPattern.indexOf("MM")], 10) - 1;
            const day = Number.parseInt(splitDate[splitPattern.indexOf("DD")], 10);
            const hour = Number.parseInt(splitDate[splitPattern.indexOf("HH")], 10);
            const minute = Number.parseInt(splitDate[splitPattern.indexOf("mm")], 10);

            super(year, month, day, hour, minute);

            self(this).adjustTimezone(this, config.schedulingTime.timezone, config.schedulingTime.region);
        }
        else {
            //TODO For some reason this misbehaves in unit tests when passing nothing to super.
            super(Date.now());
        }
        /**
         * @type {module:config~Config}
         */
        this.config = config.schedulingTime;
        /**
         * @type {string}
         */
        this.rawDate = date;
    }

    /**
     * Adjusts a date to be in a different timezone. Assumes the date was set
     * in the current local timezone bould should be treated as being set in
     * the given timezone.
     *
     * @param {Date} date - Date to adjust. Is modified but not exlicitly returned.
     * @param {number} [timezone] - Target timezone for the date.
     * @param {string} [region] - Target region for the date.
     * @param {boolean} [direction=false] - If the date should be converted to
     *                                      or from the local timezone. Defaults
     *                                      to convert to local timezone.
     * @returns {undefined}
     */
    static adjustTimezone(date, timezone, region, direction = false) {
        let difference;
        if(region) {
            const tz = timezoneSupport.findTimeZone(region);
            //TODO I think there's a potential error here around dst changes and similar...
            difference = Math.floor((date.getTimezoneOffset() - timezoneSupport.getUTCOffset(date, tz).offset) * 60000);
        }
        else if(timezone) {
            const localTimezone = date.getTimezoneOffset() / 60;
            difference = Math.floor((timezone + localTimezone) * 3600000);
        }
        // Compensate for timezone difference if host timezone doesn't match
        // the one in the config.
        if(difference != 0) {
            let time = date.getTime();
            if(!direction) {
                time -= difference;
            }
            else {
                time += difference;
            }
            date.setTime(time);
        }
    }

    /**
     * Splits a string at every separator in the string.
     *
     * @param {string} str - String to split into parts.
     * @returns {[string]} String split into parts of the date.
     */
    static split(str) {
        let strings = [str];
        let newStrings = [];
        for(const s of VALID_SEPARATORS) {
            if(str.includes(s)) {
                newStrings.length = 0;
                for(const ss of strings) {
                    if(ss.includes(s) && ss.length > s.length) {
                        newStrings = newStrings.concat(ss.split(s));
                    }
                    else if(ss !== s) {
                        newStrings.push(ss);
                    }
                }
                strings = newStrings.slice();
            }
        }
        return strings.filter((s) => s.length);
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
     *  @param {external:Date} date - Date to format, only actually does anything if it's a
     *                                Date instance.
     * @param {string} pattern - The pattern to format the date according to.
     * @param {number} [timezone] - The target timezone for the formatted date.
     * @param {string} [region] - The target region for the formatted date.
     * @returns {string?} Returns a string if a date was passed, else whatever
     *          was originally passed as date.
     */
    static formatDate(date, pattern, timezone, region) {
        if(date instanceof Date) {
            const dateCopy = new Date(date);
            if(timezone || region) {
                this.adjustTimezone(dateCopy, timezone, region, true);
            }
            return pattern
                .replace("YYYY", dateCopy.getFullYear())
                .replace("MM", pad(dateCopy.getMonth() + 1, 2))
                .replace("DD", pad(dateCopy.getDate(), 2))
                .replace("HH", pad(dateCopy.getHours(), 2))
                .replace("mm", pad(dateCopy.getMinutes(), 2));
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

    static matchesPattern(str, pattern) {
        if(str.length !== pattern.length) {
            return false;
        }
        for(let i = 0; i < pattern.length; ++i) {
            if(VALID_SEPARATORS.includes(pattern[i]) && pattern[i] !== str[i]) {
                return false;
            }
            else if(PATTERN_PLACEHOLDERS.includes(pattern[i]) && Number.isNaN(Number.parseInt(str[i], 10))) {
                return false;
            }
        }
        return true;
    }

    /**
     * @type {boolean}
     * @readonly
     */
    get valid() {
        return self(this).isValid(this.rawDate) && self(this).matchesPattern(this.rawDate, this.config.format);
    }
}
module.exports = ScheduledDate;
