import {HOOKS, URL, PROC_STAT_PATH, PROC_IO_PATH} from '../src/constants';

test('HOOKS did not change', () => {
    expect(HOOKS).toEqual(['before-invocation', 'after-invocation']);
});

test('URL default value did not change',() => {
    expect(URL.href).toEqual('https://collector.thundra.io/api');
});

test('PROC_STAT_PATH did not change', () => {
    expect(PROC_STAT_PATH).toEqual('/proc/self/stat');

});

test('PROC_IO_PATH did not change', () => {
    expect(PROC_IO_PATH).toEqual('/proc/self/io');
});


