import { ApplicationInfoProvider } from './ApplicationInfoProvider';
import { ApplicationInfo } from './ApplicationInfo';
import ConfigProvider from '../config/ConfigProvider';
import ConfigNames from '../config/ConfigNames';
import Utils from '../plugins/utils/Utils';

/**
 * {@link ApplicationInfoProvider} implementation which provides {@link ApplicationInfo}
 * based on underlying platform and configuration.
 */
export default class GlobalApplicationInfoProvider implements ApplicationInfoProvider {

    private applicationInfoProvider: ApplicationInfoProvider;
    private applicationInfo: ApplicationInfo;

    constructor(applicationInfoProvider: ApplicationInfoProvider) {
        this.applicationInfoProvider = applicationInfoProvider;

        const fromConfig: ApplicationInfo = this.appInfoFromConfig();
        const fromGiven: ApplicationInfo = applicationInfoProvider
            ? applicationInfoProvider.getApplicationInfo()
            : {} as ApplicationInfo;
        this.applicationInfo = this.mergeAppInfo(fromConfig, fromGiven);
    }

    getApplicationInfoProvider(): ApplicationInfoProvider {
        return this.applicationInfoProvider;
    }

    getApplicationInfo(): ApplicationInfo {
        return this.applicationInfo;
    }

    appInfoFromConfig(): ApplicationInfo {
        return {
            applicationId: ConfigProvider.get<string>(ConfigNames.THUNDRA_APPLICATION_ID),
            applicationInstanceId: ConfigProvider.get<string>(ConfigNames.THUNDRA_APPLICATION_INSTANCE_ID),
            applicationName: ConfigProvider.get<string>(ConfigNames.THUNDRA_APPLICATION_NAME),
            applicationClassName: ConfigProvider.get<string>(ConfigNames.THUNDRA_APPLICATION_CLASS_NAME),
            applicationDomainName: ConfigProvider.get<string>(ConfigNames.THUNDRA_APPLICATION_DOMAIN_NAME),
            applicationRegion: ConfigProvider.get<string>(ConfigNames.THUNDRA_APPLICATION_REGION),
            applicationVersion: ConfigProvider.get<string>(ConfigNames.THUNDRA_APPLICATION_VERSION),
            applicationStage: ConfigProvider.get<string>(ConfigNames.THUNDRA_APPLICATION_STAGE),
            applicationTags: Utils.getApplicationTags(),
        };
    }

    mergeAppInfo(fromConfig: ApplicationInfo, fromGiven: ApplicationInfo): ApplicationInfo {
        return {
            applicationId: fromConfig.applicationId || fromGiven.applicationId,
            applicationInstanceId: fromConfig.applicationInstanceId || fromGiven.applicationInstanceId,
            applicationName: fromConfig.applicationName || fromGiven.applicationName,
            applicationClassName: fromConfig.applicationClassName || fromGiven.applicationClassName,
            applicationDomainName: fromConfig.applicationDomainName || fromGiven.applicationDomainName,
            applicationRegion: fromConfig.applicationRegion || fromGiven.applicationRegion,
            applicationVersion: fromConfig.applicationVersion || fromGiven.applicationVersion,
            applicationStage: fromConfig.applicationStage || fromGiven.applicationStage,
            applicationTags: fromConfig.applicationTags || fromGiven.applicationTags,
        };
    }

}
