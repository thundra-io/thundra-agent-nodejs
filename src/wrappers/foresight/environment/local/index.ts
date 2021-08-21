/** will be removed */

const pidusage = require('pidusage');

import EnvironmentInfo from '../EnvironmentInfo'

export const ENVIRONMENT = 'Git';

let environmentInfo: EnvironmentInfo;

import Utils from '../../../../utils/Utils';

const getTestRunId = async () => {

    /** todo: check config for configuredTestRunId
     *  if exists on config return it
    */

    const processInfo = await pidusage(process.ppid);
    return Utils.generareIdFrom(
        processInfo.pid + '_' + processInfo.timestamp);
}

export const getEnvironmentInfo = () => {

    return environmentInfo;
}

export const init = async () => {
    if (environmentInfo == null){
        // todo: obtain required fields in here

        const testRunId = await getTestRunId();

        environmentInfo = new EnvironmentInfo(
            testRunId, 
            ENVIRONMENT, 
            'http://thundra/test', 
            'jest-test', 
            'feature/tryer', 
            '123456', 
            'tryer');
    }
}