import MonitorDataType from './MonitorDataType';

class BasePluginData {
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
    applicationTags: Map<string, any>;
}

export default BasePluginData;
