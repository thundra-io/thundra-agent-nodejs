import ThundraLogger from '../../../ThundraLogger';
import * as GitEnvironmentInfoProvider from './git';

export const environmentInfoProviders = {
    [GitEnvironmentInfoProvider.ENVIRONMENT]: GitEnvironmentInfoProvider,

    /**
     * todo: add other environment info providers
     */
};

export const init = async () => {

    ThundraLogger.debug('<EnvironmentProvider> Environments initilizing ...');

    for (const environmentInfoProvider of Object.values(environmentInfoProviders)) {
        await environmentInfoProvider.init();
    }
};
