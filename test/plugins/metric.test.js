import Metric from "../../src/plugins/metric";
import {createMockWrapperInstance} from "../mocks/mocks";

const utils = require("../../src/plugins/utils");

utils.readProcIoPromise = jest.fn(() => {
    return new Promise((resolve, reject) => {
        return resolve({readBytes: 1024, writeBytes: 4096});
    });
});

utils.readProcStatPromise = jest.fn(() => {
    return new Promise((resolve, reject) => {
        return resolve({threadCount: 10});
    });
});

process.env.AWS_LAMBDA_LOG_STREAM_NAME = "2018/03/02/[$LATEST]applicationId";
process.env.thundra_applicationProfile = "test";
process.env.AWS_REGION = "us-west2";
process.env.AWS_LAMBDA_FUNCTION_VERSION = "$LATEST";


describe("Metrics", () => {
    
    describe("Export function", () => {
        const options = {opt1: "opt1", opt2: "opt2"};
        const metric = Metric(options);
        it("should export a function which returns an object", () => {
            expect(typeof Metric).toEqual("function");
            expect(typeof metric).toEqual("object");
        });
        it("should be able to pass options", () => {
            expect(metric.options).toEqual(options);
        });
    });

    describe("Constructor", () => {
        const options = {op1t: "opt1", opt2: "opt2"};
        const metric =  Metric();
        const metricWithOptions = new Metric(options);
        it("Should have the same hooks", () => {
            expect(metric.hooks).toEqual({
                "before-invocation": metric.beforeInvocation,
                "after-invocation": metric.afterInvocation
            });
        });
        it("Should be able to initialize variables without options", () => {
            expect(metric.statData).toEqual({});
            expect(metric.reports).toEqual([]);
            expect(metric.options).toEqual(undefined);
        });
        it("Should be able to initialize variables with options", () => {
            expect(metricWithOptions.statData).toEqual({});
            expect(metricWithOptions.reports).toEqual([]);
            expect(metricWithOptions.options).toEqual(options);

        });
        it("Should get clock tick", () => {
            expect(metric.clockTick).toBeTruthy();
            expect(metricWithOptions.clockTick).toBeTruthy();
        });

    });


    describe("beforeInvocation", () => {
        const metric = Metric();
        const mockWrapperInstance = createMockWrapperInstance();
        const beforeInvocationData = {
            originalContext: mockWrapperInstance.originalContext,
            originalEvent: mockWrapperInstance.originalEvent,
            reporter: mockWrapperInstance.reporter,
            apiKey: mockWrapperInstance.apiKey
        };

        it("Should set variables to their initial value", async () => {
            await metric.beforeInvocation(beforeInvocationData);
            expect(utils.readProcIoPromise).toBeCalled();
            expect(utils.readProcStatPromise).toBeCalled();
            expect(metric.initialProcStat).toEqual({threadCount: 10});
            expect(metric.initialProcIo).toEqual({readBytes: 1024, writeBytes: 4096});
            expect(metric.reporter).toBe(beforeInvocationData.reporter);
            expect(metric.apiKey).toBe(beforeInvocationData.apiKey);
            expect(metric.reports).toEqual([]);
            expect(metric.startCpuUsage).toBeDefined();
            expect(metric.statData.statTime).toBeDefined();
            expect(metric.statData).toEqual({
                applicationId: "applicationId",
                applicationName: "test",
                applicationProfile: "test",
                applicationVersion: "$LATEST",
                applicationType: "node",
                functionRegion: "us-west2",
                statTime: metric.statData.statTime
            })

        });

    });

    describe("afterInvocation", () => {
        const metric = Metric();
        metric.addCpuStatReport = jest.fn(async () => null);
        metric.addMemoryStatReport = jest.fn(async () => null);
        metric.addIoStatReport = jest.fn(async () => null);
        metric.addThreadStatReport = jest.fn(async () => null);
        metric.report = jest.fn();
        metric.reports = [1, 2, 3, 4];
        it("Should invoke add report functions", async () => {
            await metric.afterInvocation();
            expect(metric.addCpuStatReport).toBeCalled();
            expect(metric.addMemoryStatReport).toBeCalled();
            expect(metric.addIoStatReport).toBeCalled();
            expect(metric.addThreadStatReport).toBeCalled();
            expect(metric.report).toHaveBeenCalledTimes(4);

        });

    });

    describe("beforeInvocation + afterInvocation", () => {
        const metric = Metric();
        const mockWrapperInstance = createMockWrapperInstance();
        const beforeInvocationData = {
            originalContext: mockWrapperInstance.originalContext,
            originalEvent: mockWrapperInstance.originalEvent,
            reporter: mockWrapperInstance.reporter,
            apiKey: mockWrapperInstance.apiKey
        };

        it("Should set variables to their initial value", async () => {
            expect(metric.reports.length).toEqual(0);
            await metric.beforeInvocation(beforeInvocationData);
            await metric.afterInvocation();
            expect(metric.reports.length).toEqual(4);
            expect(metric.reporter.addReport).toHaveBeenCalledTimes(4);
        });
    });

    describe("addThreadStatReport", () => {
        const metric = Metric();
        const mockWrapperInstance = createMockWrapperInstance();
        const beforeInvocationData = {
            originalContext: mockWrapperInstance.originalContext,
            originalEvent: mockWrapperInstance.originalEvent,
            reporter: mockWrapperInstance.reporter,
            apiKey: mockWrapperInstance.apiKey
        };

        it("Should set variables to their initial value", async () => {
            expect(metric.reports).toEqual([]);
            await metric.beforeInvocation(beforeInvocationData);
            await metric.addThreadStatReport();
            const reportToGenerate = {
                data: {
                    ...metric.statData,
                    id: metric.reports[0].data.id,
                    statName: "ThreadStat",
                    threadCount: metric.initialProcStat.threadCount
                },
                type: "StatData",
                apiKey: metric.apiKey,
                dataFormatVersion: "1.0"
            };
            expect(metric.reports[0].data.id).toBeDefined();
            expect(metric.reports).toEqual([reportToGenerate]);

        });
    });

    describe("addMemoryStatReport", () => {
        const metric = Metric();
        const mockWrapperInstance = createMockWrapperInstance();
        const beforeInvocationData = {
            originalContext: mockWrapperInstance.originalContext,
            originalEvent: mockWrapperInstance.originalEvent,
            reporter: mockWrapperInstance.reporter,
            apiKey: mockWrapperInstance.apiKey
        };

        it("Should set variables to their initial value", async () => {
            expect(metric.reports.length).toEqual(0);
            await metric.beforeInvocation(beforeInvocationData);
            await metric.addMemoryStatReport();
            expect(metric.reports.length).toEqual(1);
            expect(metric.reports[0].type).toEqual("StatData");
            expect(metric.reports[0].apiKey).toEqual(metric.apiKey);
            expect(metric.reports[0].data.statName).toEqual("MemoryStat");
            expect(metric.reports[0].data["proc.rss"]).toBeDefined();
            expect(metric.reports[0].data["proc.heapUsed"]).toBeDefined();
            expect(metric.reports[0].data["proc.heapTotal"]).toBeDefined();
            expect(metric.reports[0].data["proc.external"]).toBeDefined();
            expect(metric.reports[0].data["os.totalMemory"]).toBeDefined();
            expect(metric.reports[0].data["os.freeMemory"]).toBeDefined();
            expect(metric.reports[0].data["os.usedMemory"]).toBeDefined();
        });
    });

    describe("addCpuStatReport", () => {
        const metric = Metric();
        const mockWrapperInstance = createMockWrapperInstance();
        const beforeInvocationData = {
            originalContext: mockWrapperInstance.originalContext,
            originalEvent: mockWrapperInstance.originalEvent,
            reporter: mockWrapperInstance.reporter,
            apiKey: mockWrapperInstance.apiKey
        };

        it("Should set variables to their initial value", async () => {
            expect(metric.reports.length).toEqual(0);
            await metric.beforeInvocation(beforeInvocationData);
            await metric.addCpuStatReport();
            expect(metric.reports.length).toEqual(1);
            expect(metric.reports[0].type).toEqual("StatData");
            expect(metric.reports[0].apiKey).toEqual(metric.apiKey);
            expect(metric.reports[0].data.statName).toEqual("CpuStat");
            expect(metric.reports[0].data["processCpuLoad"]).toBeDefined();
            expect(metric.reports[0].data["systemCpuLoad"]).toBeDefined();
        });
    });

    describe("addIoStatReport", () => {
        const metric = Metric();
        const mockWrapperInstance = createMockWrapperInstance();
        const beforeInvocationData = {
            originalContext: mockWrapperInstance.originalContext,
            originalEvent: mockWrapperInstance.originalEvent,
            reporter: mockWrapperInstance.reporter,
            apiKey: mockWrapperInstance.apiKey
        };

        it("Should set variables to their initial value", async () => {
            expect(metric.reports.length).toEqual(0);
            await metric.beforeInvocation(beforeInvocationData);
            await metric.addIoStatReport();
            expect(metric.reports.length).toEqual(1);
            expect(metric.reports[0].type).toEqual("StatData");
            expect(metric.reports[0].apiKey).toEqual(metric.apiKey);
            expect(metric.reports[0].data.statName).toEqual("IoStat");
            expect(metric.reports[0].data["proc.diskReadBytes"]).toBeDefined();
            expect(metric.reports[0].data["proc.diskWriteBytes"]).toBeDefined();
        });
    });
    
});