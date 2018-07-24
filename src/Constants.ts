import * as url from 'url';

export const DATA_FORMAT_VERSION: string = '1.2';
export const TIMEOUT_MARGIN: number = 200;

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
