import Utils from '../../dist/utils/Utils';

jest.mock('../../dist/Constants', () => ({
    PROC_STAT_PATH: 'does-not-exist',
    PROC_IO_PATH: 'does-not-exist'
}));

describe('read proc stat', () => {
    it('should reject on error', async () => {
        try {
            await Utils.readProcStatPromise();
        } catch (e) {
            expect(e).toBeTruthy();

        }
    });
});

describe('read proc io', () => {
    it('should reject on error', async () => {
        try {
            await Utils.readProcIoPromise();
        } catch (e) {
            expect(e).toBeTruthy();
        }
    });
});