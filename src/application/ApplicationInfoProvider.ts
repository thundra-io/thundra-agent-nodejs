import {ApplicationInfo} from './ApplicationInfo';
import {PlatformUtils} from './PlatformUtils';

export interface ApplicationInfoProvider {
    platformUtils: PlatformUtils;
    getApplicationInfo: () => ApplicationInfo;
}
