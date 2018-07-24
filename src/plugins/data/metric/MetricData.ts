import BasePluginData from '../base/BasePluginData';

class MetricData extends BasePluginData {
    rootExecutionAuditContextId: string;
    transactionId: string;
    functionRegion: string;
    statTimestamp: number;
}

export default MetricData;
