import {EnvVariableKeys} from '../Constants';
import ConfigProvider from '../config/ConfigProvider';
import ConfigNames from '../config/ConfigNames';
import Utils from '../plugins/utils/Utils';
import {PlatformUtils} from '../application/PlatformUtils';
import {LambdaContextProvider} from './LambdaContextProvider';

export class LambdaPlatformUtils extends PlatformUtils {

    static getApplicationId(originalContext: any, opts: any = {}) {
        const arn = originalContext.invokedFunctionArn;
        const region = opts.region || Utils.getEnvVar(EnvVariableKeys.AWS_REGION)
            || 'local';
        const accountNo = opts.accountNo
            || LambdaPlatformUtils.getAccountNo(arn, ConfigProvider.get<string>(ConfigNames.THUNDRA_APIKEY));
        const functionName = opts.functionName || LambdaPlatformUtils.getApplicationName(originalContext);

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

    static setInvocationTags(invocationData: any, pluginContext: any) {
        const originalContext = LambdaContextProvider.getContext();

        invocationData.tags['aws.lambda.memory_limit'] = pluginContext.maxMemory;
        invocationData.tags['aws.lambda.invocation.coldstart'] = pluginContext.requestCount === 0;
        invocationData.tags['aws.region'] = pluginContext.applicationRegion;
        invocationData.tags['aws.lambda.invocation.timeout'] = false;

        if (originalContext) {
            invocationData.tags['aws.lambda.arn'] = originalContext.invokedFunctionArn;
            invocationData.tags['aws.account_no'] = LambdaPlatformUtils.getAWSAccountNo(originalContext.invokedFunctionArn);
            invocationData.tags['aws.lambda.log_group_name'] = originalContext ? originalContext.logGroupName : '';
            invocationData.tags['aws.lambda.name'] = originalContext ? originalContext.functionName : '';
            invocationData.tags['aws.lambda.log_stream_name'] = originalContext.logStreamName;
            invocationData.tags['aws.lambda.invocation.request_id'] = originalContext.awsRequestId;
        }

        const { heapUsed } = process.memoryUsage();
        invocationData.tags['aws.lambda.invocation.memory_usage'] = Math.floor(heapUsed / (1024 * 1024));
    }
}
