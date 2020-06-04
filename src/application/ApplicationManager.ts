import {ApplicationInfoProvider} from './ApplicationInfoProvider';
import {LambdaApplicationInfoProvider} from './LambdaApplicationInfoProvider';
import {ApplicationInfo} from './ApplicationInfo';

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
}
