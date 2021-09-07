import ThundraLogger from '../../../ThundraLogger';
import * as GitEnvironmentInfoProvider from './git';
import * as GithubEnvironmentInfoProvider from './github';
import * as BitbucketEnvironmentInfoProvider from './bitbucket';
import * as JenkinsEnvironmentInfoProvider from './jenkins';
import * as GitlabEnvironmentInfoProvider from './gitlab';
import * as CircleCIEnvironmentInfoProvider from './circleci';
import * as TravisCIEnvironmentInfoProvider from './travisci';

export const environmentInfoProviders = {
    [GitEnvironmentInfoProvider.ENVIRONMENT]: GitEnvironmentInfoProvider,
    [GithubEnvironmentInfoProvider.ENVIRONMENT]: GithubEnvironmentInfoProvider,
    [BitbucketEnvironmentInfoProvider.ENVIRONMENT]: BitbucketEnvironmentInfoProvider,
    [JenkinsEnvironmentInfoProvider.ENVIRONMENT]: JenkinsEnvironmentInfoProvider,
    [GitlabEnvironmentInfoProvider.ENVIRONMENT]: GitlabEnvironmentInfoProvider,
    [CircleCIEnvironmentInfoProvider.ENVIRONMENT]: CircleCIEnvironmentInfoProvider,
    [TravisCIEnvironmentInfoProvider.ENVIRONMENT]: TravisCIEnvironmentInfoProvider,
};

export const init = async () => {

    ThundraLogger.debug('<EnvironmentProvider> Environments initilizing ...');

    for (const environmentInfoProvider of Object.values(environmentInfoProviders)) {
        await environmentInfoProvider.init();
    }
};
