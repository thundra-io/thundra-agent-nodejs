import {HOOKS, URL, PROC_STAT_PATH, PROC_IO_PATH, DATA_MODEL_VERSION, getTimeoutMargin, getAPIEndpoint} from '../dist/Constants';

test('DATA_MODEL_VERSION did not change', () => {
    expect(DATA_MODEL_VERSION).toEqual('2.0');
});

test('HOOKS did not change', () => {
    expect(HOOKS).toEqual(['before-invocation', 'after-invocation']);
});

test('URL default value did not change',() => {
    expect(URL.href).toEqual('https://api.thundra.io/v1');
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

test('API endpoint should be decided based on region', () => {
    expect(getAPIEndpoint('us-west-2')).toEqual('api.thundra.io');
    expect(getAPIEndpoint('us-west-1')).toEqual('api.thundra.io');

    expect(getAPIEndpoint('us-east-2')).toEqual('api-us-east-1.thundra.io');
    expect(getAPIEndpoint('us-east-1')).toEqual('api-us-east-1.thundra.io');

    expect(getAPIEndpoint('eu-central-1')).toEqual('api-eu-west-2.thundra.io');
    expect(getAPIEndpoint('eu-west-1')).toEqual('api-eu-west-1.thundra.io');
    expect(getAPIEndpoint('eu-west-2')).toEqual('api-eu-west-2.thundra.io');
    expect(getAPIEndpoint('eu-west-3')).toEqual('api-eu-west-2.thundra.io');
    expect(getAPIEndpoint('eu-north-1')).toEqual('api-eu-west-2.thundra.io');

    expect(getAPIEndpoint('ca-central-1')).toEqual('api-us-east-1.thundra.io');

    expect(getAPIEndpoint('sa-east-1')).toEqual('api-us-east-1.thundra.io');

    expect(getAPIEndpoint('ap-south-1')).toEqual('api-ap-northeast-1.thundra.io');
    expect(getAPIEndpoint('ap-northeast-2')).toEqual('api-ap-northeast-1.thundra.io');
    expect(getAPIEndpoint('ap-southeast-1')).toEqual('api-ap-northeast-1.thundra.io');
    expect(getAPIEndpoint('ap-southeast-2')).toEqual('api-ap-northeast-1.thundra.io');
    expect(getAPIEndpoint('ap-northeast-1')).toEqual('api-ap-northeast-1.thundra.io');

    expect(getAPIEndpoint('tr-east-1')).toEqual('api.thundra.io'); // Unknown

    expect(getAPIEndpoint()).toEqual('api.thundra.io'); // Invalid
});
