import { EnvVariableKeys } from '../../Constants';
import ConfigProvider from '../../config/ConfigProvider';
import ConfigNames from '../../config/ConfigNames';
import Utils from '../../utils/Utils';
import { ApplicationManager } from '../../application/ApplicationManager';

/**
 * Utility class for AWS Lambda platform related stuff
 */
export class LambdaPlatformUtils {

    private constructor() {
    }

    /**
     * Gets the application id
     * @param originalContext the original AWS Lambda invocation context
     * @param opts the options
     * @return {string} the application id
     */
    static getApplicationId(originalContext: any, opts: any = {}) {
        const arn = originalContext.invokedFunctionArn;
        const region = opts.region || Utils.getEnvVar(EnvVariableKeys.AWS_REGION)
            || 'local';
        const accountNo = opts.accountNo
            || LambdaPlatformUtils.getAccountNo(arn, ConfigProvider.get<string>(ConfigNames.THUNDRA_APIKEY));
        const functionName = opts.functionName || LambdaPlatformUtils.getApplicationName();

        return `aws:lambda:${region}:${accountNo}:${functionName}`;
    }

    /**
     * Extracts AWS account no from the given AWS Lambda function ARN
     * @param {string} arn the given AWS Lambda function ARN
     */
    static getAWSAccountNo(arn: string) {
        return LambdaPlatformUtils.getARNPart(arn, 4);
    }

    /**
     * Extracts AWS region from the given AWS Lambda function ARN
     * @param {string} arn the given AWS Lambda function ARN
     */
    static getAWSRegion(arn: string) {
        return LambdaPlatformUtils.getARNPart(arn, 3);
    }

    private static getAccountNo(arn: string, apiKey: string) {
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

    private static getApplicationName() {
        return ApplicationManager.getApplicationInfo().applicationName;
    }

    private static getARNPart(arn: string, index: number) {
        try {
            return arn.split(':')[index];
        } catch (error) {
            return '';
        }
    }

    private static getIfSAMLocalDebugging() {
        return Utils.getEnvVar(EnvVariableKeys.AWS_SAM_LOCAL) === 'true';
    }

    private static getIfSLSLocalDebugging() {
        return Utils.getEnvVar(EnvVariableKeys.SLS_LOCAL) === 'true';
    }

}
