import Tracer from "../../src/plugins/tracer";
import globals from "../../src/globals";
import {createMockWrapperInstance, createMockReporterInstance} from "../mocks/mocks";

process.env.AWS_LAMBDA_LOG_STREAM_NAME = "2018/03/02/[$LATEST]applicationId";
process.env.thundra_applicationProfile = "test";
process.env.AWS_REGION = "us-west2";
process.env.AWS_LAMBDA_FUNCTION_VERSION = "$LATEST";

describe("Tracer", () => {

    it("should export a function", () => {
        expect(typeof Tracer).toEqual("function");
    });

    describe("constructor", () => {
        const options = {opt1: "opt1", opt2: "opt2"};
        const tracerWithOptions = Tracer(options);
        const tracerWithoutOptions = Tracer();
        const tracer = Tracer();

        it("should create an instance with options", () => {
            expect(tracerWithOptions.options).toEqual(options);
        });

        it("should create an instance without options", () => {
            expect(tracerWithoutOptions.options).toBeUndefined();

        });

        it("should set variables", () => {
            expect(tracer.hooks).toBeTruthy();

        });

        it("should not have new hooks", () => {
            expect(tracer.hooks).toEqual({
                "before-invocation": tracer.beforeInvocation,
                "after-invocation": tracer.afterInvocation
            });

        });

    });

    describe("report", () => {
        const mockWrapperInstance = createMockWrapperInstance();
        const tracer = Tracer();
        const beforeInvocationData = {
            originalContext: mockWrapperInstance.originalContext,
            originalEvent: mockWrapperInstance.originalEvent,
            reporter: createMockReporterInstance(),
            apiKey: mockWrapperInstance.apiKey
        };
        const afterInvocationData = {response: {key: "data"}};
        tracer.beforeInvocation(beforeInvocationData);
        tracer.afterInvocation(afterInvocationData);

        it("should call reporter.addReport", () => {
            expect(tracer.reporter.addReport).toBeCalledWith({
                data: tracer.traceData,
                type: "AuditData",
                apiKey: tracer.apiKey,
                dataFormatVersion: "1.0"
            });
        });
    });

    describe("beforeInvocation", () => {
        const mockWrapperInstance = createMockWrapperInstance();
        const tracer = Tracer();
        const beforeInvocationData = {
            originalContext: mockWrapperInstance.originalContext,
            originalEvent: mockWrapperInstance.originalEvent,
            reporter: mockWrapperInstance.reporter,
            apiKey: mockWrapperInstance.apiKey
        };
        tracer.beforeInvocation(beforeInvocationData);

        it("should set startTime", () => {
            expect(tracer.startTime instanceof Date).toBeTruthy();
        });

        it("should set apiKey", () => {
            expect(tracer.apiKey).toBe(mockWrapperInstance.apiKey);
        });

        it("should set reporter", () => {
            expect(tracer.reporter).toBe(mockWrapperInstance.reporter);
        });

        it("should initialize traceData", () => {
            expect(tracer.traceData).toBeTruthy();
            expect(tracer.traceData.id).toBeTruthy();
            expect(tracer.traceData.applicationName).toEqual(mockWrapperInstance.originalContext.functionName);
            expect(tracer.traceData.applicationId).toBeTruthy();
            expect(tracer.traceData.applicationVersion).toBeTruthy();
            expect(tracer.traceData.applicationProfile).toBeTruthy();
            expect(tracer.traceData.applicationType).toEqual("node");
            expect(tracer.traceData.duration).toEqual(null);
            expect(tracer.traceData.startTime).toBeTruthy();
            expect(tracer.traceData.endTime).toEqual(null);
            expect(tracer.traceData.errors).toEqual([]);
            expect(tracer.traceData.thrownError).toEqual(null);
            expect(tracer.traceData.contextType).toEqual("ExecutionContext");
            expect(tracer.traceData.contextName).toEqual(mockWrapperInstance.originalContext.functionName);
            expect(tracer.traceData.contextId).toBeTruthy();
            expect(tracer.traceData.auditInfo).toEqual({
                contextName: mockWrapperInstance.originalContext.functionName,
                id: tracer.traceData.contextId,
                openTime: tracer.traceData.startTime,
                closeTime: null,
                errors: [],
                thrownError: null,
            });
            expect(tracer.traceData.properties).toEqual({
                coldStart: globals.requestCount > 0 ? "false" : "true",
                functionMemoryLimitInMB: mockWrapperInstance.originalContext.memoryLimitInMB,
                functionRegion: process.env.AWS_REGION,
                request: mockWrapperInstance.originalEvent,
                response: {},
            });

        });


    });

    describe("afterInvocation without error data", () => {
        const mockWrapperInstance = createMockWrapperInstance();
        const tracer = Tracer();
        const beforeInvocationData = {
            originalContext: mockWrapperInstance.originalContext,
            originalEvent: mockWrapperInstance.originalEvent,
            reporter: mockWrapperInstance.reporter,
            apiKey: mockWrapperInstance.apiKey
        };
        const afterInvocationData = {
            response: {key: "data"}
        };
        tracer.report = jest.fn();
        tracer.beforeInvocation(beforeInvocationData);
        tracer.afterInvocation(afterInvocationData);

        it("should set endTime", () => {
            expect(tracer.endTime instanceof Date).toBeTruthy();
        });

        it("should set traceData", () => {
            expect(tracer.traceData.errors).toEqual([]);
            expect(tracer.traceData.thrownError).toEqual(null);
            expect(tracer.traceData.auditInfo.errors).toEqual([]);
            expect(tracer.traceData.auditInfo.thrownError).toEqual(null);
            expect(tracer.traceData.properties.response).toEqual({key: "data"});
            expect(tracer.traceData.endTime).toBeTruthy();
            expect(tracer.traceData.endTime).toEqual(tracer.traceData.auditInfo.closeTime);
            expect(tracer.traceData.duration).toEqual(tracer.endTime - tracer.startTime);
        });

        it("should call report", () => {
            expect(tracer.report).toBeCalledWith({
                data: tracer.traceData,
                type: "AuditData",
                apiKey: tracer.apiKey,
                dataFormatVersion: "1.0"
            });
        });

    });

    describe("afterInvocation with error data", () => {

        describe("Error typed error data", () => {
            const mockWrapperInstance = createMockWrapperInstance();
            const tracer = Tracer();
            const beforeInvocationData = {
                originalContext: mockWrapperInstance.originalContext,
                originalEvent: mockWrapperInstance.originalEvent,
                reporter: mockWrapperInstance.reporter,
                apiKey: mockWrapperInstance.apiKey
            };
            const afterInvocationData = {
                error: Error("error message"),
                response: {key: "data"}
            };
            tracer.report = jest.fn();
            tracer.beforeInvocation(beforeInvocationData);
            tracer.afterInvocation(afterInvocationData);

            it("should set endTime", () => {
                expect(tracer.endTime instanceof Date).toBeTruthy();
            });

            it("should set traceData", () => {
                expect(tracer.traceData.errors).toEqual(["Error"]);
                expect(tracer.traceData.thrownError).toEqual("Error");
                expect(tracer.traceData.auditInfo.errors).toEqual([{
                    errorMessage: "error message",
                    errorType: "Error"
                }]);
                expect(tracer.traceData.auditInfo.thrownError).toEqual({
                    errorMessage: "error message",
                    errorType: "Error"
                });
                expect(tracer.traceData.properties.response).toEqual({key: "data"});
                expect(tracer.traceData.endTime).toBeTruthy();
                expect(tracer.traceData.endTime).toEqual(tracer.traceData.auditInfo.closeTime);
                expect(tracer.traceData.duration).toEqual(tracer.endTime - tracer.startTime);
            });

            it("should call report", () => {
                expect(tracer.report).toBeCalledWith({
                    data: tracer.traceData,
                    type: "AuditData",
                    apiKey: tracer.apiKey,
                    dataFormatVersion: "1.0"
                });
            });
        });

        describe("string error data", () => {
            const mockWrapperInstance = createMockWrapperInstance();
            const tracer = Tracer();
            const beforeInvocationData = {
                originalContext: mockWrapperInstance.originalContext,
                originalEvent: mockWrapperInstance.originalEvent,
                reporter: mockWrapperInstance.reporter,
                apiKey: mockWrapperInstance.apiKey
            };
            const afterInvocationData = {
                error: "stringError",
                response: {key: "data"}
            };
            tracer.report = jest.fn();
            tracer.beforeInvocation(beforeInvocationData);
            tracer.afterInvocation(afterInvocationData);

            it("should set endTime", () => {
                expect(tracer.endTime instanceof Date).toBeTruthy();
            });

            it("should set traceData", () => {
                expect(tracer.traceData.errors).toEqual(["Unknown Error"]);
                expect(tracer.traceData.thrownError).toEqual("Unknown Error");
                expect(tracer.traceData.auditInfo.errors).toEqual([{
                    errorMessage: "stringError",
                    errorType: "Unknown Error"
                }]);
                expect(tracer.traceData.auditInfo.thrownError).toEqual({
                    errorMessage: "stringError",
                    errorType: "Unknown Error"
                });
                expect(tracer.traceData.properties.response).toEqual({key: "data"});
                expect(tracer.traceData.endTime).toBeTruthy();
                expect(tracer.traceData.endTime).toEqual(tracer.traceData.auditInfo.closeTime);
                expect(tracer.traceData.duration).toEqual(tracer.endTime - tracer.startTime);
            });

            it("should call report", () => {
                expect(tracer.report).toBeCalledWith({
                    data: tracer.traceData,
                    type: "AuditData",
                    apiKey: tracer.apiKey,
                    dataFormatVersion: "1.0"
                });
            });
        });

        describe("object error data", () => {
            const mockWrapperInstance = createMockWrapperInstance();
            const tracer = Tracer();
            const beforeInvocationData = {
                originalContext: mockWrapperInstance.originalContext,
                originalEvent: mockWrapperInstance.originalEvent,
                reporter: mockWrapperInstance.reporter,
                apiKey: mockWrapperInstance.apiKey
            };
            const errorObject = {err: "err", msg: "msg"};
            const afterInvocationData = {
                error: errorObject,
                response: {key: "data"}
            };
            tracer.report = jest.fn();
            tracer.beforeInvocation(beforeInvocationData);
            tracer.afterInvocation(afterInvocationData);

            it("should set endTime", () => {
                expect(tracer.endTime instanceof Date).toBeTruthy();
            });

            it("should set traceData", () => {
                expect(tracer.traceData.errors).toEqual(["Unknown Error"]);
                expect(tracer.traceData.thrownError).toEqual("Unknown Error");
                expect(tracer.traceData.auditInfo.errors).toEqual([{
                    errorMessage: JSON.stringify(errorObject),
                    errorType: "Unknown Error"
                }]);
                expect(tracer.traceData.auditInfo.thrownError).toEqual({
                    errorMessage: JSON.stringify(errorObject),
                    errorType: "Unknown Error"
                });
                expect(tracer.traceData.properties.response).toEqual({key: "data"});
                expect(tracer.traceData.endTime).toBeTruthy();
                expect(tracer.traceData.endTime).toEqual(tracer.traceData.auditInfo.closeTime);
                expect(tracer.traceData.duration).toEqual(tracer.endTime - tracer.startTime);
            });

            it("should call report", () => {
                expect(tracer.report).toBeCalledWith({
                    data: tracer.traceData,
                    type: "AuditData",
                    apiKey: tracer.apiKey,
                    dataFormatVersion: "1.0"
                });
            });
        });

    });
});

