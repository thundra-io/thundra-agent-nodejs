import {
    AWS_SERVICE_REQUEST,
    EnvVariableKeys,
} from '../Constants';
import Utils from './Utils';;

const get = require('lodash.get');

/**
 * Utility class for AWS Lambda related stuff
 */
export class LambdaUtils {

    private constructor() {
    }

    static getNormalizedFunctionName(request: any, lambdaArn?: string) {
        const fullName: string = lambdaArn ? lambdaArn : get(request, 'params.FunctionName', AWS_SERVICE_REQUEST);
        const parts = fullName.split(':');

        if (parts.length === 0 || parts.length === 1) { // funcName
            return { name: fullName };
        } else if (parts.length === 2) { // funcName:qualifier
            return { name: parts[0], qualifier: parts[1] };
        } else if (parts.length === 3) { // accountId:function:funcName
            return { name: parts[2] };
        } else if (parts.length === 4) { // accountId:function:funcName:qualifier
            return { name: parts[2], qualifier: parts[3] };
        } else if (parts.length === 7) { // arn:aws:lambda:region:accountId:function:funcName
            return { name: parts[6] };
        } else if (parts.length === 8) { // arn:aws:lambda:region:accountId:function:funcName:qualifier
            return { name: parts[6], qualifier: parts[7] };
        }
    }

    static isLambdaRuntime(runtimeIdentifier?: string) {
        const runtimeIdentifierPrefix = 'AWS_Lambda_';
        runtimeIdentifier = runtimeIdentifier ? runtimeIdentifier : Utils.getEnvVar(EnvVariableKeys.AWS_EXECUTION_ENV);
        if (runtimeIdentifier) {
            return runtimeIdentifier.startsWith(runtimeIdentifierPrefix);
        }
        return false;
    }
}

export default LambdaUtils;
