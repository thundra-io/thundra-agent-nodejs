import {ApplicationInfoProvider} from './ApplicationInfoProvider';
import {ApplicationInfo} from './ApplicationInfo';
import {PlatformUtils} from './PlatformUtils';

export class ApplicationManager {

    static applicationInfoProvider: ApplicationInfoProvider;

    static setApplicationInfoProvider(applicationInfoProvider: ApplicationInfoProvider) {
        ApplicationManager.applicationInfoProvider = applicationInfoProvider;
    }

    static getApplicationInfoProvider(): ApplicationInfoProvider {
        return ApplicationManager.applicationInfoProvider;
    }

    static getApplicationInfo(): ApplicationInfo {
        return ApplicationManager.applicationInfoProvider.getApplicationInfo();
    }

    static getPlatformUtils(): typeof PlatformUtils {
        return ApplicationManager.applicationInfoProvider.platformUtils;
    }
}
