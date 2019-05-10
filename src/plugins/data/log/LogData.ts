import BaseMonitoringData from '../base/BaseMonitoringData';
import MonitorDataType from '../base/MonitoringDataType';
import Utils from '../../utils/Utils';

class LogData extends BaseMonitoringData {
    traceId: string;
    transactionId: string;
    spanId: string;
    logMessage: string;
    logTimestamp: number;
    logLevel: string;
    logLevelCode: number;
    logContextName: string;
    tags: any;

    constructor() {
        super(MonitorDataType.LOG);
    }

    initWithLogDataValues(data: LogData, spanId: string, logInfo: any) {
        this.initWithBaseMonitoringDataValues(data);
        this.id = Utils.generateId();
        this.traceId = data.traceId;
        this.transactionId = data.transactionId;
        this.spanId = spanId;
        this.logMessage = logInfo.logMessage;
        this.logTimestamp =  logInfo.logTimestamp;
        this.logLevel = logInfo.logLevel;
        this.logLevelCode = logInfo.logLevelCode;
        this.logContextName = logInfo.logContextName;
        this.tags = {};
    }
}

export default LogData;
