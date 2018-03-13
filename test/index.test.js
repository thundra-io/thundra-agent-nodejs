const Thundra = require("../index")({
    apiKey: "apiKey"
});

describe("Thundra library",() => {
    process.env.AWS_LAMBDA_LOG_STREAM_NAME = "2018/03/02/[$LATEST]applicationId";

    const originalEvent = {};
    const originalContext = {};
    const originalCallback = jest.fn();
    const originalFunction = jest.fn(() => originalCallback());

    const wrappedFunction = Thundra(originalFunction);

    wrappedFunction(originalEvent,originalContext,originalCallback);

    it("should invoke the function", () => {
        expect(originalFunction).toBeCalled();
    });

    it("should invoke the callback", () => {
        expect(originalCallback).toBeCalled();
    });


});
