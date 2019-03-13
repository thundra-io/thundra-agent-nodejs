import Reporter from '../dist/Reporter.js';

let httpsRequestCalled = false;
let httpsRequestOnCalled = false;
let httpsRequestWriteCalled = false;
let httpsRequestEndCalled = false;

let httpsSentData;

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

    const reporter = new Reporter({apiKey: 'apiKey'});

    it('should set api key', () => {
        expect(reporter.config.apiKey).toEqual('apiKey');
    });

    it('should set reports to empty array', () => {
        expect(reporter.reports).toEqual([]);
    });

});

describe('Reporter', () => {

    describe('constructor', () => {

        const reporter = new Reporter({apiKey: 'apiKey'});

        it('should set api key', () => {
            expect(reporter.config.apiKey).toEqual('apiKey');
        });

        it('should set reports to empty array', () => {
            expect(reporter.reports).toEqual([]);
        });

    });

    describe('addReports', () => {
        const reporter = new Reporter({apiKey: 'apiKey'});
        const mockReport = {data: 'data'};
        reporter.addReport(mockReport);

        it('should add report to reports array', () => {
            expect(reporter.reports).toEqual([mockReport]);
        });

    });

    describe('request', () => {
        describe('https', () => {
            const reporter = new Reporter({apiKey: 'apiKey'});
            const mockReport1 = {data: 'data1'};
            const mockReport2 = {data: 'data2'};

            const reports = [];
            reports.push(mockReport1);
            reports.push(mockReport2);

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
                expect(httpsSentData).toEqual(JSON.stringify(reports));
            });
        });
    });
    
    describe('sendReports success', () => {

        const reporter = new Reporter({apiKey: 'apiKey'});
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

    describe('addReports async', () => {
        let stdout = null;
        process.env.thundra_agent_lambda_report_cloudwatch_enable = true;
        process.stdout.write = jest.fn(input => stdout = input);
        const reporter = new Reporter({apiKey: 'apiKey'});
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
