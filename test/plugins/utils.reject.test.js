import Utils from '../../dist/plugins/utils/Utils';

jest.mock('../../dist/Constants', () => ({
    PROC_STAT_PATH: 'does-not-exist',
    PROC_IO_PATH: 'does-not-exist',
    envVariableKeys: {
        THUNDRA_AGENT_LAMBDA_AGENT_DEBUG_ENABLE: ''
    }    
}));

describe('readProcStatPromise', () => {
    it('Should reject on error', async () => {
        try {
            await Utils.readProcStatPromise();
        } catch (e) {
            expect(e).toBeTruthy();

        }
    });
});

describe('readProcIoPromise', () => {
    it('Should reject on error', async () => {
        try {
            await Utils.readProcIoPromise();
        } catch (e) {
            expect(e).toBeTruthy();
        }
    });
});