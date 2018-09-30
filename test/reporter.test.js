import Reporter from '../dist/Reporter.js';
import * as http from 'http';
import * as https from 'https';
import {URL} from 'url';

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

describe('constructor', () => {

    const reporter = new Reporter('apiKey');

    it('should set api key', () => {
        expect(reporter.apiKey).toEqual('apiKey');
    });

    it('should set reports to empty array', () => {
        expect(reporter.reports).toEqual([]);
    });

});

describe('Reporter', () => {

    describe('constructor', () => {

        const reporter = new Reporter('apiKey');

        it('should set api key', () => {
            expect(reporter.apiKey).toEqual('apiKey');
        });

        it('should set reports to empty array', () => {
            expect(reporter.reports).toEqual([]);
        });

    });

    describe('addReports', () => {
        const reporter = new Reporter('apiKey');
        const mockReport = {data: 'data'};
        reporter.addReport(mockReport);

        it('should add report to reports array', () => {
            expect(reporter.reports).toEqual([mockReport]);
        });

    });

    describe('request', () => {
        describe('https', () => {
            const reporter = new Reporter('apiKey');
            const mockReport1 = {data: 'data1'};
            const mockReport2 = {data: 'data2'};

            reporter.addReport(mockReport1);
            reporter.addReport(mockReport2);
            reporter.sendReports();

            it('should make https request', () => {
                expect(httpsRequestCalled).toEqual(true);
                expect(httpsRequestOnCalled).toEqual(true);
                expect(httpsRequestWriteCalled).toEqual(true);
                expect(httpsRequestEndCalled).toEqual(true);
            });

            it('should JSON.stringify reports on https.request', () => {
                expect(httpsSentData).toEqual(JSON.stringify(reporter.reports));
            });
        });

        describe('http', () => {
            // noinspection JSAnnotator
            const url = new URL('http://collector.thundra.io/api');
            const reporter = new Reporter('apiKey', url);
            const mockReport1 = {data: 'data1'};
            const mockReport2 = {data: 'data2'};

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
                expect(httpSentData).toEqual(JSON.stringify(reporter.reports));
            });
        });
    });


    describe('sendReports success', () => {

        const reporter = new Reporter('apiKey');
        const mockReport1 = {data: 'data1'};
        const mockReport2 = {data: 'data2'};

        reporter.request = jest.fn(async () => {
            return {status: 200};
        });

        reporter.addReport(mockReport1);
        reporter.addReport(mockReport2);
        reporter.sendReports();
        it('should make a single https request', () => {
            expect(reporter.request.mock.calls.length).toBe(1);

        });

    });

    describe('sendReports failure', () => {
        let consoleOutput;

        const reporter = new Reporter('apiKey');
        const mockReport1 = {data: 'data1'};
        const mockReport2 = {data: 'data2'};

        console['log'] = jest.fn(input => (consoleOutput = input));

        reporter.request = jest.fn(async () => {
            return {status: 400};
        });

        reporter.addReport(mockReport1);
        reporter.addReport(mockReport2);
        reporter.sendReports();

        it('should log reports on failure', () => {
            expect(reporter.request.mock.calls.length).toBe(1);
            expect(consoleOutput).toEqual(reporter.reports);
        });

    });

    describe('addReports async', () => {
        let stdout = null;
        process.env.thundra_agent_lambda_report_cloudwatch_enable = true;
        process.stdout.write = jest.fn(input => stdout = input);
        const reporter = new Reporter('apiKey');
        const mockReport = {data: 'data'};
        reporter.addReport(mockReport);
        it('should not add report to reports array', () => {
            expect(reporter.reports).toEqual([]);
        });
        it('should write report to process.stdout', () => {
            expect(stdout).toBeTruthy();
        });

    });

});
