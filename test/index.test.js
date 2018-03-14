const Thundra = require("../index");

describe("Thundra library without plugins",() => {
    process.env.AWS_LAMBDA_LOG_STREAM_NAME = "2018/03/02/[$LATEST]applicationId";

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

describe("Thundra library with plugins",() => {
    process.env.AWS_LAMBDA_LOG_STREAM_NAME = "2018/03/02/[$LATEST]applicationId";
    const originalEvent = {};
    const originalContext = {};
    const originalCallback = jest.fn();
    const originalFunction = jest.fn(() => originalCallback());
    const ThundraWrapper = Thundra({apiKey: "apiKey", plugins:[]});
    const wrappedFunction = ThundraWrapper(originalFunction);

    wrappedFunction(originalEvent,originalContext,originalCallback);

    it("should invoke the function", () => {
        expect(originalFunction).toBeCalled();
    });

    it("should invoke the callback", () => {
        expect(originalCallback).toBeCalled();
    });

});

describe("Thundra library with env apiKey",() => {
    process.env.AWS_LAMBDA_LOG_STREAM_NAME = "2018/03/02/[$LATEST]applicationId";
    process.env.thundra_apiKey = "apiKey";
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