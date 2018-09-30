import Utils from '../../dist/plugins/Utils';

jest.mock('../../dist/Constants', () => ({
    PROC_STAT_PATH: 'does-not-exist',
    PROC_IO_PATH: 'does-not-exist'
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