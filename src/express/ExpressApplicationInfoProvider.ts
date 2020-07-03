import Utils from '../plugins/utils/Utils';
import { ApplicationInfoProvider } from '../application/ApplicationInfoProvider';
import { ApplicationInfo } from '../application/ApplicationInfo';
import { ExpressPlatformUtils } from './ExpressPlatformUtils';

export class ExpressApplicationInfoProvider implements ApplicationInfoProvider {
    public platformUtils = ExpressPlatformUtils;
    private readonly applicationInfo: ApplicationInfo;

    constructor() {
        this.applicationInfo = {
            applicationId: 'express-test-app',
            applicationInstanceId: Utils.generateId(),
            applicationRegion: 'express-test-region',
            applicationVersion: 'express-test-version',
            applicationTags: {},
        };
    }

    getApplicationInfo(): ApplicationInfo {
        return this.applicationInfo;
    }

}
