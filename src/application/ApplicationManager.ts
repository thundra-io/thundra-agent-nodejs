import { ApplicationInfoProvider } from './ApplicationInfoProvider';
import { ApplicationInfo } from './ApplicationInfo';
import { GlobalApplicationInfoProvider } from './GlobalApplicationInfoProvider';
import ExecutionContextManager from '../context/ExecutionContextManager';

/**
 * Mediator class for application level stuff.
 */
export class ApplicationManager {

    static applicationInfoProvider: GlobalApplicationInfoProvider;

    static getApplicationInfoProvider(): ApplicationInfoProvider {
        return ApplicationManager.applicationInfoProvider;
    }

    static setApplicationInfoProvider(applicationInfoProvider?: ApplicationInfoProvider) {
        const globalAppInfoProvider = new GlobalApplicationInfoProvider(applicationInfoProvider);
        ApplicationManager.applicationInfoProvider = globalAppInfoProvider;

        return globalAppInfoProvider;
    }

    static getApplicationInfo(): ApplicationInfo {
        const activeContext = ExecutionContextManager.get();
        if (activeContext && activeContext.getApplicationInfo) {
            const activeContextApplicationInfo = activeContext.getApplicationInfo();
            if (activeContextApplicationInfo) {
                return activeContextApplicationInfo;
            }
        }

        if (ApplicationManager.applicationInfoProvider) {
            return ApplicationManager.applicationInfoProvider.getApplicationInfo();
        } else {
            return null;
        }
    }

}
