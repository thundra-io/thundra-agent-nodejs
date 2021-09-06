import * as GitEnvironmentInfoProvider from './git';

export const environmentInfoProviders = {
    [GitEnvironmentInfoProvider.ENVIRONMENT]: GitEnvironmentInfoProvider,

    /**
     * todo: add other environment info providers
     */
};

export const init = async () => {

    for (const environmentInfoProvider of Object.values(environmentInfoProviders)) {
        await environmentInfoProvider.init();
    }
};
