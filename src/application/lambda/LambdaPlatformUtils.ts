import {EnvVariableKeys} from '../../Constants';
import ConfigProvider from '../../config/ConfigProvider';
import ConfigNames from '../../config/ConfigNames';
import Utils from '../../plugins/utils/Utils';
import {PlatformUtils} from '../PlatformUtils';
import {LambdaContextProvider} from './LambdaContextProvider';

export class LambdaPlatformUtils extends PlatformUtils {

    static getApplicationId(originalContext: any) {
        const arn = originalContext.invokedFunctionArn;
        const region = Utils.getEnvVar(EnvVariableKeys.AWS_REGION)
            || 'local';
        const accountNo = LambdaPlatformUtils.getAccountNo(arn, ConfigProvider.get<string>(ConfigNames.THUNDRA_APIKEY));
        const functionName = LambdaPlatformUtils.getApplicationName(originalContext);

        return `aws:lambda:${region}:${accountNo}:${functionName}`;
    }

    static getApplicationName(originalContext: any) {
        return ConfigProvider.get<string>(ConfigNames.THUNDRA_APPLICATION_NAME,
            originalContext.functionName
            || Utils.getEnvVar(EnvVariableKeys.AWS_LAMBDA_FUNCTION_NAME)
            || 'lambda-app');
    }

    static getAccountNo(arn: string, apiKey: string) {
        if (LambdaPlatformUtils.getIfSAMLocalDebugging()) {
            return 'sam_local';
        } else if (LambdaPlatformUtils.getIfSLSLocalDebugging()) {
            return 'sls_local';
        } else {
            return (LambdaPlatformUtils.getAWSAccountNo(arn)
                || apiKey
                || 'guest');
        }
    }

    static getAWSAccountNo(arn: string) {
        return LambdaPlatformUtils.getARNPart(arn, 4);
    }

    static getAWSRegion(arn: string) {
        return LambdaPlatformUtils.getARNPart(arn, 3);
    }

    static getARNPart(arn: string, index: number) {
        try {
            return arn.split(':')[index];
        } catch (error) {
            return '';
        }
    }

    static getIfSAMLocalDebugging() {
        return Utils.getEnvVar(EnvVariableKeys.AWS_SAM_LOCAL) === 'true';
    }

    static getIfSLSLocalDebugging() {
        return Utils.getEnvVar(EnvVariableKeys.SLS_LOCAL) === 'true';
    }

    static getTransactionId(): string {
        const context = LambdaContextProvider.getContext();
        return context ? context.awsRequestId : '';
    }
}
