import {ApplicationInfoProvider} from './ApplicationInfoProvider';
import {LambdaApplicationInfoProvider} from './lambda/LambdaApplicationInfoProvider';
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

    static getPlatformUtils(): PlatformUtils {
        return ApplicationManager.applicationInfoProvider.platformUtils;
    }
}
