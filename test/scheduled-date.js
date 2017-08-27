import test from 'ava';
import ScheduledDate from '../lib/scheduled-date';
import sinon from 'sinon';
import defaultConfig from '../config.default.json';

const clock = sinon.useFakeTimers();
test.after(() => {
    clock.restore();
});

const globalDate = new Date();
const tzOffset = globalDate.getTimezoneOffset() / 60;

test('constructor with invalid date', (t) => {
    const date = new ScheduledDate('', {
        schedulingTime: {
            format: '',
            timezone: 0
        }
    });

    t.true(date instanceof Date);
    // Can't test the date object's time since the subclassing of the date object
    // isn't captured by the sinon shim.
    t.is(date.rawDate, '');
    t.false(date.valid);
});

test('constructor with valid formatted date', (t) => {
    const dateString = '2099.01.05 04:00';
    const date = new ScheduledDate(dateString, {
        schedulingTime: {
            format: 'YYYY.MM.DD HH:mm',
            timezone: -tzOffset
        }
    });
    const referenceDate = new Date(2099, 0, 5, 4, 0);

    t.true(date instanceof Date);
    t.is(date.rawDate, dateString);
    t.true(date.valid);
    t.is(date.getTime(), referenceDate.getTime());
});

const FORMAT_DATA = [
    {
        pattern: 'YYYY.MM.DD HH:mm',
        date: '2017.01.02 03:04',
        result: new Date(2017, 0, 2, 3, 4)
    },
    {
        pattern: 'YYYYa',
        date: '2017a',
        result: undefined // invalid pattern
    },
    {
        pattern: 'YYYY',
        date: '2017.01.02',
        result: new Date() // invalid date
    }
];

const VALID_PARTS = [
    "YYYY",
    "MM",
    "DD",
    "HH",
    "mm"
];
const patternTest = (t, data) => {
    const splitPattern = ScheduledDate.split(data.pattern);

    if(data.result !== undefined) {
        for(const p of splitPattern) {
            t.true(VALID_PARTS.includes(p));
        }
    }
    else {
        t.true(splitPattern.some((p) => !VALID_PARTS.includes(p)));
    }
};
patternTest.title = (title, data) => `${title} for ${data.pattern}`;

const dateTest = (t, data) => {
    const date = new ScheduledDate(data.date, {
        schedulingTime: {
            format: data.pattern,
            timezone: -tzOffset
        }
    });
    console.log(data.date, data.result.getTimezoneOffset(), date.getTimezoneOffset());

    t.is(date.getTime(), data.result.getTime());
};
dateTest.title = (title, data) => `${title} for ${data.date}`;

const dateFormatTest = (t, data) => {
    const formatted = ScheduledDate.formatDate(data.result, data.pattern);

    t.is(formatted, data.date);
};
dateFormatTest.title = (title, data) => `${title} as ${data.date}`;

for(const data of FORMAT_DATA) {
    test('split date patterns', patternTest, data);
    if(data.result !== undefined) {
        test('split date', dateTest, data);
        if(data.result.getTime() != Date.now()) {
            test('format date', dateFormatTest, data);
        }
    }
}

test("mkohler date", (t) => {
    const date = new ScheduledDate("26.08.2017 02:35", {
        schedulingTime: {
            format: defaultConfig[0].schedulingTime.format,
            timezone: 2
        }
    });
    t.is(date.getTime(), 1503707700000);
});

test("inverse mkohler date", (t) => {
    const date = new ScheduledDate("25.08.2017 22:35", {
        schedulingTime: {
            format: defaultConfig[0].schedulingTime.format,
            timezone: -2
        }
    });
    t.is(date.getTime(), 1503707700000);
});

test.todo('valid date pattern');
test.todo('valid date format')

test.todo('non-string date format invalid');
test.todo('empty string date format invalid');
test.todo('only whitespace invalid date format');

test.todo('is the scheduled date instance valid');
