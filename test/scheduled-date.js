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
        invalidDate: true,
        result: undefined // invalid pattern
    },
    {
        pattern: 'YYYY',
        date: '2017.01.02',
        result: new Date() // invalid date
    },
    {
        pattern: 2017,
        date: '2017',
        result: undefined
    },
    {
        pattern: '',
        date: '2017.01.02 03:04',
        result: undefined
    },
    {
        pattern: '      ',
        date: '       ',
        invalidDate: true,
        result: undefined
    },
    {
        pattern: 'YYYY.MM.DDTHH:mmZ',
        date: '17.01.02T03:04Z',
        result: new Date()
    },
    {
        pattern: 'YYYY.MM.DD HH:mm',
        date: '2017-01-02 03 04',
        result: new Date()
    },
    {
        pattern: 'YYYY.MM.DD HH:mm',
        date: 'YYYY.MM.DD HH:mm',
        result: new Date(),
        invalidDate: true
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
    else if(data.pattern.trim().length > 0){
        t.true(splitPattern.some((p) => !VALID_PARTS.includes(p)));
    }
    else {
        t.is(splitPattern.length, 0);
    }
};
patternTest.title = (title, data) => `${title} for ${data.pattern} (${data.date})`;

const dateTest = (t, data) => {
    const date = new ScheduledDate(data.date, {
        schedulingTime: {
            format: data.pattern,
            timezone: -tzOffset
        }
    });

    t.is(date.getTime(), data.result.getTime());
};
dateTest.title = (title, data) => `${title} for ${data.date}`;

const dateFormatTest = (t, data) => {
    const formatted = ScheduledDate.formatDate(data.result, data.pattern, -tzOffset);

    t.is(formatted, data.date);

    const date = new ScheduledDate(data.date, {
        schedulingTime: {
            format: data.pattern,
            timezone: -tzOffset
        }
    });
    t.true(date.valid);

    t.true(ScheduledDate.isValid(data.pattern, true));
    t.true(ScheduledDate.matchesPattern(data.date, data.pattern));
    t.true(ScheduledDate.isValid(data.date));
};
dateFormatTest.title = (title, data) => `${title} as ${data.date}`;

const dateInvalidTest = (t, data) => {
    const date = new ScheduledDate(data.date,  {
        schedulingTime: {
            format: data.pattern,
            timezone: -tzOffset
        }
    });

    t.false(date.valid);
};
dateInvalidTest.title = (title, data) => `${title} with ${data.date}`;

const patternInvalidTest = (t, data) => {
    t.false(ScheduledDate.isValid(data.pattern, true));
};
patternInvalidTest.title = (title, data) => `${title} with ${data.date}`;

const mismatchTest = (t, data) => {
    t.false(ScheduledDate.matchesPattern(data.date, data.pattern));
};
mismatchTest.title = (title, data) => `${title} with ${data.date}`;

const invalidDateFormatTest = (t, data) => {
    t.false(ScheduledDate.isValid(data.date));
};
invalidDateFormatTest.title = (title, data) => `${title} with ${data.date}`;

for(const data of FORMAT_DATA) {
    if(typeof data.pattern === "string") {
        test('split date patterns', patternTest, data);
    }
    if(data.result !== undefined) {
        test('split date', dateTest, data);
        if(data.result.getTime() != Date.now()) {
            test('format date', dateFormatTest, data);
        }
        else {
            test('ensure invalid', dateInvalidTest, data);
            test('date and pattern mismatch', mismatchTest, data);
        }
    }
    else {
        test('ensure invalid', dateInvalidTest, data);
        test('pattern is invalid', patternInvalidTest, data);
    }
    if(data.invalidDate) {
        test('date invalid', invalidDateFormatTest, data);
    }
}

test("mkohler date", (t) => {
    const date = new ScheduledDate("26.08.2017 02:35", {
        schedulingTime: {
            format: defaultConfig.boards[0].schedulingTime.format,
            timezone: 2
        }
    });
    t.is(date.getTime(), 1503707700000);
});

test("inverse mkohler date", (t) => {
    const date = new ScheduledDate("25.08.2017 22:35", {
        schedulingTime: {
            format: defaultConfig.boards[0].schedulingTime.format,
            timezone: -2
        }
    });
    t.is(date.getTime(), 1503707700000);
});

test('formatDate with a non-date', (t) => {
    const res = ScheduledDate.formatDate('foo', '');
    t.is(res, 'foo');
});

test('format date formats to the proper timezone', (t) => {
    const date = new Date(1503707700000);
    const formatted = ScheduledDate.formatDate(date, defaultConfig.boards[0].schedulingTime.format, 2);

    t.is(formatted, "26.08.2017 02:35");
});

test('format date formats to the proper timezone reverse', (t) => {
    const date = new Date(1503707700000);
    const formatted = ScheduledDate.formatDate(date, defaultConfig.boards[0].schedulingTime.format, -2);

    t.is(formatted, "25.08.2017 22:35");
});

test('format date with and without timezone is the same for the local tz', (t) => {
    const date = new Date();
    const formattedWithout = ScheduledDate.formatDate(date, defaultConfig.boards[0].schedulingTime.format);
    const formattedWith = ScheduledDate.formatDate(date, defaultConfig.boards[0].schedulingTime.format, -tzOffset);

    t.is(formattedWithout, formattedWith);
});
