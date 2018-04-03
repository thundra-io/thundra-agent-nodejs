const Thundra = require("../index");
const utils = require("../src/plugins/utils");

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
delete process.env.thundra_trace_disable;
delete process.env.thundra_metric_disable;
delete process.env.thundra_disable;
delete process.env.thundra_apiKey;

describe("Thundra library", () => {

    describe("With env apiKey",() => {
        delete process.env.thundra_disable;
        process.env.thundra_apiKey="apiKey";
        const originalEvent = {};
        const originalContext = {};
        const originalCallback = jest.fn();
        const originalFunction = jest.fn(() => originalCallback());
        const ThundraWrapper = Thundra();
        const wrappedFunction = ThundraWrapper(originalFunction);
        wrappedFunction(originalEvent,originalContext,originalCallback);
        it("should invoke the function", () => {
            expect(originalFunction).toBeCalled();
        });
        it("should invoke the callback", () => {
            expect(originalCallback).toBeCalled();
        });
    });



    describe("Thundra disabled", () => {
        describe("By no apiKey", () => {
            delete process.env.thundra_disable;
            delete process.env.thundra_apiKey;
            const originalEvent = {};
            const originalContext = {};
            const originalCallback = jest.fn();
            const originalFunction = jest.fn(() => originalCallback());
            const ThundraWrapper = Thundra();
            const wrappedFunction = ThundraWrapper(originalFunction);
            wrappedFunction(originalEvent,originalContext,originalCallback);
            it("Should not wrap", () => {
                expect(wrappedFunction).toBe(originalFunction);
            });
        });

        describe("By parameter", () => {
            delete process.env.thundra_disable;
            const originalEvent = {};
            const originalContext = {};
            const originalCallback = jest.fn();
            const originalFunction = jest.fn(() => originalCallback());
            const ThundraWrapper = Thundra({apiKey: "apiKey", disableThundra: true, plugins: []});
            const wrappedFunction = ThundraWrapper(originalFunction);
            wrappedFunction(originalEvent,originalContext,originalCallback);
            it("Should not wrap", () => {
                expect(wrappedFunction).toBe(originalFunction);
            });
        });

        describe("By env variable", () => {
            process.env.thundra_disable = "true";
            const originalEvent = {};
            const originalContext = {};
            const originalCallback = jest.fn();
            const originalFunction = jest.fn(() => originalCallback());
            const ThundraWrapper = Thundra({apiKey: "apiKey"});
            const wrappedFunction = ThundraWrapper(originalFunction);
            wrappedFunction(originalEvent,originalContext,originalCallback);
            it("Should not wrap", () => {
                expect(wrappedFunction).toBe(originalFunction);
            });
        });
    });

    describe("Without plugins", () => {
        describe("Using parameters",() => {
            delete process.env.thundra_trace_disable;
            delete process.env.thundra_metric_disable;
            delete process.env.thundra_disable;
            delete process.env.thundra_apiKey;
            const originalEvent = {};
            const originalContext = {};
            const originalCallback = jest.fn();
            const originalFunction = jest.fn(() => originalCallback());
            const ThundraWrapper = Thundra({apiKey: "apiKey", disableTrace: true, disableMetric: true});
            const wrappedFunction = ThundraWrapper(originalFunction);
            wrappedFunction(originalEvent,originalContext,originalCallback);
            it("should invoke the function", () => {
                expect(originalFunction).toBeCalled();
            });
            it("should invoke the callback", () => {
                expect(originalCallback).toBeCalled();
            });
        });

        describe("Using true env variables",() => {
            delete process.env.thundra_disable;
            delete process.env.thundra_apiKey;
            process.env.thundra_applicationProfile = "dev";
            process.env.thundra_trace_disable = "true";
            process.env.thundra_metric_disable = "true";
            const originalEvent = {};
            const originalContext = {};
            const originalCallback = jest.fn();
            const originalFunction = jest.fn(() => originalCallback());
            const ThundraWrapper = Thundra({apiKey: "apiKey"});
            const wrappedFunction = ThundraWrapper(originalFunction);
            wrappedFunction(originalEvent,originalContext,originalCallback);
            it("should invoke the function", () => {
                expect(originalFunction).toBeCalled();
            });
            it("should invoke the callback", () => {
                expect(originalCallback).toBeCalled();
            });
        });

        describe("Using false env variables",() => {
            delete process.env.thundra_disable;
            delete process.env.thundra_apiKey;
            process.env.thundra_trace_disable = "false";
            process.env.thundra_metric_disable = "ignore";
            const originalEvent = {};
            const originalContext = {};
            const originalCallback = jest.fn();
            const originalFunction = jest.fn(() => originalCallback());
            const ThundraWrapper = Thundra({apiKey: "apiKey"});
            const wrappedFunction = ThundraWrapper(originalFunction);
            wrappedFunction(originalEvent,originalContext,originalCallback);
            it("should invoke the function", () => {
                expect(originalFunction).toBeCalled();
            });
            it("should invoke the callback", () => {
                expect(originalCallback).toBeCalled();
            });
        });
    });

});
