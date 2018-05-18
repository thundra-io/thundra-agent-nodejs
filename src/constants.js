import url from 'url';

export const DATA_FORMAT_VERSION = '1.2';

export const HOOKS = [
    'before-invocation',
    'after-invocation',
];

export const URL = url.parse(
    // the comment below is for ignoring in unit tests, do not remove it
    // istanbul ignore next
    process.env.thundra_lambda_publish_rest_baseUrl
        ? process.env.thundra_lambda_publish_rest_baseUrl
        : 'https://collector.thundra.io/api'
);

export const PROC_STAT_PATH = '/proc/self/stat';
export const PROC_IO_PATH = '/proc/self/io';