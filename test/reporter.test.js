import ConfigProvider from '../dist/config/ConfigProvider';
import ConfigNames from '../dist/config/ConfigNames';
import Reporter from '../dist/Reporter.js';

import TestUtils from './utils.js';

let httpsRequestCalled = false;
let httpsRequestOnCalled = false;
let httpsRequestWriteCalled = false;
let httpsRequestEndCalled = false;

let httpsSentData;

beforeEach(() => {
    TestUtils.clearEnvironmentVariables();
    ConfigProvider.clear();
});

afterEach(() => {
    TestUtils.clearEnvironmentVariables();
    ConfigProvider.clear();
});

jest.mock('http', () => ({
    request: (options, response) => {
        return {
            on: jest.fn(() => true),
            write: jest.fn(data => {
            }),
            end: jest.fn(() => true)
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
});

describe('reporter', () => {

    describe('constructor', () => {
        const reporter = new Reporter('apiKey');

        it('should set api key', () => {
            expect(reporter.apiKey).toEqual('apiKey');
        });
    });

    describe('request', () => {
        const reporter = new Reporter('apiKey');
        const mockReport1 = {data: {type: 'Invocation', data: 'data1'}};
        const mockReport2 = {data: {type: 'Span', data: 'data2'}};

        const reports = [];
        reports.push(mockReport1);
        reports.push(mockReport2);

        reporter.sendReports(reports);

        const sentData = httpsSentData;

        describe('https', () => {
            it('should make https request', () => {
                expect(httpsRequestCalled).toEqual(true);
                expect(httpsRequestOnCalled).toEqual(true);
                expect(httpsRequestWriteCalled).toEqual(true);
                expect(httpsRequestEndCalled).toEqual(true);
            });

            it('should JSON.stringify reports on https.request', () => {
                const httpsSentDataObj = JSON.parse(sentData);
                const allHttpsSentDataObj = httpsSentDataObj.data.allMonitoringData;
                expect(JSON.stringify(allHttpsSentDataObj)).toEqual(JSON.stringify(reports.map(r => r.data)));
            });
        });
    });

    describe('send reports success', () => {
        const reporter = new Reporter('apiKey');
        const mockReport1 = {data: {type: 'Invocation', data: 'data1'}};
        const mockReport2 = {data: {type: 'Span', data: 'data2'}};

        const reports = [];
        reports.push(mockReport1);
        reports.push(mockReport2);

        reporter.request = jest.fn(async () => {
            return {status: 200};
        });

        reporter.sendReports(reports);

        it('should make a single https request', () => {
            expect(reporter.request.mock.calls.length).toBe(1);
        });
    });

    describe('add reports async', () => {
        let stdout = null;
        ConfigProvider.set(ConfigNames.THUNDRA_REPORT_CLOUDWATCH_ENABLE, true);
        process.stdout.write = jest.fn(input => stdout = input);

        const reporter = new Reporter('apiKey');
        const mockReport = {data: {type: 'Invocation', data: 'data1'}};

        const reports = [];
        reports.push(mockReport);

        reporter.sendReports(reports);

        it('should write report to process.stdout', () => {
            expect(stdout).toBeTruthy();
        });
    });

});
