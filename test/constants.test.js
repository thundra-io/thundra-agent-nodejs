import {HOOKS, URL, PROC_STAT_PATH, PROC_IO_PATH, DATA_FORMAT_VERSION, getTimeoutMargin} from '../dist/Constants';

test('DATA_FORMAT_VERSION did not change', () => {
    expect(DATA_FORMAT_VERSION).toEqual('1.2');
});

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

test('Timeout margin should be decided based on region', () => {
    expect(getTimeoutMargin('us-west-2')).toEqual(200);
    expect(getTimeoutMargin('us-west-1')).toEqual(400);
    expect(getTimeoutMargin('us-east-2')).toEqual(600);
    expect(getTimeoutMargin('us-east-1')).toEqual(600);

    expect(getTimeoutMargin('ap-south-1')).toEqual(1000);
    expect(getTimeoutMargin('ap-northeast-2')).toEqual(1000);
    expect(getTimeoutMargin('ap-southeast-1')).toEqual(1000);
    expect(getTimeoutMargin('ap-southeast-2')).toEqual(1000);
    expect(getTimeoutMargin('ap-northeast-1')).toEqual(1000);

    expect(getTimeoutMargin('ca-central-1')).toEqual(600);
    expect(getTimeoutMargin('cn-north-1')).toEqual(1000);

    expect(getTimeoutMargin('eu-central-1')).toEqual(1000);
    expect(getTimeoutMargin('eu-west-1')).toEqual(1000);
    expect(getTimeoutMargin('eu-west-2')).toEqual(1000);
    expect(getTimeoutMargin('eu-west-3')).toEqual(1000);

    expect(getTimeoutMargin('sa-east-1')).toEqual(800);

    expect(getTimeoutMargin('tr-east-1')).toEqual(1000); // Unknown

    expect(getTimeoutMargin()).toEqual(1000); // Invalid
});



