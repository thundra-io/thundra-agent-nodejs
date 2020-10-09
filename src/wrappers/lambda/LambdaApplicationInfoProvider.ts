import Utils from '../../utils/Utils';
import { EnvVariableKeys, LAMBDA_APPLICATION_CLASS_NAME, LAMBDA_APPLICATION_DOMAIN_NAME } from '../../Constants';
import { ApplicationInfoProvider } from '../../application/ApplicationInfoProvider';
import { ApplicationInfo } from '../../application/ApplicationInfo';

/**
 * {@link ApplicationInfoProvider} implementation which provides {@link ApplicationInfo}
 * from underlying AWS-Lambda platform.
 */
export class LambdaApplicationInfoProvider implements ApplicationInfoProvider {

    private applicationInfo: ApplicationInfo;

    constructor() {
        const logStreamName = Utils.getEnvVar(EnvVariableKeys.AWS_LAMBDA_LOG_STREAM_NAME);
        const region = Utils.getEnvVar(EnvVariableKeys.AWS_REGION);
        const functionVersion = Utils.getEnvVar(EnvVariableKeys.AWS_LAMBDA_FUNCTION_VERSION);
        const functionName = Utils.getEnvVar(EnvVariableKeys.AWS_LAMBDA_FUNCTION_NAME);
        this.applicationInfo = {
            applicationId: '',
            applicationInstanceId: logStreamName ? logStreamName.split(']').pop() : Utils.generateId(),
            applicationName: functionName,
            applicationClassName: LAMBDA_APPLICATION_CLASS_NAME,
            applicationDomainName: LAMBDA_APPLICATION_DOMAIN_NAME,
            applicationRegion: region ? region : '',
            applicationStage: '',
            applicationVersion: functionVersion ? functionVersion : '',
            applicationTags: Utils.getApplicationTags(),
            applicationResourceName: '',
        };
    }

    getApplicationInfo(): ApplicationInfo {
        return this.applicationInfo;
    }

    update(opts: any = {}) {
        this.applicationInfo = Utils.mergeApplicationInfo(opts, this.applicationInfo);
    }

}
