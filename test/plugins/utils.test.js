import { DATA_MODEL_VERSION } from '../../dist/Constants';
import Utils from '../../dist/plugins/Utils';

jest.mock('os', () => ({
    cpus: () => {
        return ([
            {
                model: 'Intel(R) Xeon(R) CPU E5-2680 v2 @ 2.80GHz',
                speed: 2800,
                times: { user: 60000, nice: 0, sys: 30000, idle: 9000000, irq: 0 }
            },
            {
                model: 'Intel(R) Xeon(R) CPU E5-2680 v2 @ 2.80GHz',
                speed: 2800,
                times: { user: 50000, nice: 0, sys: 20000, idle: 9000000, irq: 0 }
            }
        ]);
    }
}));

jest.mock('../../dist/Constants', () => ({
    PROC_STAT_PATH: './test/mocks/mock-proc-stat',
    PROC_IO_PATH: './test/mocks/mock-proc-io',
    envVariableKeys: {
        THUNDRA_APPLICATION_TAG_PROP_NAME_PREFIX: 'thundra_agent_lambda_application_tag_'
    }
}));

describe('getCpuUsage', () => {
    const result = Utils.getCpuUsage();
    it('Should calculate system cpu usage', () => {
        expect(result.sysCpuUsed).toEqual(160000);
        expect(result.sysCpuTotal).toEqual(18160000);
    });
});

describe('getCpuLoad', () => {
    const start = {
        procCpuUsed: 30000,
        sysCpuUsed: 160000,
        sysCpuTotal: 12000000
    };
    const end = {
        procCpuUsed: 50000,
        sysCpuUsed: 320000,
        sysCpuTotal: 30000000
    };
    const startNaN = {
        procCpuUsed: NaN,
        sysCpuUsed: NaN,
        sysCpuTotal: NaN
    };
    const result = Utils.getCpuLoad(start, end, 100);
    const resultNaN = Utils.getCpuLoad(startNaN, end, 100);
    it('Should calculate process cpu load', () => {
        expect(result.procCpuLoad).toBeCloseTo(0.00001);
        expect(resultNaN.procCpuLoad).toBe(0);

    });
    it('Should calculate system cpu load', () => {
        expect(result.sysCpuLoad).toBeCloseTo(0.009);
        expect(resultNaN.procCpuLoad).toBe(0);
    });
});


describe('readProcStatPromise', () => {
    it('Should read proc stat file correctly', async () => {
        const procStatData = await Utils.readProcMetricPromise();
        expect(procStatData).toEqual({ threadCount: 20 });
    });
});

describe('readProcIoPromise', () => {
    it('Should read proc io file correctly', async () => {
        const procIoData = await Utils.readProcIoPromise();
        expect(procIoData).toEqual({ readBytes: 5453, writeBytes: 323932160 });
    });
});

describe('generateReport', () => {
    const exampleReport = Utils.generateReport('data', 'apiKey');
    it('Should generate report with correct fields', () => {
        expect(exampleReport).toEqual({
            data: 'data',
            type: undefined,
            apiKey: 'apiKey',
            dataModelVersion: DATA_MODEL_VERSION
        });
    });
});

describe('addApplicationTags', () => {
    const THUNDRA_APPLICATION_TAG_PROP_NAME_PREFIX = 'thundra_agent_lambda_application_tag_';
    process.env[THUNDRA_APPLICATION_TAG_PROP_NAME_PREFIX + 'tag1'] = '5';
    process.env[THUNDRA_APPLICATION_TAG_PROP_NAME_PREFIX + 'tag2'] = 'true';
    process.env[THUNDRA_APPLICATION_TAG_PROP_NAME_PREFIX + 'tag3'] = 'false';
    process.env[THUNDRA_APPLICATION_TAG_PROP_NAME_PREFIX + 'tag4'] = 'test value';

    const applicationTags = {};
    Utils.addApplicationTags(applicationTags);

    it('should parse application tags from environment variables', () => {
        expect(applicationTags['tag1']).toBe(5);
        expect(applicationTags['tag2']).toBe(true);
        expect(applicationTags['tag3']).toBe(false);
        expect(applicationTags['tag4']).toBe('test value');
    });

    process.env[THUNDRA_APPLICATION_TAG_PROP_NAME_PREFIX + 'tag1'] = null;
    process.env[THUNDRA_APPLICATION_TAG_PROP_NAME_PREFIX + 'tag2'] = null;
    process.env[THUNDRA_APPLICATION_TAG_PROP_NAME_PREFIX + 'tag3'] = null;
    process.env[THUNDRA_APPLICATION_TAG_PROP_NAME_PREFIX + 'tag4'] = null;
});

describe('parseError', () => {
    describe('Error typed error data', () => {
        const error = Error('error message');
        const parsedError = Utils.parseError(error);
        it('should set error message correctly', () => {
            expect(parsedError.errorMessage).toEqual('error message');
        });
        it('should set error type correctly', () => {
            expect(parsedError.errorType).toEqual('Error');
        });
    });

    describe('string error data', () => {
        const error = 'string error';
        const parsedError = Utils.parseError(error);
        it('should set error message correctly', () => {
            expect(parsedError.errorMessage).toEqual('string error');
        });
        it('should set error type correctly', () => {
            expect(parsedError.errorType).toEqual('Unknown Error');
        });
    });

    describe('object error data', () => {
        const error = { err: 'err', msg: 'msg' };
        const parsedError = Utils.parseError(error);
        it('should set error message correctly', () => {
            expect(parsedError.errorMessage).toEqual(JSON.stringify(error));
        });
        it('should set error type correctly', () => {
            expect(parsedError.errorType).toEqual('Unknown Error');
        });
    });
});