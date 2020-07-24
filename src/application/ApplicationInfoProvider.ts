import { ApplicationInfo } from './ApplicationInfo';

/**
 * Provides application information by {@link ApplicationInfo}.
 */
export interface ApplicationInfoProvider {
    getApplicationInfo: () => ApplicationInfo;
    update: (opts: any) => void;
}
