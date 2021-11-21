import TestUtils from './utils';
import {
    PROC_STAT_PATH,
    PROC_IO_PATH,
    DATA_MODEL_VERSION,
    getTimeoutMargin,
    getDefaultCollectorEndpoint} from '../dist/Constants';

beforeEach(() => {
    TestUtils.clearEnvironmentVariables();
});

afterEach(() => {
    TestUtils.clearEnvironmentVariables();
});

test('DATA_MODEL_VERSION did not change', () => {
    expect(DATA_MODEL_VERSION).toEqual('2.0');
});

test('PROC_STAT_PATH did not change', () => {
    expect(PROC_STAT_PATH).toEqual('/proc/self/stat');

});

test('PROC_IO_PATH did not change', () => {
    expect(PROC_IO_PATH).toEqual('/proc/self/io');
});

test('Timeout margin should be decided based on region', () => {
    expect(getTimeoutMargin('us-west-2')).toEqual(1000);
    expect(getTimeoutMargin('us-west-1')).toEqual(1000);
    expect(getTimeoutMargin('us-east-2')).toEqual(1000);
    expect(getTimeoutMargin('us-east-1')).toEqual(1000);

    expect(getTimeoutMargin('ap-south-1')).toEqual(1000);
    expect(getTimeoutMargin('ap-northeast-2')).toEqual(1000);
    expect(getTimeoutMargin('ap-southeast-1')).toEqual(1000);
    expect(getTimeoutMargin('ap-southeast-2')).toEqual(1000);
    expect(getTimeoutMargin('ap-northeast-1')).toEqual(1000);

    expect(getTimeoutMargin('ca-central-1')).toEqual(1000);
    expect(getTimeoutMargin('cn-north-1')).toEqual(1000);

    expect(getTimeoutMargin('eu-central-1')).toEqual(1000);
    expect(getTimeoutMargin('eu-west-1')).toEqual(1000);
    expect(getTimeoutMargin('eu-west-2')).toEqual(1000);
    expect(getTimeoutMargin('eu-west-3')).toEqual(1000);

    expect(getTimeoutMargin('sa-east-1')).toEqual(1000);

    expect(getTimeoutMargin('tr-east-1')).toEqual(1000); // Unknown

    expect(getTimeoutMargin()).toEqual(1000); // Invalid
});

test('Collector endpoint should be decided based on region', () => {
    const existingRegion = process.env.AWS_REGION;
    try {
        const regions = [
            'us-west-2', 'us-west-1', 'us-east-2', 'us-east-1', 'ca-central-1', 'sa-east-1',
            'eu-central-1', 'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-north-1', 'eu-south-1',
            'ap-south-1', 'ap-northeast-1', 'ap-northeast-2', 'ap-southeast-1', 'ap-southeast-2', 'ap-east-1',
            'af-south-1', 'me-south-1'];
        for (let region in regions) {
            process.env.AWS_REGION = region;
            expect(getDefaultCollectorEndpoint()).toEqual(`${region}.collector.thundra.io`);
        }

        delete process.env.AWS_REGION;
        expect(getDefaultCollectorEndpoint()).toEqual('collector.thundra.io'); // No region
    } finally {
        process.env.AWS_REGION = existingRegion;
    }
});
