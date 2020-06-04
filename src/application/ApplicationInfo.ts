import ConfigProvider from '../config/ConfigProvider';
import ConfigNames from '../config/ConfigNames';
import ThundraLogger from '../ThundraLogger';

export interface ApplicationInfo {
    applicationId: string;
    applicationInstanceId: string;
    applicationRegion: string;
    applicationVersion: string;
    applicationTags: any;
}
