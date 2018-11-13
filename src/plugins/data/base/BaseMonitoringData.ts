import MonitorDataType from './MonitoringDataType';

class BaseMonitoringData {
    id: string;
    type: MonitorDataType;
    agentVersion: string;
    dataModelVersion: string;
    applicationId: string;
    applicationDomainName: string;
    applicationClassName: string;
    applicationName: string;
    applicationVersion: string;
    applicationStage: string;
    readonly applicationRuntime: string = 'node';
    applicationRuntimeVersion: string;
    applicationTags: any;

    constructor(type: MonitorDataType) {
        this.type = type;
        this.applicationTags = {};
    }

    initWithBaseMonitoringDataValues(data: BaseMonitoringData): void {
        this.agentVersion = data.agentVersion;
        this.dataModelVersion = data.dataModelVersion;
        this.applicationId = data.applicationId;
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
