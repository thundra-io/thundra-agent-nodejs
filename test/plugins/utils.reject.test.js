import {
    readProcStatPromise,
    readProcIoPromise,
} from "../../src/plugins/utils";

jest.mock("../../src/constants", () => ({
    PROC_STAT_PATH: "does-not-exist",
    PROC_IO_PATH: "does-not-exist"
}));

describe("readProcStatPromise", () => {
    it("Should reject on error", async () => {
        try{
            await readProcStatPromise();
        } catch(e){
            expect(e).toBeTruthy();

        }
    });
});

describe("readProcIoPromise", () => {
    it("Should reject on error", async () => {
        try{
            await readProcIoPromise();
        } catch(e){
            expect(e).toBeTruthy();
        }
    });
});