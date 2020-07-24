import Utils from '../plugins/utils/Utils';
import { EnvVariableKeys, LAMBDA_APPLICATION_CLASS_NAME, LAMBDA_APPLICATION_DOMAIN_NAME } from '../Constants';
import { ApplicationInfoProvider } from '../application/ApplicationInfoProvider';
import { ApplicationInfo } from '../application/ApplicationInfo';
import { LambdaContextProvider } from './LambdaContextProvider';
import { LambdaPlatformUtils } from './LambdaPlatformUtils';

/**
 * {@link ApplicationInfoProvider} implementation which provides {@link ApplicationInfo}
 * from underlying AWS-Lambda platform.
 */
export class LambdaApplicationInfoProvider implements ApplicationInfoProvider {

    private readonly applicationInfo: ApplicationInfo;

    constructor() {
        const logStreamName = Utils.getEnvVar(EnvVariableKeys.AWS_LAMBDA_LOG_STREAM_NAME);
        const region = Utils.getEnvVar(EnvVariableKeys.AWS_REGION);
        const functionVersion = Utils.getEnvVar(EnvVariableKeys.AWS_LAMBDA_FUNCTION_VERSION);
        const functionName = Utils.getEnvVar(EnvVariableKeys.AWS_LAMBDA_FUNCTION_NAME);
        this.applicationInfo = {
            applicationId: undefined,
            applicationInstanceId: logStreamName ? logStreamName.split(']').pop() : Utils.generateId(),
            applicationName: functionName,
            applicationClassName: LAMBDA_APPLICATION_CLASS_NAME,
            applicationDomainName: LAMBDA_APPLICATION_DOMAIN_NAME,
            applicationRegion: region ? region : '',
            applicationStage: undefined,
            applicationVersion: functionVersion ? functionVersion : '',
            applicationTags: Utils.getApplicationTags(),
        };
    }

    getApplicationInfo(): ApplicationInfo {
        const lambdaContext = LambdaContextProvider.getContext();
        if (!this.applicationInfo.applicationId && lambdaContext) {
            this.applicationInfo.applicationId = LambdaPlatformUtils.getApplicationId(lambdaContext);
        }

        return this.applicationInfo;
    }

}
