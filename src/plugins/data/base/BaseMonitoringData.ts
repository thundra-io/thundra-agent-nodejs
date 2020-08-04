import MonitorDataType from './MonitoringDataType';

/**
 * Base class for all monitoring data types (invocation, span, metric, log, ...)
 */
abstract class BaseMonitoringData {

    id: string;
    type: MonitorDataType;
    agentVersion: string;
    dataModelVersion: string;
    applicationId: string;
    applicationInstanceId: string;
    applicationDomainName: string;
    applicationClassName: string;
    applicationName: string;
    applicationVersion: string;
    applicationStage: string;
    applicationRuntime: string = 'node';
    applicationRuntimeVersion: string;
    applicationTags: any;

    protected constructor(type: MonitorDataType) {
        this.type = type;
        this.applicationTags = {};
    }

    protected initWithBaseMonitoringDataValues(data: BaseMonitoringData): void {
        this.agentVersion = data.agentVersion;
        this.dataModelVersion = data.dataModelVersion;
        this.applicationId = data.applicationId;
        this.applicationInstanceId = data.applicationInstanceId;
        this.applicationDomainName = data.applicationDomainName;
        this.applicationClassName = data.applicationClassName;
        this.applicationName = data.applicationName;
        this.applicationVersion = data.applicationVersion;
        this.applicationStage = data.applicationStage;
        this.applicationRuntimeVersion = data.applicationRuntimeVersion;
        this.applicationTags = Object.assign({}, data.applicationTags);
    }

}

export default BaseMonitoringData;
