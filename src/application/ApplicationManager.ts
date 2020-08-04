import { ApplicationInfoProvider } from './ApplicationInfoProvider';
import { ApplicationInfo } from './ApplicationInfo';
import { GlobalApplicationInfoProvider } from './GlobalApplicationInfoProvider';

/**
 * Mediator class for application level stuff.
 */
export class ApplicationManager {

    static applicationInfoProvider: GlobalApplicationInfoProvider;

    static getApplicationInfoProvider(): ApplicationInfoProvider {
        return ApplicationManager.applicationInfoProvider;
    }

    static setApplicationInfoProvider(applicationInfoProvider: ApplicationInfoProvider) {
        ApplicationManager.applicationInfoProvider =
            new GlobalApplicationInfoProvider(applicationInfoProvider);
    }

    static getApplicationInfo(): ApplicationInfo {
        return ApplicationManager.applicationInfoProvider.getApplicationInfo();
    }

}
