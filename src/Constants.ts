import * as url from 'url';

export function getTimeoutMargin(region: string) {
    if (region) {
        if (region === 'us-west-2') { // our region
            return 200;
        } else if (region.startsWith('us-west-')) { // Any region at west of USA
            return 400;
        } else if (region.startsWith('us-')) { // Any region at USA
            return 600;
        } else if (region.startsWith('ca-')) { // Any region at Canada
            return 600;
        } else if (region.startsWith('sa-')) { // Any region at South America
            return 800;
        } else if (region.startsWith('cn-')) { // Any region at China
            return 1000;
        } else if (region.startsWith('eu-')) { // Any region at Europe
            return 1000;
        } else if (region.startsWith('ap-')) { // Any region at Asia Pacific
            return 1000;
        }
    }
    return 1000;
}

export const DATA_FORMAT_VERSION: string = '1.2';
export const TIMEOUT_MARGIN: number = getTimeoutMargin(process.env.AWS_REGION);

export const HOOKS = [
    'before-invocation',
    'after-invocation',
];

export const URL: url.UrlWithStringQuery = url.parse(
    // the comment below is for ignoring in unit tests, do not remove it
    // istanbul ignore next
    process.env.thundra_lambda_publish_rest_baseUrl
        ? process.env.thundra_lambda_publish_rest_baseUrl
        : 'https://collector.thundra.io/api',
);

export const PROC_STAT_PATH: string = '/proc/self/stat';
export const PROC_IO_PATH: string = '/proc/self/io';
export const LOG_TAG_NAME: string =  'LOGS';
export const ARGS_TAG_NAME: string = 'ARGS';
export const RETURN_VALUE_TAG_NAME: string = 'RETURN_VALUE';

export const TRACE_DEF_ENV_KEY: string = 'thundra_trace_def';
export const TRACE_DEF_FILE_PREFIX_ENV_KEY: string = 'thundra_trace_traceablePrefixes';
export const TRACE_DEF_SEPERATOR: string = '.';

export const Syntax = {
    FunctionDeclaration: 'FunctionDeclaration',
    FunctionExpression: 'FunctionExpression',
    ArrowFunctionExpression: 'ArrowFunctionExpression',
    AssignmentExpression: 'AssignmentExpression',
    VariableDeclarator: 'VariableDeclarator',
    CallExpression: 'CallExpression',
    CatchClause: 'CatchClause',
    ReturnStatement: 'ReturnStatement',
    BlockStatement: 'BlockStatement',
};
