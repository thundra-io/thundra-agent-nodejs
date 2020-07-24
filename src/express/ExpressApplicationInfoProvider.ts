import Utils from '../plugins/utils/Utils';
import { ApplicationInfoProvider } from '../application/ApplicationInfoProvider';
import { ApplicationInfo } from '../application/ApplicationInfo';

export class ExpressApplicationInfoProvider implements ApplicationInfoProvider {

    private readonly applicationInfo: ApplicationInfo;

    constructor() {
        this.applicationInfo = {
            applicationId: 'express-test-app',
            applicationInstanceId: Utils.generateId(),
            applicationName: 'express-test-app',
            applicationClassName: 'Express',
            applicationDomainName: 'API',
            applicationStage: undefined,
            applicationRegion: 'express-test-region',
            applicationVersion: 'v1.0',
            applicationTags: {},
        };
    }

    getApplicationInfo(): ApplicationInfo {
        return this.applicationInfo;
    }

}
