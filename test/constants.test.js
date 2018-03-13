import {hooks} from "../src/constants"

test("hooks didn't change", () => {
    expect(hooks).toEqual(["before-invocation", "after-invocation"]);
});