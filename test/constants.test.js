import TestUtils from './utils';
import {
    HOOKS,
    PROC_STAT_PATH,
    PROC_IO_PATH,
    DATA_MODEL_VERSION,
    getTimeoutMargin,
    getDefaultAPIEndpoint} from '../dist/Constants';

beforeEach(() => {
    TestUtils.clearEnvironmentVariables();
});

afterEach(() => {
    TestUtils.clearEnvironmentVariables();
});

test('DATA_MODEL_VERSION did not change', () => {
    expect(DATA_MODEL_VERSION).toEqual('2.0');
});

test('HOOKS did not change', () => {
    expect(HOOKS).toEqual(['before-invocation', 'after-invocation']);
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
    const region = process.env.AWS_REGION;

    process.env.AWS_REGION = 'us-west-2';
    expect(getDefaultAPIEndpoint()).toEqual('api.thundra.io');
    process.env.AWS_REGION = 'us-west-1';
    expect(getDefaultAPIEndpoint()).toEqual('api.thundra.io');

    process.env.AWS_REGION = 'us-east-2';
    expect(getDefaultAPIEndpoint()).toEqual('api-us-east-1.thundra.io');
    process.env.AWS_REGION = 'us-east-1';
    expect(getDefaultAPIEndpoint()).toEqual('api-us-east-1.thundra.io');

    process.env.AWS_REGION = 'eu-central-1';
    expect(getDefaultAPIEndpoint()).toEqual('api-eu-west-2.thundra.io');
    process.env.AWS_REGION = 'eu-west-1';
    expect(getDefaultAPIEndpoint()).toEqual('api-eu-west-1.thundra.io');
    process.env.AWS_REGION = 'eu-west-2';
    expect(getDefaultAPIEndpoint()).toEqual('api-eu-west-2.thundra.io');
    process.env.AWS_REGION = 'eu-west-3';
    expect(getDefaultAPIEndpoint()).toEqual('api-eu-west-2.thundra.io');
    process.env.AWS_REGION = 'eu-north-1';
    expect(getDefaultAPIEndpoint()).toEqual('api-eu-west-2.thundra.io');

    process.env.AWS_REGION = 'ca-central-1';
    expect(getDefaultAPIEndpoint()).toEqual('api-us-east-1.thundra.io');

    process.env.AWS_REGION = 'sa-east-1';
    expect(getDefaultAPIEndpoint()).toEqual('api-us-east-1.thundra.io');

    process.env.AWS_REGION = 'ap-south-1';
    expect(getDefaultAPIEndpoint()).toEqual('api-ap-northeast-1.thundra.io');
    process.env.AWS_REGION = 'ap-northeast-2';
    expect(getDefaultAPIEndpoint()).toEqual('api-ap-northeast-1.thundra.io');
    process.env.AWS_REGION = 'ap-southeast-1';
    expect(getDefaultAPIEndpoint()).toEqual('api-ap-northeast-1.thundra.io');
    process.env.AWS_REGION = 'ap-southeast-2';
    expect(getDefaultAPIEndpoint()).toEqual('api-ap-northeast-1.thundra.io');
    process.env.AWS_REGION = 'ap-northeast-1';
    expect(getDefaultAPIEndpoint()).toEqual('api-ap-northeast-1.thundra.io');

    process.env.AWS_REGION = 'tr-east-1';
    expect(getDefaultAPIEndpoint()).toEqual('api.thundra.io'); // Unknown

    delete process.env.AWS_REGION;
    expect(getDefaultAPIEndpoint()).toEqual('api.thundra.io'); // Invalid

    process.env.AWS_REGION = region;
});
