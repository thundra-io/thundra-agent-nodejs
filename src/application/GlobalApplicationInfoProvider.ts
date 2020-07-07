import { ApplicationInfoProvider } from './ApplicationInfoProvider';
import { PlatformUtils } from './PlatformUtils';
import { ApplicationInfo } from './ApplicationInfo';
import ConfigProvider from '../config/ConfigProvider';
import ConfigNames from '../config/ConfigNames';
import Utils from '../plugins/utils/Utils';
import { ExpressApplicationInfoProvider } from '../express/ExpressApplicationInfoProvider';

export default class GlobalApplcationInfoProvider implements ApplicationInfoProvider {
    public platformUtils = PlatformUtils;
    private applicationInfo: ApplicationInfo;

    constructor() {
        const fromConfig = this.appInfoFromConfig();
        const fromPlatform = this.appInfoFromPlatform();

        this.applicationInfo = this.mergeAppInfo(fromConfig, fromPlatform);
    }

    getApplicationInfo(): ApplicationInfo {
        return this.applicationInfo;
    }

    appInfoFromConfig(): ApplicationInfo {
        return {
            applicationId: ConfigProvider.get<string>(ConfigNames.THUNDRA_APPLICATION_ID),
            applicationInstanceId: ConfigProvider.get<string>(ConfigNames.THUNDRA_APPLICATION_INSTANCE_ID),
            applicationRegion: ConfigProvider.get<string>(ConfigNames.THUNDRA_APPLICATION_REGION),
            applicationVersion: ConfigProvider.get<string>(ConfigNames.THUNDRA_APPLICATION_VERSION),
            applicationTags: Utils.getApplicationTags(),
        };
    }

    appInfoFromPlatform(): ApplicationInfo {
        // Get application info specific to current platform
        const applicationInfoProvider = new ExpressApplicationInfoProvider();
        return applicationInfoProvider.getApplicationInfo();
    }

    mergeAppInfo(fromConfig: ApplicationInfo, fromPlatform: ApplicationInfo): ApplicationInfo {
        return {
            applicationId: fromConfig.applicationId || fromPlatform.applicationId,
            applicationInstanceId: fromConfig.applicationInstanceId || fromPlatform.applicationInstanceId,
            applicationRegion: fromConfig.applicationRegion || fromPlatform.applicationRegion,
            applicationVersion: fromConfig.applicationVersion || fromPlatform.applicationVersion,
            applicationTags: fromConfig.applicationTags || fromPlatform.applicationTags,
        };
    }

    update(): void {
        
    }

}
