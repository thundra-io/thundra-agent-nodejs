import url from 'url';

export const HOOKS = [
    'before-invocation',
    'after-invocation',
];

export const URL = new url.URL(
    // istanbul ignore next
    process.env.thundra_lambda_publish_rest_baseUrl
        ? process.env.thundra_lambda_publish_rest_baseUrl
        : 'https://collector.thundra.io/api'
);

export const PROC_STAT_PATH = '/proc/self/stat';
export const PROC_IO_PATH = '/proc/self/io';