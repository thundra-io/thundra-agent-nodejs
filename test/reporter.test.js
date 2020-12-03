import ConfigProvider from '../dist/config/ConfigProvider';
import { default as Reporter, LogAndMetricTrimmer, SpanTagTrimmer, NonInvocationTrimmer } from '../dist/Reporter';
import { SPAN_TAGS_TO_TRIM_1, SPAN_TAGS_TO_TRIM_2 } from '../dist/Constants';

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
        const mockReport1 = { data: { type: 'Invocation', data: 'data1'}};
        const mockReport2 = { data: { type: 'Span', data: 'data2'}};

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
        const mockReport1 = { data: { type: 'Invocation', data: 'data1'}};
        const mockReport2 = { data: { type: 'Span', data: 'data2'}};

        const reports = [];
        reports.push(mockReport1);
        reports.push(mockReport2);

        reporter.sendToCollector = jest.fn(async () => {
            return { status: 200 };
        });

        reporter.sendReports(reports);

        it('should make a single https request', () => {
            expect(reporter.sendToCollector.mock.calls.length).toBe(1);
        });
    });

    describe('add reports async', () => {
        const stdoutWriteOriginal = process.stdout.write;
        try {
            let stdout = null;
            process.stdout.write = jest.fn(input => stdout = input);

            const reporter = new Reporter('apiKey', { async: true });
            const mockReport = { data: { type: 'Invocation', data: 'data1' }};

            const reports = [];
            reports.push(mockReport);

            reporter.sendReports(reports);

            it('should write report to process.stdout', () => {
                expect(stdout).toBeTruthy();
            });
        } finally {
            process.stdout.write = stdoutWriteOriginal;
        }
    });

    it('trim logs and metrics from reports', async () => {
        const reporter = new Reporter('apiKey', {
            trimmers: [
                new LogAndMetricTrimmer(),
            ],
            maxReportSize: 1,
        });
        const mockReport1 = { data: { type: 'Invocation', data: 'data1'}};
        const mockReport2 = { data: { type: 'Span', data: 'data2' }};
        const mockReport3 = { data: { type: 'Log', data: 'data3' }};
        const mockReport4 = { data: { type: 'Metric', data: 'data4' }};

        const reports = [];
        reports.push(mockReport1);
        reports.push(mockReport2);
        reports.push(mockReport3);
        reports.push(mockReport4);

        reporter.doReport = jest.fn((reportJson) => {
            return Promise.resolve(reportJson);
        });

        const reportJson = await reporter.sendReports(reports);
        const reportedData = JSON.parse(reportJson);

        expect(reportedData.data.type).toEqual('Composite');
        expect(reportedData.data.allMonitoringData.length).toEqual(2);
        expect(reportedData.data.allMonitoringData[0].type).toEqual('Invocation');
        expect(reportedData.data.allMonitoringData[1].type).toEqual('Span');
    });

    it('trim span tags from reports', async () => {
        const reporter = new Reporter('apiKey', {
            trimmers: [
                new SpanTagTrimmer(['x']),
            ],
            maxReportSize: 1,
        });
        const mockReport1 = { data: { type: 'Invocation', data: 'data1'}};
        const mockReport2 = { data: { type: 'Span', data: 'data2', tags: { 'x': 'y', 'a': 'b' } }};
        const mockReport3 = { data: { type: 'Log', data: 'data3' }};

        const reports = [];
        reports.push(mockReport1);
        reports.push(mockReport2);
        reports.push(mockReport3);

        reporter.doReport = jest.fn((reportJson) => {
            return Promise.resolve(reportJson);
        });

        const reportJson = await reporter.sendReports(reports);
        const reportedData = JSON.parse(reportJson);

        expect(reportedData.data.type).toEqual('Composite');
        expect(reportedData.data.allMonitoringData.length).toEqual(3);
        expect(reportedData.data.allMonitoringData[0].type).toEqual('Invocation');
        expect(reportedData.data.allMonitoringData[1].type).toEqual('Span');
        expect(reportedData.data.allMonitoringData[1].tags['a']).toEqual('b');
        expect(reportedData.data.allMonitoringData[1].tags['x']).toEqual(undefined);
        expect(reportedData.data.allMonitoringData[2].type).toEqual('Log');
    });

    it('trim non invocation data from reports', async () => {
        const reporter = new Reporter('apiKey', {
            trimmers: [
                new NonInvocationTrimmer(),
            ],
            maxReportSize: 1,
        });
        const mockReport1 = { data: { type: 'Invocation', data: 'data1'}};
        const mockReport2 = { data: { type: 'Span', data: 'data2' }};
        const mockReport3 = { data: { type: 'Log', data: 'data3' }};
        const mockReport4 = { data: { type: 'Metric', data: 'data4' }};

        const reports = [];
        reports.push(mockReport1);
        reports.push(mockReport2);
        reports.push(mockReport3);
        reports.push(mockReport4);

        reporter.doReport = jest.fn((reportJson) => {
            return Promise.resolve(reportJson);
        });

        const reportJson = await reporter.sendReports(reports);
        const reportedData = JSON.parse(reportJson);

        expect(reportedData.data.type).toEqual('Composite');
        expect(reportedData.data.allMonitoringData.length).toEqual(1);
        expect(reportedData.data.allMonitoringData[0].type).toEqual('Invocation');
    });

    it('trim reports', async () => {
        const reporter = new Reporter('apiKey', {
            maxReportSize: 400,
        });
        const mockReport1 = { data: { type: 'Invocation', data: 'data1'}};
        const mockReport2 = { data: { type: 'Span', data: 'data2', tags: { } }};
        const mockReport3 = { data: { type: 'Log', data: 'data3' }};
        const mockReport4 = { data: { type: 'Metric', data: 'data4' }};

        const tagIdx1 = Math.floor(Math.random() * Math.floor(SPAN_TAGS_TO_TRIM_1.length));
        const tagName1 = SPAN_TAGS_TO_TRIM_1[tagIdx1];
        mockReport2.data.tags[tagName1] = 'x';

        const tagIdx2 = Math.floor(Math.random() * Math.floor(SPAN_TAGS_TO_TRIM_2.length));
        const tagName2 = SPAN_TAGS_TO_TRIM_2[tagIdx2];
        mockReport2.data.tags[tagName2] = 'y';

        const reports = [];
        reports.push(mockReport1);
        reports.push(mockReport2);
        reports.push(mockReport3);
        reports.push(mockReport4);

        reporter.doReport = jest.fn((reportJson) => {
            return Promise.resolve(reportJson);
        });

        const reportJson = await reporter.sendReports(reports);
        const reportedData = JSON.parse(reportJson);

        expect(reportedData.data.type).toEqual('Composite');
        expect(reportedData.data.allMonitoringData.length).toEqual(2);
        expect(reportedData.data.allMonitoringData[0].type).toEqual('Invocation');
        expect(reportedData.data.allMonitoringData[1].type).toEqual('Span');
    });

});
