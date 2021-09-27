import BaseMonitoringData from '../base/BaseMonitoringData';
import MonitorDataType from '../base/MonitoringDataType';
import Utils from '../../../utils/Utils';

/**
 * Represents log data
 */
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

    /**
     * Initializes with given values
     * @param {LogData} data the base {@link LogData} to be initialize from
     * @param {string} traceId the associated trace id
     * @param {string} transactionId the associated transaction id
     * @param {string} spanId the associated span id
     * @param logInfo log specific information
     */
    initWithLogDataValues(data: LogData, traceId: string, transactionId: string, spanId: string, logInfo: any) {
        this.initWithBaseMonitoringDataValues(data);
        this.id = Utils.generateId();
        this.traceId = traceId;
        this.transactionId = transactionId;
        this.spanId = spanId;
        this.logMessage = `${logInfo.logMessage}\n`;
        this.logTimestamp =  logInfo.logTimestamp;
        this.logLevel = logInfo.logLevel;
        this.logLevelCode = logInfo.logLevelCode;
        this.logContextName = logInfo.logContextName;
        this.tags = {};
    }

}

export default LogData;
