import { ApplicationInfoProvider } from './ApplicationInfoProvider';
import { ApplicationInfo } from './ApplicationInfo';
import ConfigProvider from '../config/ConfigProvider';
import ConfigNames from '../config/ConfigNames';
import Utils from '../utils/Utils';

/**
 * {@link ApplicationInfoProvider} implementation which provides {@link ApplicationInfo}
 * based on underlying platform and configuration.
 */
export class GlobalApplicationInfoProvider implements ApplicationInfoProvider {

    private applicationInfoProvider: ApplicationInfoProvider;
    private applicationInfo: ApplicationInfo;

    constructor(applicationInfoProvider?: ApplicationInfoProvider) {
        this.applicationInfoProvider = applicationInfoProvider;
        this.applicationInfo = applicationInfoProvider ? applicationInfoProvider.getApplicationInfo() : {} as ApplicationInfo;

        const fromConfig: ApplicationInfo = this.appInfoFromConfig();
        this.update(fromConfig);
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
            applicationResourceName: ConfigProvider.get<string>(ConfigNames.THUNDRA_APPLICATION_RESOURCE_NAME),
            applicationTags: Utils.getApplicationTags(),
        };
    }

    update(opts: any = {}) {
        this.applicationInfo = Utils.mergeApplicationInfo(opts, this.applicationInfo);
    }

}
