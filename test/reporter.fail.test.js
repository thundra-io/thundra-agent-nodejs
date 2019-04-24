import Reporter from '../dist/Reporter.js';
const URL = require('url').Url;

let httpRequestCalled = false;
let httpsRequestCalled = false;

let httpRequestOnCalled = false;
let httpsRequestOnCalled = false;

let httpRequestWriteCalled = false;
let httpsRequestWriteCalled = false;

let httpRequestEndCalled = false;
let httpsRequestEndCalled = false;

let httpSentData;
let httpsSentData;

jest.mock('http', () => ({
    request: (options, response) => {
        httpRequestCalled = true;
        return {
            on: jest.fn(() => httpRequestOnCalled = true),
            write: jest.fn(data => {
                httpRequestWriteCalled = true;
                httpSentData = data;
            }),
            end: jest.fn(() => httpRequestEndCalled = true)
        };
    },
    Agent: () => {
        return null;
    }
}));

jest.mock('https', () => ({
    request: (options, response) => {
        httpsRequestCalled = true;
        return {
            on: jest.fn(() => httpsRequestOnCalled = true),
            write: jest.fn(data => {
                httpsRequestWriteCalled = true;
                httpsSentData = data;
            }),
            end: jest.fn(() => httpsRequestEndCalled = true)
        };
    },
    Agent: () => {
        return null;
    }
}));

describe('Reporter', () => {

    describe('http', () => {
        // noinspection JSAnnotator
        const url = new URL('http://api.thundra.io/api');
        const reporter = new Reporter({apiKey: 'apiKey'}, url);
        const mockReport1 = {data: 'data1'};
        const mockReport2 = {data: 'data2'};

        const reports = [];
        reports.push(mockReport1);
        reports.push(mockReport2);

        test('should make http request', () => {
            reporter.addReport(mockReport1);
            reporter.addReport(mockReport2);
            reporter.sendReports();
            expect(httpRequestCalled).toEqual(true);
            expect(httpRequestOnCalled).toEqual(true);
            expect(httpRequestWriteCalled).toEqual(true);
            expect(httpRequestEndCalled).toEqual(true);

        });

        test('should JSON.stringify reports on https.request', () => {
            expect(httpSentData).toEqual(JSON.stringify(reports));
        });
    });

    describe('sendReports failure', () => {
        process.env.thundra_agent_lambda_debug_enable = 'true';
        let consoleOutput;

        const reporter = new Reporter({apiKey: 'apiKey'});
        const mockReport1 = {data: 'data1'};
        const mockReport2 = {data: 'data2'};

        const reports = [];
        reports.push(mockReport1);
        reports.push(mockReport2);

        console['log'] = jest.fn(input => (consoleOutput = input));

        reporter.addReport(mockReport1);
        reporter.addReport(mockReport2);
        return reporter.sendReports().then(() => {
            expect(consoleOutput).toEqual(JSON.stringify(reports));
        });
    });
});
