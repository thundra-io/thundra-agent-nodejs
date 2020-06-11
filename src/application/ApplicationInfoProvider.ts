import {ApplicationInfo} from './ApplicationInfo';

export interface ApplicationInfoProvider {
    getApplicationInfo: () => ApplicationInfo;
}
