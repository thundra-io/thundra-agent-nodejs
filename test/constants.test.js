import {hooks, host, path, PROC_STAT_PATH, PROC_IO_PATH} from "../src/constants";

test("hooks did not change", () => {
    expect(hooks).toEqual(["before-invocation", "after-invocation"]);
});

test("host did not change", () => {
    expect(host).toEqual("collector.thundra.io");
});

test("path did not change", () => {
    expect(path).toEqual("/api/monitor-datas");

});

test("PROC_STAT_PATH did not change", () => {
    expect(PROC_STAT_PATH).toEqual("/proc/self/stat");

});

test("PROC_IO_PATH did not change", () => {
    expect(PROC_IO_PATH).toEqual("/proc/self/io");

});
