import Trace from "../../src/plugins/trace";
import {createMockWrapperInstance, createMockReporterInstance,createMockPluginContext} from "../mocks/mocks";

const pluginContext = createMockPluginContext();
describe("Trace", () => {

    it("should export a function", () => {
        expect(typeof Trace).toEqual("function");
    });

    describe("constructor", () => {
        const options = {opt1: "opt1", opt2: "opt2"};
        const tracerWithOptions = Trace(options);
        const tracerWithoutOptions = Trace();
        const tracer = Trace();
        tracer.setPluginContext(pluginContext);
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
        const tracer = Trace();
        tracer.setPluginContext({...pluginContext,requestCount:5});
        const beforeInvocationData = {
            originalContext: mockWrapperInstance.originalContext,
            originalEvent: mockWrapperInstance.originalEvent,
            reporter: createMockReporterInstance(),
            contextId: "contextId"
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
        const tracer = Trace();
        tracer.setPluginContext(pluginContext);
        const beforeInvocationData = {
            originalContext: mockWrapperInstance.originalContext,
            originalEvent: mockWrapperInstance.originalEvent,
            reporter: mockWrapperInstance.reporter,
            contextId: "contextId"
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
                coldStart: pluginContext.requestCount > 0 ? "false" : "true",
                functionMemoryLimitInMB: mockWrapperInstance.originalContext.memoryLimitInMB,
                functionRegion: pluginContext.applicationRegion,
                request: mockWrapperInstance.originalEvent,
                response: {},
            });

        });


    });

    describe("afterInvocation without error data", () => {
        const mockWrapperInstance = createMockWrapperInstance();
        const tracer = Trace();
        tracer.setPluginContext(pluginContext);
        const beforeInvocationData = {
            originalContext: mockWrapperInstance.originalContext,
            originalEvent: mockWrapperInstance.originalEvent,
            reporter: mockWrapperInstance.reporter,
            contextId: "contextId"
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
            const tracer = Trace();
            tracer.setPluginContext(pluginContext);
            const beforeInvocationData = {
                originalContext: mockWrapperInstance.originalContext,
                originalEvent: mockWrapperInstance.originalEvent,
                reporter: mockWrapperInstance.reporter,
                contextId: "contextId"
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
            const tracer = Trace();
            tracer.setPluginContext(pluginContext);
            const beforeInvocationData = {
                originalContext: mockWrapperInstance.originalContext,
                originalEvent: mockWrapperInstance.originalEvent,
                reporter: mockWrapperInstance.reporter,
                contextId: "contextId"
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
            const tracer = Trace();
            tracer.setPluginContext(pluginContext);
            const beforeInvocationData = {
                originalContext: mockWrapperInstance.originalContext,
                originalEvent: mockWrapperInstance.originalEvent,
                reporter: mockWrapperInstance.reporter,
                contextId: "contextId"
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

