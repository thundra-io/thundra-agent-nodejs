import * as GitEnvironmentInfoProvider from './git';
import * as LocalEnvironmentInfoProvider from './local';
import * as GithubEnvironmentInfoProvider from './github';

export const environmentInfoProviders = {
    [GitEnvironmentInfoProvider.ENVIRONMENT]: GitEnvironmentInfoProvider,
    [GithubEnvironmentInfoProvider.ENVIRONMENT]: GithubEnvironmentInfoProvider,

    /**
     * todo: add other environment info providers
     */
};

export const init = async () => {

    for (const environmentInfoProvider of Object.values(environmentInfoProviders)) {
        await environmentInfoProvider.init();
    }
};
