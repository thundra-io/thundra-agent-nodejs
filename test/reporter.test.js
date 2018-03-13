import Reporter from "../src/reporter";

let httpsRequestCalled = false;
let httpsRequestOnCalled = false;
let httpsRequestWriteCalled = false;
let httpsRequestEndCalled = false;
let sentData;

jest.mock('https', () => ({
    request: (options, response) => {
        httpsRequestCalled = true;
        return {
            on: jest.fn(() => httpsRequestOnCalled = true),
            write: jest.fn(data => {
                httpsRequestWriteCalled = true;
                sentData = data;
            }),
            end: jest.fn(() => httpsRequestEndCalled = true)
        }
    }
}));

describe("Reporter", () => {
    describe("constructor", () => {

        const reporter = new Reporter("apiKey");

        it("should set api key", () => {
            expect(reporter.apiKey).toEqual("apiKey");
        });

        it("should set reports to empty array", () => {
            expect(reporter.reports).toEqual([]);
        });

    });

    describe("addReports", () => {
        const reporter = new Reporter("apiKey");
        const mockReport = {data: "data"};
        reporter.addReport(mockReport);

        it("should add report to reports array", () => {
            expect(reporter.reports).toEqual([mockReport]);
        });

    });

    describe("httpsRequest", () => {

        const reporter = new Reporter("apiKey");
        const mockReport1 = {data: "data1"};
        const mockReport2 = {data: "data2"};

        reporter.addReport(mockReport1);
        reporter.addReport(mockReport2);
        reporter.sendReports();

        it("should make https request", () => {
            expect(httpsRequestCalled).toEqual(true);
            expect(httpsRequestOnCalled).toEqual(true);
            expect(httpsRequestWriteCalled).toEqual(true);
            expect(httpsRequestEndCalled).toEqual(true);

        });

        it("should JSON.stringify reports on https.request", () => {
            expect(sentData).toEqual(JSON.stringify(reporter.reports));

        });

    });


    describe("sendReports success", () => {

        const reporter = new Reporter("apiKey");
        const mockReport1 = {data: "data1"};
        const mockReport2 = {data: "data2"};

        reporter.httpsRequest = jest.fn(async () => {
            return {status: 200}
        });

        reporter.addReport(mockReport1);
        reporter.addReport(mockReport2);
        reporter.sendReports();
        it("should make a single https request", () => {
            expect(reporter.httpsRequest.mock.calls.length).toBe(1);

        });

    });

    describe("sendReports failure", () => {
        let consoleOutput;

        const reporter = new Reporter("apiKey");
        const mockReport1 = {data: "data1"};
        const mockReport2 = {data: "data2"};

        console["log"] = jest.fn(input => (consoleOutput = input));

        reporter.httpsRequest = jest.fn(async () => {
            return {status: 400}
        });

        reporter.addReport(mockReport1);
        reporter.addReport(mockReport2);
        reporter.sendReports();

        it("should log reports on failure", () => {
            expect(reporter.httpsRequest.mock.calls.length).toBe(1);
            expect(consoleOutput).toEqual(reporter.reports);
        });

    });

    describe("addReports async", () => {
        let stdout = null;
        process.env.thundra_lambda_publish_cloudwatch_enable = true;
        process.stdout.write = jest.fn(input => stdout = input);
        const reporter = new Reporter("apiKey");
        const mockReport = {data: "data"};
        reporter.addReport(mockReport);
        it("should not add report to reports array", () => {
            expect(reporter.reports).toEqual([]);
        });
        it("should write report to process.stdout", () => {
            expect(stdout).toBeTruthy();
        });

    });

});
