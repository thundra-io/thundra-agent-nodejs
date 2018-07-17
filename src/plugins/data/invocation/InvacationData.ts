import BasePluginData from '../base/BasePluginData';

class InvocationData extends BasePluginData {
    id: string;
    duration: number;
    startTimestamp: number;
    endTimestamp: number;
    erroneous: boolean;
    errorType: string;
    errorMessage: string;
    coldStart: boolean;
    timeout: boolean;
    region: string;
    memorySize: number;
}

export default InvocationData;
